import { Minus, Plus } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  icon: LucideIcon
}

// Mobile : carte verticale avec gros boutons −/+ côte à côte (pouce).
// Desktop : ligne compacte avec boutons empilés à droite.
export function Counter({ label, value, onChange, icon: Icon }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-ink-500 sm:flex">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] uppercase leading-tight tracking-wide text-ink-400 sm:truncate sm:text-xs">
            <Icon size={12} className="shrink-0 sm:hidden" />
            {label}
          </p>
          <p className="font-mono text-2xl font-semibold text-ink-900">{value}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-col-reverse sm:gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Retirer 1 — ${label}`}
          className="flex h-10 items-center justify-center rounded border border-ink-200 text-ink-500 transition hover:bg-ink-100 active:scale-95 sm:h-7 sm:w-7"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Ajouter 1 — ${label}`}
          className="flex h-10 items-center justify-center rounded border border-accent-500/40 bg-accent-500/10 text-accent-700 transition hover:border-accent-500 hover:bg-accent-500 hover:text-white active:scale-95 sm:h-7 sm:w-7 sm:border-ink-200 sm:bg-transparent sm:text-ink-500"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
