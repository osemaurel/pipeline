import { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  accent?: boolean
}

export function StatCard({ label, value, icon: Icon, hint, accent }: Props) {
  return (
    <div className="card flex min-w-0 flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[11px] uppercase leading-tight tracking-wide text-ink-400 sm:text-xs">
          {label}
        </p>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
            accent
              ? 'bg-accent-500/10 text-accent-600'
              : 'bg-ink-100 text-ink-500'
          }`}
        >
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-3 min-w-0 sm:mt-4">
        <p className="truncate font-mono text-2xl font-semibold text-ink-900 sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-ink-400">{hint}</p>}
      </div>
    </div>
  )
}
