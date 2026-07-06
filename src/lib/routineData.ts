import { supabase } from '@/lib/supabase'

export interface DailyRoutine {
  id?: string
  user_id: string
  date: string
  linkedin_post_done: boolean
  linkedin_post_content: string | null
  linkedin_connections_count: number
  emails_sent_count: number
  conversations_count: number
  calls_made_count: number
  notes: string | null
  closed_at: string | null
}

export interface Goal {
  id: string
  user_id: string
  period: GoalPeriod
  title: string
  category: string
  target_value: number
  is_active: boolean
  created_at: string
}

export interface GoalProgress {
  id: string
  user_id: string
  goal_id: string
  period_start_date: string
  current_value: number
  is_completed: boolean
  updated_at: string
}

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export const GOAL_PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: 'daily', label: 'Jour' },
  { value: 'weekly', label: 'Semaine' },
  { value: 'monthly', label: 'Mois' },
  { value: 'quarterly', label: 'Trimestre' },
  { value: 'yearly', label: 'Année' },
]

export const GOAL_CATEGORIES = [
  { value: 'prospection', label: 'Prospection' },
  { value: 'contenu', label: 'Contenu' },
  { value: 'ventes', label: 'Ventes' },
  { value: 'livraison', label: 'Livraison' },
  { value: 'autre', label: 'Autre' },
] as const

// ----------------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------------

const toIsoDate = (d: Date) => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`
}

export const todayIso = () => toIsoDate(new Date())

export function periodStartDate(period: GoalPeriod, ref = new Date()): string {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  switch (period) {
    case 'daily':
      return toIsoDate(d)
    case 'weekly': {
      const day = d.getDay() || 7 // dimanche = 7
      d.setDate(d.getDate() - (day - 1))
      return toIsoDate(d)
    }
    case 'monthly':
      return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1))
    case 'quarterly': {
      const q = Math.floor(d.getMonth() / 3)
      return toIsoDate(new Date(d.getFullYear(), q * 3, 1))
    }
    case 'yearly':
      return toIsoDate(new Date(d.getFullYear(), 0, 1))
  }
}

// ----------------------------------------------------------------------------
// Daily routine
// ----------------------------------------------------------------------------

const emptyDaily = (userId: string, date: string): DailyRoutine => ({
  user_id: userId,
  date,
  linkedin_post_done: false,
  linkedin_post_content: null,
  linkedin_connections_count: 0,
  emails_sent_count: 0,
  conversations_count: 0,
  calls_made_count: 0,
  notes: null,
  closed_at: null,
})

export async function fetchDailyRoutine(
  userId: string,
  date: string,
): Promise<DailyRoutine> {
  const { data } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  return (data as DailyRoutine | null) ?? emptyDaily(userId, date)
}

export async function upsertDailyRoutine(routine: DailyRoutine) {
  const { data, error } = await supabase
    .from('daily_routines')
    .upsert(routine, { onConflict: 'user_id,date' })
    .select()
    .single()
  return {
    data: (data as DailyRoutine | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function fetchWeekRoutines(userId: string): Promise<DailyRoutine[]> {
  const start = new Date()
  start.setDate(start.getDate() - 6)
  const { data } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('user_id', userId)
    .gte('date', toIsoDate(start))
    .lte('date', todayIso())
    .order('date', { ascending: true })
  return (data as DailyRoutine[]) ?? []
}

// ----------------------------------------------------------------------------
// Goals
// ----------------------------------------------------------------------------

export interface GoalWithProgress extends Goal {
  progress: GoalProgress | null
  period_start: string
}

export async function fetchActiveGoals(userId: string): Promise<GoalWithProgress[]> {
  const { data: goalsData } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const goals = (goalsData as Goal[]) ?? []
  if (goals.length === 0) return []

  const goalIds = goals.map((g) => g.id)
  const { data: progressData } = await supabase
    .from('goal_progress')
    .select('*')
    .in('goal_id', goalIds)

  const progressList = (progressData as GoalProgress[]) ?? []

  return goals.map((g) => {
    const start = periodStartDate(g.period)
    const progress =
      progressList.find(
        (p) => p.goal_id === g.id && p.period_start_date === start,
      ) ?? null
    return { ...g, progress, period_start: start }
  })
}

export async function createGoal(input: {
  user_id: string
  period: GoalPeriod
  title: string
  category: string
  target_value: number
}) {
  const { data, error } = await supabase
    .from('goals')
    .insert(input)
    .select()
    .single()
  return {
    data: (data as Goal | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function archiveGoal(id: string) {
  await supabase.from('goals').update({ is_active: false }).eq('id', id)
}

export async function upsertGoalProgress(
  goal: GoalWithProgress,
  userId: string,
  currentValue: number,
): Promise<GoalProgress | null> {
  const value = Math.max(0, currentValue)
  const isCompleted = value >= goal.target_value
  const { data } = await supabase
    .from('goal_progress')
    .upsert(
      {
        user_id: userId,
        goal_id: goal.id,
        period_start_date: goal.period_start,
        current_value: value,
        is_completed: isCompleted,
      },
      { onConflict: 'goal_id,period_start_date' },
    )
    .select()
    .single()
  return (data as GoalProgress | null) ?? null
}
