import { Minus, Plus } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  icon: LucideIcon
}

export function Counter({ label, value, onChange, icon: Icon }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-ink-500">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs uppercase tracking-wide text-ink-400">
          {label}
        </p>
        <p className="font-mono text-2xl font-semibold text-ink-900">{value}</p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-7 w-7 items-center justify-center rounded border border-ink-200 text-ink-500 transition hover:bg-accent-500 hover:border-accent-500 hover:text-white"
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded border border-ink-200 text-ink-500 transition hover:bg-ink-100"
        >
          <Minus size={12} />
        </button>
      </div>
    </div>
  )
}
