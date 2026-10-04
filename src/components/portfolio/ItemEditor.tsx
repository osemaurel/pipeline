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
          aria-label="Fermer"
          className="-m-2 flex h-11 w-11 items-center justify-center rounded text-ink-400 hover:text-ink-700 sm:h-8 sm:w-8"
        >
          <X size={16} />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-danger-600 hover:underline sm:justify-start sm:py-0"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex">
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
