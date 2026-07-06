import { Archive, Check, Minus, Plus } from 'lucide-react'
import { GOAL_CATEGORIES, GOAL_PERIODS, type GoalWithProgress } from '@/lib/routineData'

interface Props {
  goal: GoalWithProgress
  onIncrement: (delta: number) => void
  onArchive: () => void
}

export function GoalCard({ goal, onIncrement, onArchive }: Props) {
  const current = goal.progress?.current_value ?? 0
  const pct = Math.min(100, Math.round((current / goal.target_value) * 100))
  const done = current >= goal.target_value
  const periodLabel =
    GOAL_PERIODS.find((p) => p.value === goal.period)?.label ?? goal.period
  const categoryLabel =
    GOAL_CATEGORIES.find((c) => c.value === goal.category)?.label ?? goal.category

  return (
    <div className="rounded-lg border border-ink-100 bg-cream-50 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800">
            {goal.title}
          </p>
          <p className="text-xs text-ink-400">
            {categoryLabel} · {periodLabel}
          </p>
        </div>
        <button
          onClick={onArchive}
          className="shrink-0 text-ink-300 hover:text-danger-500"
          title="Archiver l'objectif"
        >
          <Archive size={14} />
        </button>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-mono text-2xl font-semibold ${
              done ? 'text-success-500' : 'text-ink-900'
            }`}
          >
            {current}
          </span>
          <span className="font-mono text-sm text-ink-400">
            / {goal.target_value}
          </span>
        </div>
        {done && (
          <span className="flex items-center gap-1 text-xs font-medium text-success-500">
            <Check size={12} />
            Atteint
          </span>
        )}
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200">
        <div
          className={`h-full transition-all ${
            done ? 'bg-success-500' : 'bg-accent-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex gap-1.5">
        <button
          onClick={() => onIncrement(-1)}
          className="flex h-7 flex-1 items-center justify-center rounded border border-ink-200 text-ink-500 transition hover:bg-ink-100"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => onIncrement(1)}
          className="flex h-7 flex-1 items-center justify-center rounded border border-accent-500 bg-accent-500/10 text-accent-700 transition hover:bg-accent-500 hover:text-white"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}
