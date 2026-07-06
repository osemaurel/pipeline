import { useState } from 'react'
import { Edit3, Plus, Trash2, X } from 'lucide-react'
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CHANNELS,
  deleteTemplate,
  saveTemplate,
  type Template,
} from '@/lib/resourcesData'
import { CopyButton } from './CopyButton'

interface Draft {
  id?: string
  category: string
  channel: string
  title: string
  subject: string
  content: string
}

const emptyDraft = (): Draft => ({
  category: 'prospection',
  channel: 'email',
  title: '',
  subject: '',
  content: '',
})

interface Props {
  userId: string
  templates: Template[]
  onChange: (next: Template[]) => void
}

export function TemplatesTab({ userId, templates, onChange }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  const startNew = () => setEditing(emptyDraft())
  const startEdit = (t: Template) =>
    setEditing({
      id: t.id,
      category: t.category,
      channel: t.channel,
      title: t.title,
      subject: t.subject ?? '',
      content: t.content,
    })

  const submit = async () => {
    if (!editing) return
    setSaving(true)
    const { data } = await saveTemplate({
      id: editing.id,
      user_id: userId,
      category: editing.category,
      channel: editing.channel,
      title: editing.title.trim(),
      subject: editing.subject.trim() || null,
      content: editing.content,
    })
    setSaving(false)
    if (!data) return
    if (editing.id) {
      onChange(templates.map((t) => (t.id === editing.id ? data : t)))
    } else {
      onChange([data, ...templates])
    }
    setEditing(null)
  }

  const remove = async () => {
    if (!editing?.id) return
    if (!confirm('Supprimer ce template ?')) return
    await deleteTemplate(editing.id)
    onChange(templates.filter((t) => t.id !== editing.id))
    setEditing(null)
  }

  const shown = filter === 'all' ? templates : templates.filter((t) => t.category === filter)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="input max-w-[200px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Toutes catégories</option>
          {TEMPLATE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button onClick={startNew} className="btn-primary ml-auto">
          <Plus size={14} />
          Nouveau template
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
              {editing.id ? 'Modifier le template' : 'Nouveau template'}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-ink-400 hover:text-ink-800"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Catégorie</label>
              <select
                className="input"
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Canal</label>
              <select
                className="input"
                value={editing.channel}
                onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
              >
                {TEMPLATE_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nom du template</label>
            <input
              className="input"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Ex : Premier email de prospection SaaS"
              required
            />
          </div>
          {editing.channel === 'email' && (
            <div>
              <label className="label">Objet</label>
              <input
                className="input"
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                placeholder="Objet de l'email"
              />
            </div>
          )}
          <div>
            <label className="label">Contenu</label>
            <textarea
              className="input min-h-[180px]"
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              required
              placeholder="Utilise {prenom}, {entreprise} pour personnaliser rapidement."
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
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary">
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
          {templates.length === 0
            ? 'Aucun template. Crée ton premier email de prospection ou de relance.'
            : 'Aucun template dans cette catégorie.'}
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((t) => {
            const cat = TEMPLATE_CATEGORIES.find((c) => c.value === t.category)
            const ch = TEMPLATE_CHANNELS.find((c) => c.value === t.channel)
            return (
              <div
                key={t.id}
                className="rounded-lg border border-ink-100 bg-cream-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
                        {cat?.label ?? t.category}
                      </span>
                      <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-700">
                        {ch?.label ?? t.channel}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-ink-800">{t.title}</h3>
                    {t.subject && (
                      <p className="mt-1 text-xs text-ink-500">
                        <span className="font-medium">Objet :</span> {t.subject}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(t)}
                    className="shrink-0 text-ink-400 hover:text-accent-600"
                    title="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded bg-cream-100 p-3 font-sans text-sm leading-relaxed text-ink-700">
                  {t.content}
                </pre>
                <div className="mt-2 flex justify-end">
                  <CopyButton
                    text={t.subject ? `Objet : ${t.subject}\n\n${t.content}` : t.content}
                    label="Copier le template"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
