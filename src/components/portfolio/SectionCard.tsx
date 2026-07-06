import { ReactNode } from 'react'
import { LucideIcon, Plus } from 'lucide-react'

interface Props {
  title: string
  icon: LucideIcon
  description?: string
  onAdd?: () => void
  addLabel?: string
  children: ReactNode
}

export function SectionCard({
  title,
  icon: Icon,
  description,
  onAdd,
  addLabel = 'Ajouter',
  children,
}: Props) {
  return (
    <section className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-ink-500">
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-ink-500">{description}</p>
            )}
          </div>
        </div>
        {onAdd && (
          <button onClick={onAdd} className="btn-secondary shrink-0">
            <Plus size={14} />
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
