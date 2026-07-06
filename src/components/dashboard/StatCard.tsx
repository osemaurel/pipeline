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
    <div className="card flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            accent
              ? 'bg-accent-500/10 text-accent-600'
              : 'bg-ink-100 text-ink-500'
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4">
        <p className="font-mono text-3xl font-semibold text-ink-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      </div>
    </div>
  )
}
