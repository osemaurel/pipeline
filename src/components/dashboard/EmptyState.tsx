import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; to: string }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-cream-100 text-ink-300">
        <Icon size={20} />
      </div>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && (
        <p className="text-xs text-ink-400">{description}</p>
      )}
      {action && (
        <Link
          to={action.to}
          className="mt-2 text-xs font-medium text-accent-600 hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
