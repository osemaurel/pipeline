import { supabase } from '@/lib/supabase'

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export interface DashboardStats {
  total_users: number
  paid_users: number
  suspended_users: number
  new_users_7d: number
  new_users_30d: number
  total_prospects: number
  total_generated_services: number
  total_upwork_proposals: number
  total_lead_searches: number
  total_credits_consumed: number
  total_revenue: number
}

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const { data } = await supabase.from('admin_dashboard_stats').select('*').single()
  return (data as DashboardStats | null) ?? null
}

// Inscriptions par jour sur les 30 derniers jours (pour la courbe)
export async function fetchSignupsTrend(): Promise<{ date: string; count: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', since.toISOString())
  const rows = (data as { created_at: string }[]) ?? []
  const buckets: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    buckets[d.toISOString().slice(0, 10)] = 0
  }
  for (const r of rows) {
    const k = r.created_at.slice(0, 10)
    if (k in buckets) buckets[k]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, count }))
}

// ---------------------------------------------------------------------------
// User list (view admin_user_list)
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  user_id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  company_name: string | null
  created_at: string
  has_paid: boolean
  is_suspended: boolean
  credits_remaining: number
  prospects_count: number
  services_count: number
}

export type UserStatusFilter = 'all' | 'paid' | 'unpaid' | 'suspended'
export type UserSort = 'created_desc' | 'created_asc' | 'credits_desc' | 'activity_desc'

export interface UsersQuery {
  search?: string
  status?: UserStatusFilter
  sort?: UserSort
  page?: number
  pageSize?: number
}

