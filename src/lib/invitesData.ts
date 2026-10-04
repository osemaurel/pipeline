import { supabase } from './supabase'

export type InviteStatus = 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked'

export interface Invite {
  id: string
  email: string
  first_name: string | null
  credits_granted: number
  status: InviteStatus
  user_id: string | null
  created_by: string | null
  sent_at: string | null
  accepted_at: string | null
  last_resent_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Infos accès (venant de auth.users + profiles via RPC admin_invites_with_access).
  // Null quand l'utilisateur Auth n'existe pas encore (invitation purement pending),
  // ou quand on retombe sur le select direct (fallback RPC indisponible).
  last_sign_in_at?: string | null
  email_confirmed_at?: string | null
  needs_password_setup?: boolean | null
  onboarding_completed?: boolean | null
}

export async function fetchInvites(): Promise<Invite[]> {
  // On essaie d'abord la RPC qui enrichit avec last_sign_in_at et le statut
  // du profil. Si elle n'existe pas encore (migration pas passée), on retombe
  // sur un select direct de admin_invites.
  const rpc = await supabase.rpc('admin_invites_with_access')
  if (!rpc.error && rpc.data) {
    return (rpc.data as Invite[]) ?? []
  }
  const { data } = await supabase
    .from('admin_invites')
    .select('*')
    .order('created_at', { ascending: false })
  return (data as Invite[] | null) ?? []
}

export async function sendInvite(input: {
  email: string
  first_name?: string
  credits_granted: number
  notes?: string
  resend?: boolean
}): Promise<{ data: { invite: Invite; resend_id: string | null } | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ invite: Invite; resend_id: string | null }>(
    'send-invite',
    { body: input },
  )
  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.clone().json()) as { error?: string }
        if (body?.error) message = body.error
      } catch {
        /* message générique */
      }
    }
    return { data: null, error: message }
  }
  return { data: data ?? null, error: null }
}

export async function revokeInvite(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('admin_invites')
    .update({ status: 'revoked' })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteInvite(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('admin_invites').delete().eq('id', id)
  return { error: error?.message ?? null }
}
