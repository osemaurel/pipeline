import { useState } from 'react'
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react'
import {
  deleteObjectionResponse,
  saveObjectionResponse,
  type ObjectionResponse,
} from '@/lib/resourcesData'
import { CopyButton } from './CopyButton'

interface Draft {
  id?: string
  objection: string
  response: string
}

interface Props {
  userId: string
  items: ObjectionResponse[]
  onChange: (next: ObjectionResponse[]) => void
}

export function ObjectionsTab({ userId, items, onChange }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const startNew = () => setEditing({ objection: '', response: '' })
  const startEdit = (o: ObjectionResponse) =>
    setEditing({ id: o.id, objection: o.objection, response: o.response })

  const submit = async () => {
    if (!editing?.objection.trim() || !editing.response.trim()) return
    setSaving(true)
    const { data } = await saveObjectionResponse({
      id: editing.id,
      user_id: userId,
      objection: editing.objection.trim(),
      response: editing.response.trim(),
    })
    setSaving(false)
    if (!data) return
    if (editing.id) {
      onChange(items.map((o) => (o.id === editing.id ? data : o)))
    } else {
      onChange(
        [...items, data].sort((a, b) => a.objection.localeCompare(b.objection)),
      )
    }
    setEditing(null)
  }

  const remove = async () => {
    if (!editing?.id) return
    if (!confirm('Supprimer cette objection ?')) return
    await deleteObjectionResponse(editing.id)
    onChange(items.filter((o) => o.id !== editing.id))
    setEditing(null)
  }

  const shown = search.trim()
    ? items.filter(
        (o) =>
          o.objection.toLowerCase().includes(search.toLowerCase()) ||
          o.response.toLowerCase().includes(search.toLowerCase()),
      )
    : items

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300"
          />
          <input
            className="input pl-9"
            placeholder="Chercher une objection…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus size={14} />
          Nouvelle objection
        </button>
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mb-4 rounded-lg border border-accent-500/30 bg-accent-500/5 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-800">
              {editing.id ? 'Modifier' : 'Nouvelle objection'}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-ink-400 hover:text-ink-800"
            >
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="label">L'objection</label>
            <input
              className="input"
              value={editing.objection}
              onChange={(e) => setEditing({ ...editing, objection: e.target.value })}
              placeholder="Ex : C'est trop cher"
              required
            />
          </div>
          <div>
            <label className="label">Ta réponse</label>
            <textarea
              className="input min-h-[120px]"
              value={editing.response}
              onChange={(e) => setEditing({ ...editing, response: e.target.value })}
              placeholder="La réponse que tu donnes habituellement pour désamorcer."
              required
            />
          </div>
          <div className="flex items-center justify-between">
            {editing.id ? (
              <button
                type="button"
                onClick={remove}
                className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
              >
                <Trash2 size={13} />
                Supprimer
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      )}

      {shown.length === 0 ? (
        <p className="rounded border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">
          {items.length === 0
            ? 'Aucune objection. Note celles qui reviennent le plus souvent en RDV.'
            : 'Aucune objection ne correspond à ta recherche.'}
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border border-ink-100 bg-cream-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink-800">
                  « {o.objection} »
                </p>
                <button
                  onClick={() => startEdit(o)}
                  className="shrink-0 text-ink-400 hover:text-accent-600"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {o.response}
              </p>
              <div className="mt-2 flex justify-end">
                <CopyButton text={o.response} label="Copier la réponse" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
