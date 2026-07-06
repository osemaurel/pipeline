import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Linkedin,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Sun,
  Target,
  UserPlus,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuthStore } from '@/stores/authStore'
import {
  archiveGoal,
  fetchActiveGoals,
  fetchDailyRoutine,
  fetchWeekRoutines,
  todayIso,
  upsertDailyRoutine,
  upsertGoalProgress,
  type DailyRoutine,
  type GoalWithProgress,
} from '@/lib/routineData'
import { Counter } from '@/components/routine/Counter'
import { GoalForm } from '@/components/routine/GoalForm'
import { GoalCard } from '@/components/routine/GoalCard'
import { WeekOverview } from '@/components/routine/WeekOverview'

export function RoutinePage() {
  const user = useAuthStore((s) => s.user)
  const [routine, setRoutine] = useState<DailyRoutine | null>(null)
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [weekRoutines, setWeekRoutines] = useState<DailyRoutine[]>([])
  const [loading, setLoading] = useState(true)
  const [savingLabel, setSavingLabel] = useState<string | null>(null)
  const [addGoalOpen, setAddGoalOpen] = useState(false)

  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      fetchDailyRoutine(user.id, todayIso()),
      fetchActiveGoals(user.id),
      fetchWeekRoutines(user.id),
    ]).then(([r, g, w]) => {
      setRoutine(r)
      setGoals(g)
      setWeekRoutines(w)
      setLoading(false)
    })
  }, [user])

  const totalActivity = useMemo(
    () =>
      routine
        ? routine.linkedin_connections_count +
          routine.emails_sent_count +
          routine.conversations_count +
          routine.calls_made_count +
          (routine.linkedin_post_done ? 1 : 0)
        : 0,
    [routine],
  )

  const patch = (change: Partial<DailyRoutine>) => {
    if (!routine) return
    const next = { ...routine, ...change }
    setRoutine(next)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setSavingLabel('Enregistrement…')
      const { data } = await upsertDailyRoutine(next)
      if (data) {
        setRoutine(data)
        setWeekRoutines((prev) => {
          const existing = prev.find((r) => r.date === data.date)
          if (existing) return prev.map((r) => (r.date === data.date ? data : r))
          return [...prev, data]
        })
      }
      setSavingLabel(null)
    }, 400)
  }

  const incrementGoal = async (goal: GoalWithProgress, delta: number) => {
    if (!user) return
    const nextValue = Math.max(0, (goal.progress?.current_value ?? 0) + delta)
    const nextProgress = {
      goal_id: goal.id,
      user_id: user.id,
      period_start_date: goal.period_start,
      current_value: nextValue,
      is_completed: nextValue >= goal.target_value,
    }
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              progress: {
                id: g.progress?.id ?? 'tmp',
                updated_at: new Date().toISOString(),
                ...nextProgress,
              },
            }
          : g,
      ),
    )
    await upsertGoalProgress(goal, user.id, nextValue)
  }

  const closeDay = async () => {
    if (!routine) return
    const closed_at = routine.closed_at ? null : new Date().toISOString()
    const next = { ...routine, closed_at }
    setRoutine(next)
    const { data } = await upsertDailyRoutine(next)
    if (data) setRoutine(data)
  }

  const removeGoal = async (goal: GoalWithProgress) => {
    if (!confirm(`Archiver l'objectif « ${goal.title} » ?`)) return
    await archiveGoal(goal.id)
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-ink-400">
            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">
            Ma routine
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Une case cochée par jour vaut mieux qu'un plan génial dans deux mois.
          </p>
        </div>
        {savingLabel && (
          <span className="text-xs italic text-ink-400">{savingLabel}</span>
        )}
      </header>

      {loading || !routine ? (
        <div className="h-64 animate-pulse rounded-lg bg-cream-100" />
      ) : (
        <>
          <section className="card mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-accent-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                  Aujourd'hui
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-ink-500">
                  {totalActivity} actions
                </span>
                <button
                  onClick={closeDay}
                  className={
                    routine.closed_at ? 'btn-secondary' : 'btn-primary'
                  }
                >
                  {routine.closed_at ? (
                    <>Rouvrir la journée</>
                  ) : (
                    <>
                      <Check size={14} />
                      Clôturer la journée
                    </>
                  )}
                </button>
              </div>
            </div>

            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3 transition hover:bg-cream-100">
              <input
                type="checkbox"
                checked={routine.linkedin_post_done}
                onChange={(e) => patch({ linkedin_post_done: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[#7F56D9]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-ink-800">
                  <Linkedin size={14} className="text-accent-500" />
                  Post LinkedIn publié
                </div>
                {routine.linkedin_post_done && (
                  <textarea
                    className="input mt-2 min-h-[60px] text-sm"
                    placeholder="Colle le contenu du post (optionnel, pour ton historique)"
                    value={routine.linkedin_post_content ?? ''}
                    onChange={(e) =>
                      patch({
                        linkedin_post_content: e.target.value || null,
                      })
                    }
                  />
                )}
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Counter
                label="Connexions LinkedIn"
                icon={UserPlus}
                value={routine.linkedin_connections_count}
                onChange={(v) => patch({ linkedin_connections_count: v })}
              />
              <Counter
                label="Emails envoyés"
                icon={Mail}
                value={routine.emails_sent_count}
                onChange={(v) => patch({ emails_sent_count: v })}
              />
              <Counter
                label="Conversations"
                icon={MessageSquare}
                value={routine.conversations_count}
                onChange={(v) => patch({ conversations_count: v })}
              />
              <Counter
                label="Appels"
                icon={Phone}
                value={routine.calls_made_count}
                onChange={(v) => patch({ calls_made_count: v })}
              />
            </div>

            <div className="mt-4">
              <label className="label">Notes du jour</label>
              <textarea
                className="input min-h-[80px]"
                value={routine.notes ?? ''}
                onChange={(e) => patch({ notes: e.target.value || null })}
                placeholder="Ce que tu as appris, les bons plans, ce qui a marché…"
              />
            </div>
          </section>

          <section className="card mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-accent-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                  Objectifs actifs
                </h2>
              </div>
              {!addGoalOpen && (
                <button onClick={() => setAddGoalOpen(true)} className="btn-secondary">
                  <Plus size={13} />
                  Ajouter
                </button>
              )}
            </div>

            {addGoalOpen && user && (
              <div className="mb-4">
                <GoalForm
                  userId={user.id}
                  onCreated={(g) => {
                    setGoals((prev) => [
                      { ...g, progress: null, period_start: g.created_at.slice(0, 10) },
                      ...prev,
                    ])
                    setAddGoalOpen(false)
                  }}
                  onCancel={() => setAddGoalOpen(false)}
                />
              </div>
            )}

            {goals.length === 0 && !addGoalOpen ? (
              <p className="rounded border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
                Aucun objectif actif. Fixe-toi un défi (Ex : « 20 messages LinkedIn cette semaine »).
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onIncrement={(d) => incrementGoal(g, d)}
                    onArchive={() => removeGoal(g)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="mb-4 flex items-center gap-2">
              <Target size={16} className="text-ink-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Ta semaine
              </h2>
            </div>
            <WeekOverview routines={weekRoutines} />
          </section>
        </>
      )}
    </div>
  )
}
