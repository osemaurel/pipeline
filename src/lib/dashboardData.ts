import { supabase } from '@/lib/supabase'
import { ACTIVE_STAGES } from '@/lib/pipelineStatus'

export interface DashboardMeeting {
  id: string
  scheduled_at: string
  duration_minutes: number | null
  platform: string | null
  prospect_id: string
  prospect: { first_name: string; last_name: string; company_name: string } | null
}

export interface DashboardAction {
  id: string
  title: string
  description: string | null
  type: string
  scheduled_at: string
  prospect_id: string | null
  prospect: { first_name: string; last_name: string; company_name: string } | null
}

export interface DashboardLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  created_at: string
}

export type DashboardPortfolio = {
  slug: string | null
  is_published: boolean
  view_count: number
} | null

export interface DashboardStats {
  activeProspects: number
  meetingsThisWeek: number
  portfolioViews: number
  unconvertedLeads: number
  totalProspects: number
  wonProspects: number
}

export interface DashboardPipeline {
  byStage: Record<string, number>
}

export interface DashboardData {
  stats: DashboardStats
  pipeline: DashboardPipeline
  todaysActions: DashboardAction[]
  upcomingMeetings: DashboardMeeting[]
  recentLeads: DashboardLead[]
  portfolio: DashboardPortfolio
}

const startOfDay = (d: Date) => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}
const endOfDay = (d: Date) => {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c
}
const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()
  const weekEnd = endOfDay(addDays(today, 7)).toISOString()

  const [prospectsRes, meetingsRes, portfolioRes, leadsCountRes, actionsRes, upcomingMeetingsRes, leadsRes] =
    await Promise.all([
      supabase
        .from('prospects')
        .select('status', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', weekEnd)
        .eq('status', 'scheduled'),
      supabase
        .from('portfolios')
        .select('slug, is_published, view_count')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('portfolio_leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('converted_to_prospect_id', null),
      supabase
        .from('actions')
        .select(
          'id, title, description, type, scheduled_at, prospect_id, prospect:prospects(first_name, last_name, company_name)',
        )
        .eq('user_id', userId)
        .eq('is_completed', false)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('meetings')
        .select(
          'id, scheduled_at, duration_minutes, platform, prospect_id, prospect:prospects(first_name, last_name, company_name)',
        )
        .eq('user_id', userId)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', weekEnd)
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(5),
      supabase
        .from('portfolio_leads')
        .select('id, name, email, phone, message, created_at')
        .eq('user_id', userId)
        .is('converted_to_prospect_id', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  const prospects = (prospectsRes.data ?? []) as { status: string }[]
  const byStage: Record<string, number> = {}
  for (const p of prospects) {
    byStage[p.status] = (byStage[p.status] ?? 0) + 1
  }
  const activeProspects = prospects.filter((p) =>
    (ACTIVE_STAGES as string[]).includes(p.status),
  ).length
  const wonProspects = byStage['won'] ?? 0

  return {
    stats: {
      activeProspects,
      totalProspects: prospects.length,
      wonProspects,
      meetingsThisWeek: meetingsRes.count ?? 0,
      portfolioViews: portfolioRes.data?.view_count ?? 0,
      unconvertedLeads: leadsCountRes.count ?? 0,
    },
    pipeline: { byStage },
    todaysActions: (actionsRes.data as unknown as DashboardAction[]) ?? [],
    upcomingMeetings: (upcomingMeetingsRes.data as unknown as DashboardMeeting[]) ?? [],
    recentLeads: (leadsRes.data as DashboardLead[]) ?? [],
    portfolio: (portfolioRes.data as DashboardPortfolio) ?? null,
  }
}
