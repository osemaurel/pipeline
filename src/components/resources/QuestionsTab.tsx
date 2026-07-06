import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, X } from 'lucide-react'
import {
  deleteDiscoveryQuestion,
  reorderDiscoveryQuestions,
  saveDiscoveryQuestion,
  type DiscoveryQuestion,
} from '@/lib/resourcesData'

interface Props {
  userId: string
  questions: DiscoveryQuestion[]
  onChange: (next: DiscoveryQuestion[]) => void
}

export function QuestionsTab({ userId, questions, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!draft.trim()) return
    setSaving(true)
    const { data } = await saveDiscoveryQuestion({
      user_id: userId,
      question: draft.trim(),
      order_index: questions.length,
      is_active: true,
    })
    setSaving(false)
    if (data) {
      onChange([...questions, data])
      setDraft('')
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette question ?')) return
    await deleteDiscoveryQuestion(id)
    onChange(questions.filter((q) => q.id !== id))
  }

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return
    const next = [...questions]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
    await reorderDiscoveryQuestions(next.map((q) => q.id))
  }

  const toggleActive = async (q: DiscoveryQuestion) => {
    const { data } = await saveDiscoveryQuestion({
      id: q.id,
      user_id: userId,
      question: q.question,
      is_active: !q.is_active,
    })
    if (data) onChange(questions.map((x) => (x.id === q.id ? data : x)))
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">
          Les questions à poser en RDV de découverte. L'ordre est celui de ton entretien.
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mb-4 rounded-lg border border-accent-500/30 bg-accent-500/5 p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-800">Nouvelle question</h3>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-ink-400 hover:text-ink-800"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            className="input min-h-[70px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ex : Qu'est-ce qui vous a fait chercher une solution maintenant ?"
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {questions.length === 0 ? (
        <p className="rounded border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">
          Aucune question. Commence par les 3 questions clés que tu poses toujours.
        </p>
      ) : (
        <ul className="space-y-2">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className={`flex items-start gap-2 rounded-lg border p-3 transition ${
                q.is_active
                  ? 'border-ink-100 bg-cream-50'
                  : 'border-ink-100 bg-cream-100/50 opacity-60'
              }`}
            >
              <div className="mt-0.5 flex flex-col text-ink-300">
                <button
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  className="p-0.5 disabled:opacity-30 hover:text-ink-700"
                  title="Monter"
                >
                  <ChevronUp size={13} />
                </button>
                <GripVertical size={12} className="opacity-40" />
                <button
                  onClick={() => move(i, i + 1)}
                  disabled={i === questions.length - 1}
                  className="p-0.5 disabled:opacity-30 hover:text-ink-700"
                  title="Descendre"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
              <span className="mt-1 shrink-0 font-mono text-xs text-ink-400">
                {(i + 1).toString().padStart(2, '0')}.
              </span>
              <p className="min-w-0 flex-1 text-sm text-ink-800">{q.question}</p>
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-ink-500">
                  <input
                    type="checkbox"
                    checked={q.is_active}
                    onChange={() => toggleActive(q)}
                    className="accent-[#7F56D9]"
                  />
                  Actif
                </label>
                <button
                  onClick={() => remove(q.id)}
                  className="text-ink-300 hover:text-danger-500"
                  title="Supprimer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
