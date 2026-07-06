import { ReactNode } from 'react'
import { Trash2, X } from 'lucide-react'

interface Props {
  title: string
  onCancel: () => void
  onSubmit: () => void
  onDelete?: () => void
  saving?: boolean
  children: ReactNode
}

export function ItemEditor({
  title,
  onCancel,
  onSubmit,
  onDelete,
  saving,
  children,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-ink-400 hover:text-ink-700"
        >
          <X size={16} />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
      <div className="mt-4 flex items-center justify-between">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </form>
  )
}
