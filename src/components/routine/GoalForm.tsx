import { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import {
  GOAL_CATEGORIES,
  GOAL_PERIODS,
  createGoal,
  type Goal,
  type GoalPeriod,
} from '@/lib/routineData'

interface Props {
  userId: string
  onCreated: (g: Goal) => void
  onCancel: () => void
}

export function GoalForm({ userId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(GOAL_CATEGORIES[0].value)
  const [period, setPeriod] = useState<GoalPeriod>('weekly')
  const [target, setTarget] = useState('10')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !target) return
    setSaving(true)
    setError(null)
    const { data, error } = await createGoal({
      user_id: userId,
      title: title.trim(),
      category,
      period,
      target_value: Math.max(1, Number(target)),
    })
    setSaving(false)
    if (error) return setError(error)
    if (data) onCreated(data)
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-800">Nouvel objectif</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-ink-400 hover:text-ink-800"
        >
          <X size={16} />
        </button>
      </div>
      <div>
        <label className="label">Intitulé</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Prospects contactés"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Catégorie</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {GOAL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Période</label>
          <select
            className="input"
            value={period}
            onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
          >
            {GOAL_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cible</label>
          <input
            type="number"
            min="1"
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </div>
      </div>
      {error && (
        <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Création…' : 'Créer'}
        </button>
      </div>
    </form>
  )
}
