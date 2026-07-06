import { FormEvent, useState } from 'react'
import { Save, Trash2, X } from 'lucide-react'
import {
  CHANNELS,
  PRIORITY_LABELS,
  createProspect,
  deleteProspect,
  updateProspect,
  type Prospect,
} from '@/lib/crmData'
import { PIPELINE_STAGES } from '@/lib/pipelineStatus'

interface Props {
  userId: string
  prospect?: Prospect
  onSaved: (p: Prospect) => void
  onDeleted?: (id: string) => void
  onCancel: () => void
}

const emptyDraft = () => ({
  first_name: '',
  last_name: '',
  company_name: '',
  email: '',
  phone: '',
  position: '',
  sector: '',
  status: 'new',
  channel: 'linkedin',
  priority: 3,
  is_favorite: false,
  estimated_deal_value: '',
  notes: '',
})

export function ProspectForm({ userId, prospect, onSaved, onDeleted, onCancel }: Props) {
  const [draft, setDraft] = useState(
    prospect
      ? {
          first_name: prospect.first_name,
          last_name: prospect.last_name,
          company_name: prospect.company_name,
          email: prospect.email ?? '',
          phone: prospect.phone ?? '',
          position: prospect.position ?? '',
          sector: prospect.sector ?? '',
          status: prospect.status,
          channel: prospect.channel,
          priority: prospect.priority,
          is_favorite: prospect.is_favorite,
          estimated_deal_value: prospect.estimated_deal_value?.toString() ?? '',
          notes: prospect.notes ?? '',
        }
      : emptyDraft(),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = {
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      company_name: draft.company_name.trim(),
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      position: draft.position.trim() || null,
      sector: draft.sector.trim() || null,
      status: draft.status,
      channel: draft.channel,
      priority: draft.priority,
      is_favorite: draft.is_favorite,
      estimated_deal_value: draft.estimated_deal_value
        ? Number(draft.estimated_deal_value)
        : null,
      notes: draft.notes.trim() || null,
    }
    const res = prospect
      ? await updateProspect(prospect.id, payload)
      : await createProspect({ ...payload, user_id: userId })
    setSaving(false)
    if (res.error) return setError(res.error)
    if (res.data) onSaved(res.data)
  }

  const remove = async () => {
    if (!prospect) return
    if (!confirm('Supprimer ce prospect ? Cette action est définitive.')) return
    const { error } = await deleteProspect(prospect.id)
    if (error) return setError(error)
    onDeleted?.(prospect.id)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink-900">
          {prospect ? 'Modifier le prospect' : 'Nouveau prospect'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-ink-400 hover:text-ink-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Prénom</label>
          <input
            className="input"
            required
            value={draft.first_name}
            onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Nom</label>
          <input
            className="input"
            required
            value={draft.last_name}
            onChange={(e) => setDraft({ ...draft, last_name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label">Entreprise</label>
        <input
          className="input"
          required
          value={draft.company_name}
          onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Poste</label>
          <input
            className="input"
            value={draft.position}
            onChange={(e) => setDraft({ ...draft, position: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Secteur</label>
          <input
            className="input"
            value={draft.sector}
            onChange={(e) => setDraft({ ...draft, sector: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input
            className="input"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Étape</label>
          <select
            className="input"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Canal d'acquisition</label>
          <select
            className="input"
            value={draft.channel}
            onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">
            Priorité — {PRIORITY_LABELS[draft.priority]}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            className="w-full accent-[#7F56D9]"
            value={draft.priority}
            onChange={(e) =>
              setDraft({ ...draft, priority: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="label">Valeur estimée (FCFA)</label>
          <input
            type="number"
            min="0"
            className="input"
            value={draft.estimated_deal_value}
            onChange={(e) =>
              setDraft({ ...draft, estimated_deal_value: e.target.value })
            }
            placeholder="Ex : 500000"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={draft.is_favorite}
          onChange={(e) => setDraft({ ...draft, is_favorite: e.target.checked })}
          className="rounded accent-[#7F56D9]"
        />
        Marquer comme favori
      </label>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[100px]"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Contexte, points d'attention, historique…"
        />
      </div>

      {error && (
        <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-ink-100 pt-4">
        {prospect ? (
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
          <button type="button" onClick={onCancel} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save size={14} />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </form>
  )
}
