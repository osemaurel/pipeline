import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export type ProfileUpdate = Partial<
  Omit<Profile, 'user_id' | 'created_at' | 'updated_at' | 'has_paid' | 'paid_at'>
>

export async function updateProfileFields(userId: string, patch: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single()
  return { data: (data as Profile | null) ?? null, error: error?.message ?? null }
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message ?? null }
}

export async function updateDisabledModules(disabled: string[]) {
  const { data, error } = await supabase.auth.updateUser({
    data: { disabled_modules: disabled },
  })
  return { user: data.user, error: error?.message ?? null }
}

export function readDisabledModules(
  metadata: Record<string, unknown> | undefined,
): string[] {
  const raw = metadata?.disabled_modules
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  return []
}
