import { supabase } from '@/lib/supabase'
import { PIPELINE_STAGES, ACTIVE_STAGES } from '@/lib/pipelineStatus'
import { CHANNELS } from '@/lib/crmData'

export type PeriodDays = 7 | 30 | 90

export interface StatsKpis {
  activeProspects: number
  wonProspects: number
  lostProspects: number
  conversionRate: number // %
  wonRevenue: number
  pipelineRevenue: number
  portfolioViews: number
  totalLeads: number
}

export interface DailyActivityPoint {
  date: string // ISO yyyy-mm-dd
  label: string // "dd MMM"
  interactions: number
  actions: number
  posts: number
  outbound: number // linkedin + emails + calls + conversations
}

export interface StageBucket {
  stage: string
  label: string
  count: number
  value: number
}

export interface ChannelBucket {
  channel: string
  label: string
  count: number
}

export interface TopProspect {
  id: string
  name: string
  company: string
  status: string
  estimated_deal_value: number
}

export interface StatsBundle {
  kpis: StatsKpis
  daily: DailyActivityPoint[]
  byStage: StageBucket[]
  byChannel: ChannelBucket[]
  topProspects: TopProspect[]
}

const startOfDay = (d: Date) => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

const isoDate = (d: Date) => startOfDay(d).toISOString().slice(0, 10)

const shortLabel = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

export async function fetchStats(
  userId: string,
  days: PeriodDays,
): Promise<StatsBundle> {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  const startIso = startOfDay(start).toISOString()

  const [
    prospectsRes,
    portfolioRes,
    leadsRes,
    interactionsRes,
    actionsRes,
    routinesRes,
    topProspectsRes,
  ] = await Promise.all([
    supabase
      .from('prospects')
      .select(
        'id, first_name, last_name, company_name, status, channel, estimated_deal_value',
      )
      .eq('user_id', userId),
    supabase
      .from('portfolios')
      .select('view_count')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('portfolio_leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('interactions')
      .select('occurred_at')
      .eq('user_id', userId)
      .gte('occurred_at', startIso),
    supabase
      .from('actions')
      .select('scheduled_at, is_completed, completed_at')
      .eq('user_id', userId)
      .gte('scheduled_at', startIso),
    supabase
      .from('daily_routines')
      .select(
        'date, linkedin_post_done, linkedin_connections_count, emails_sent_count, conversations_count, calls_made_count',
      )
      .eq('user_id', userId)
      .gte('date', isoDate(start)),
    supabase
      .from('prospects')
      .select('id, first_name, last_name, company_name, status, estimated_deal_value')
      .eq('user_id', userId)
      .not('estimated_deal_value', 'is', null)
      .order('estimated_deal_value', { ascending: false })
      .limit(5),
  ])

  const prospects =
    (prospectsRes.data as {
      id: string
      first_name: string
      last_name: string
      company_name: string
      status: string
      channel: string
      estimated_deal_value: number | null
    }[]) ?? []

  const activeProspects = prospects.filter((p) =>
    (ACTIVE_STAGES as string[]).includes(p.status),
  ).length
  const wonProspects = prospects.filter((p) => p.status === 'won').length
  const lostProspects = prospects.filter((p) => p.status === 'lost').length
  const closed = wonProspects + lostProspects
  const conversionRate = closed > 0 ? Math.round((wonProspects / closed) * 100) : 0
  const wonRevenue = prospects
    .filter((p) => p.status === 'won')
    .reduce((s, p) => s + (p.estimated_deal_value ?? 0), 0)
  const pipelineRevenue = prospects
    .filter((p) => (ACTIVE_STAGES as string[]).includes(p.status))
    .reduce((s, p) => s + (p.estimated_deal_value ?? 0), 0)

  const kpis: StatsKpis = {
    activeProspects,
    wonProspects,
    lostProspects,
    conversionRate,
    wonRevenue,
    pipelineRevenue,
    portfolioViews: portfolioRes.data?.view_count ?? 0,
    totalLeads: leadsRes.count ?? 0,
  }

  // Daily aggregation
  const daysArr: DailyActivityPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    daysArr.push({
      date: isoDate(d),
      label: shortLabel(d),
      interactions: 0,
      actions: 0,
      posts: 0,
      outbound: 0,
    })
  }
  const dayIndex: Record<string, DailyActivityPoint> = {}
  for (const d of daysArr) dayIndex[d.date] = d

  for (const i of interactionsRes.data ?? []) {
    const key = (i as { occurred_at: string }).occurred_at.slice(0, 10)
    if (dayIndex[key]) dayIndex[key].interactions++
  }
  for (const a of actionsRes.data ?? []) {
    const raw = a as { scheduled_at: string; is_completed: boolean; completed_at: string | null }
    const key = (raw.completed_at ?? raw.scheduled_at).slice(0, 10)
    if (dayIndex[key] && raw.is_completed) dayIndex[key].actions++
  }
  for (const r of routinesRes.data ?? []) {
    const raw = r as {
      date: string
      linkedin_post_done: boolean
      linkedin_connections_count: number
      emails_sent_count: number
      conversations_count: number
      calls_made_count: number
    }
    if (dayIndex[raw.date]) {
      if (raw.linkedin_post_done) dayIndex[raw.date].posts++
      dayIndex[raw.date].outbound +=
        (raw.linkedin_connections_count ?? 0) +
        (raw.emails_sent_count ?? 0) +
        (raw.conversations_count ?? 0) +
        (raw.calls_made_count ?? 0)
    }
  }

  // By stage
  const byStage: StageBucket[] = PIPELINE_STAGES.map((s) => {
    const bucket = prospects.filter((p) => p.status === s.value)
    return {
      stage: s.value,
      label: s.label,
      count: bucket.length,
      value: bucket.reduce((sum, p) => sum + (p.estimated_deal_value ?? 0), 0),
    }
  })

  // By channel
  const channelLabel = (v: string) =>
    CHANNELS.find((c) => c.value === v)?.label ?? v
  const channelCount: Record<string, number> = {}
  for (const p of prospects) {
    channelCount[p.channel] = (channelCount[p.channel] ?? 0) + 1
  }
  const byChannel: ChannelBucket[] = Object.entries(channelCount)
    .map(([channel, count]) => ({
      channel,
      label: channelLabel(channel),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const topProspects: TopProspect[] = (
    (topProspectsRes.data as {
      id: string
      first_name: string
      last_name: string
      company_name: string
      status: string
      estimated_deal_value: number
    }[]) ?? []
  ).map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    company: p.company_name,
    status: p.status,
    estimated_deal_value: p.estimated_deal_value,
  }))

  return { kpis, daily: daysArr, byStage, byChannel, topProspects }
}