export async function fetchUsers(q: UsersQuery): Promise<{ rows: AdminUserRow[]; total: number }> {
  const page = q.page ?? 0
  const size = q.pageSize ?? 20
  let query = supabase.from('admin_user_list').select('*', { count: 'exact' })

  if (q.search?.trim()) {
    const s = q.search.trim().replace(/[%,]/g, '')
    query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`)
  }
  if (q.status === 'paid') query = query.eq('has_paid', true).eq('is_suspended', false)
  else if (q.status === 'unpaid') query = query.eq('has_paid', false).eq('is_suspended', false)
  else if (q.status === 'suspended') query = query.eq('is_suspended', true)

  switch (q.sort) {
    case 'created_asc': query = query.order('created_at', { ascending: true }); break
    case 'credits_desc': query = query.order('credits_remaining', { ascending: false }); break
    case 'activity_desc': query = query.order('services_count', { ascending: false }); break
    default: query = query.order('created_at', { ascending: false })
  }

  query = query.range(page * size, page * size + size - 1)
  const { data, count } = await query
  return { rows: (data as AdminUserRow[]) ?? [], total: count ?? 0 }
}

// Pour l'export CSV : récupère tout le résultat filtré (sans pagination)
export async function fetchAllUsersForExport(q: UsersQuery): Promise<AdminUserRow[]> {
  const all = await fetchUsers({ ...q, page: 0, pageSize: 5000 })
  return all.rows
}

// ---------------------------------------------------------------------------
// User detail
// ---------------------------------------------------------------------------

export interface AdminProfile {
  user_id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  company_name: string | null
  job_title: string | null
  business_type: string | null
  main_offer: string | null
  pitch_problem: string | null
  pitch_solution: string | null
  pitch_proposition: string | null
  icp_sectors: string[]
  icp_main_problem: string | null
  active_channels: string[]
  created_at: string
  updated_at: string
  has_paid: boolean
  paid_at: string | null
  amount_paid: number | null
  currency: string | null
  is_suspended: boolean
  suspended_at: string | null
  suspended_by: string | null
  suspension_reason: string | null
}

export async function fetchAdminProfile(userId: string): Promise<AdminProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  return (data as AdminProfile | null) ?? null
}

export async function fetchUserCredits(userId: string): Promise<number> {
  const { data } = await supabase.from('search_credits').select('credits_remaining').eq('user_id', userId).maybeSingle()
  return data ? (data.credits_remaining as number) : 20
}

export interface ActivityEvent {
  type: 'prospect' | 'service' | 'search' | 'proposal' | 'signup'
  label: string
  at: string
}

export async function fetchUserActivity(userId: string): Promise<ActivityEvent[]> {
  const [pr, gs, ls, up, prof] = await Promise.all([
    supabase.from('prospects').select('company_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('generated_services').select('title, platform, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('lead_searches').select('city, category, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('upwork_proposals').select('job_title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('created_at').eq('user_id', userId).maybeSingle(),
  ])
  const events: ActivityEvent[] = []
  for (const p of (pr.data ?? []) as { company_name: string; created_at: string }[]) events.push({ type: 'prospect', label: `Prospect ajouté : ${p.company_name}`, at: p.created_at })
  for (const s of (gs.data ?? []) as { title: string; platform: string; created_at: string }[]) events.push({ type: 'service', label: `Service généré (${s.platform}) : ${s.title}`, at: s.created_at })
  for (const s of (ls.data ?? []) as { city: string; category: string; created_at: string }[]) events.push({ type: 'search', label: `Recherche : ${s.category} · ${s.city}`, at: s.created_at })
  for (const u of (up.data ?? []) as { job_title: string | null; created_at: string }[]) events.push({ type: 'proposal', label: `Candidature Upwork : ${u.job_title ?? '—'}`, at: u.created_at })
  if (prof.data) events.push({ type: 'signup', label: 'Inscription sur Pipeline', at: (prof.data as { created_at: string }).created_at })
  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50)
}

export interface UserContent {
  portfolio: { slug: string; is_published: boolean; view_count: number } | null
  services: { id: string; title: string; platform: string; thumbnail_url: string | null; created_at: string }[]
  proposals: { id: string; job_title: string | null; is_used: boolean; created_at: string }[]
}

export async function fetchUserContent(userId: string): Promise<UserContent> {
  const [pf, gs, up] = await Promise.all([
    supabase.from('portfolios').select('slug, is_published, view_count').eq('user_id', userId).maybeSingle(),
    supabase.from('generated_services').select('id, title, platform, thumbnail_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('upwork_proposals').select('id, job_title, is_used, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  return {
    portfolio: (pf.data as UserContent['portfolio']) ?? null,
    services: (gs.data as UserContent['services']) ?? [],
    proposals: (up.data as UserContent['proposals']) ?? [],
  }
}

// ---------------------------------------------------------------------------
// Admin logs
// ---------------------------------------------------------------------------

export interface AdminLog {
  id: string
  admin_user_id: string
  target_user_id: string | null
  action_type: string
  details: Record<string, unknown> | null
  created_at: string
  admin_name?: string
  admin_avatar?: string | null
  target_name?: string
}

export const ACTION_LABELS: Record<string, string> = {
  credit_add: 'Crédits ajoutés',
  credit_remove: 'Crédits retirés',
  suspend: 'Compte suspendu',
  unsuspend: 'Compte réactivé',
}

async function hydrateLogNames(logs: AdminLog[]): Promise<AdminLog[]> {
  const ids = Array.from(new Set(logs.flatMap((l) => [l.admin_user_id, l.target_user_id].filter(Boolean) as string[])))
  if (ids.length === 0) return logs
  const { data } = await supabase.from('profiles').select('user_id, first_name, last_name, avatar_url').in('user_id', ids)
  const map = new Map((data ?? []).map((p) => [(p as { user_id: string }).user_id, p as { first_name: string; last_name: string; avatar_url: string | null }]))
  return logs.map((l) => {
    const a = map.get(l.admin_user_id)
    const t = l.target_user_id ? map.get(l.target_user_id) : undefined
    return {
      ...l,
      admin_name: a ? `${a.first_name} ${a.last_name}` : l.admin_user_id.slice(0, 8),
      admin_avatar: a?.avatar_url ?? null,
      target_name: t ? `${t.first_name} ${t.last_name}` : l.target_user_id ? l.target_user_id.slice(0, 8) : '—',
    }
  })
}

export interface LogsQuery {
  adminId?: string
  actionType?: string
  targetUserId?: string
  page?: number
  pageSize?: number
}

export async function fetchLogs(q: LogsQuery): Promise<{ rows: AdminLog[]; total: number }> {
  const page = q.page ?? 0
  const size = q.pageSize ?? 25
  let query = supabase.from('admin_action_logs').select('*', { count: 'exact' })
  if (q.adminId) query = query.eq('admin_user_id', q.adminId)
  if (q.actionType) query = query.eq('action_type', q.actionType)
  if (q.targetUserId) query = query.eq('target_user_id', q.targetUserId)
  query = query.order('created_at', { ascending: false }).range(page * size, page * size + size - 1)
  const { data, count } = await query
  const hydrated = await hydrateLogNames((data as AdminLog[]) ?? [])
  return { rows: hydrated, total: count ?? 0 }
}

// ---------------------------------------------------------------------------
// Global activity feed
// ---------------------------------------------------------------------------

export interface GlobalEvent {
  type: 'signup' | 'payment' | 'prospect' | 'service' | 'search'
  label: string
  at: string
}

export async function fetchGlobalActivity(): Promise<GlobalEvent[]> {
  const [prof, pay, pr, gs, ls] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('payments').select('amount, currency, created_at').eq('status', 'confirmed').order('created_at', { ascending: false }).limit(20),
    supabase.from('prospects').select('company_name, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('generated_services').select('title, platform, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('lead_searches').select('city, category, created_at').order('created_at', { ascending: false }).limit(20),
  ])
  const ev: GlobalEvent[] = []
  for (const p of (prof.data ?? []) as { first_name: string; last_name: string; created_at: string }[]) ev.push({ type: 'signup', label: `Nouvelle inscription : ${p.first_name} ${p.last_name}`, at: p.created_at })
  for (const p of (pay.data ?? []) as { amount: number; currency: string; created_at: string }[]) ev.push({ type: 'payment', label: `Paiement confirmé : ${p.amount} ${p.currency}`, at: p.created_at })
  for (const p of (pr.data ?? []) as { company_name: string; created_at: string }[]) ev.push({ type: 'prospect', label: `Prospect créé : ${p.company_name}`, at: p.created_at })
  for (const s of (gs.data ?? []) as { title: string; platform: string; created_at: string }[]) ev.push({ type: 'service', label: `Service généré (${s.platform}) : ${s.title}`, at: s.created_at })
  for (const s of (ls.data ?? []) as { city: string; category: string; created_at: string }[]) ev.push({ type: 'search', label: `Recherche lancée : ${s.category} · ${s.city}`, at: s.created_at })
  return ev.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40)
}

// ---------------------------------------------------------------------------
// Admin actions (Edge Functions)
// ---------------------------------------------------------------------------

async function invokeAdmin(fn: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const b = (await ctx.clone().json()) as { error?: string }
        if (b?.error) message = b.error
      } catch { /* garde le message générique */ }
    }
    return { data: null, error: message }
  }
  return { data, error: null }
}

export const addCredits = (userId: string, amount: number, reason: string) =>
  invokeAdmin('admin-add-credits', { target_user_id: userId, amount, reason })
export const removeCredits = (userId: string, amount: number, reason: string) =>
  invokeAdmin('admin-remove-credits', { target_user_id: userId, amount, reason })
export const suspendUser = (userId: string, reason: string) =>
  invokeAdmin('admin-suspend-user', { target_user_id: userId, reason })
export const unsuspendUser = (userId: string) =>
  invokeAdmin('admin-unsuspend-user', { target_user_id: userId })

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
