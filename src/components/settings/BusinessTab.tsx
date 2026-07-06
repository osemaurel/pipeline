import { FormEvent, useState } from 'react'
import { Check } from 'lucide-react'
import type { Profile } from '@/types/database'
import { updateProfileFields } from '@/lib/settingsData'
import { useAuthStore } from '@/stores/authStore'
import { BUSINESS_TYPES } from '@/lib/onboardingOptions'

interface Props {
  profile: Profile
}

export function BusinessTab({ profile }: Props) {
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [draft, setDraft] = useState({
    business_type: profile.business_type ?? '',
    business_description: profile.business_description ?? '',
    main_offer: profile.main_offer ?? '',
    pitch_problem: profile.pitch_problem ?? '',
    pitch_solution: profile.pitch_solution ?? '',
    pitch_proposition: profile.pitch_proposition ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedOk(false)
    const { error } = await updateProfileFields(profile.user_id, {
      business_type: draft.business_type || null,
      business_description: draft.business_description.trim() || null,
      main_offer: draft.main_offer.trim() || null,
      pitch_problem: draft.pitch_problem.trim() || null,
      pitch_solution: draft.pitch_solution.trim() || null,
      pitch_proposition: draft.pitch_proposition.trim() || null,
    })
    setSaving(false)
    if (error) return setError(error)
    setSavedOk(true)
    await refreshProfile()
    setTimeout(() => setSavedOk(false), 1500)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Type d'activité</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUSINESS_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDraft({ ...draft, business_type: t })}
              className={`rounded border px-3 py-2 text-sm transition ${
                draft.business_type === t
                  ? 'border-accent-500 bg-accent-500/10 text-accent-700 font-medium'
                  : 'border-ink-200 text-ink-600 hover:bg-cream-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Offre principale</label>
        <input
          className="input"
          value={draft.main_offer}
          onChange={(e) => setDraft({ ...draft, main_offer: e.target.value })}
          placeholder="Ex : Refonte de site vitrine en 3 semaines"
        />
      </div>

      <div>
        <label className="label">Description de ton activité</label>
        <textarea
          className="input min-h-[80px]"
          value={draft.business_description}
          onChange={(e) =>
            setDraft({ ...draft, business_description: e.target.value })
          }
          placeholder="En quelques phrases, ce que tu fais et pour qui."
        />
      </div>

      <div className="border-t border-ink-100 pt-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Ton pitch en trois temps
        </h3>
        <div className="space-y-3">
          <div>
            <label className="label">Le problème que tu résous</label>
            <textarea
              className="input min-h-[70px]"
              value={draft.pitch_problem}
              onChange={(e) =>
                setDraft({ ...draft, pitch_problem: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Ta solution</label>
            <textarea
              className="input min-h-[70px]"
              value={draft.pitch_solution}
              onChange={(e) =>
                setDraft({ ...draft, pitch_solution: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Ta proposition de valeur</label>
            <textarea
              className="input min-h-[70px]"
              value={draft.pitch_proposition}
              onChange={(e) =>
                setDraft({ ...draft, pitch_proposition: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {savedOk && (
          <span className="flex items-center gap-1 text-xs text-success-500">
            <Check size={13} />
            Enregistré
          </span>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
