import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export const SUPPORT_EMAIL = 'support@pipeline.app'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  suspended: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const translateAuthError = (message: string): string => {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect.',
    'Email not confirmed': 'Votre email n’a pas encore été confirmé.',
    'User already registered': 'Un compte existe déjà avec cet email.',
    'Password should be at least 6 characters':
      'Le mot de passe doit contenir au moins 6 caractères.',
  }
  return map[message] ?? message
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  suspended: false,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null })

    if (data.session?.user) {
      await get().refreshProfile()
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null })
      if (session?.user) {
        await get().refreshProfile()
      } else {
        set({ profile: null })
      }
    })

    set({ initialized: true })
  },

  refreshProfile: async () => {
    const userId = get().user?.id
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    const profile = (data as Profile | null) ?? null
    // Compte suspendu : déconnexion immédiate + message
    if (profile?.is_suspended) {
      await supabase.auth.signOut()
      set({ session: null, user: null, profile: null, suspended: true })
      return
    }
    set({ profile })
  },

  signIn: async (email, password) => {
    set({ loading: true, suspended: false })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) return { error: translateAuthError(error.message) }
    await get().refreshProfile()
    if (get().suspended) return { error: 'suspended' }
    return { error: null }
  },

  signUp: async (email, password, firstName, lastName) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    if (error) {
      set({ loading: false })
      return { error: translateAuthError(error.message) }
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
      })
      if (profileError && profileError.code !== '23505') {
        set({ loading: false })
        return { error: profileError.message }
      }
      // Crédits de recherche offerts (20). Idempotent côté SQL.
      await supabase.rpc('init_search_credits', { p_user_id: data.user.id })
      await get().refreshProfile()
    }

    set({ loading: false })
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },
}))
