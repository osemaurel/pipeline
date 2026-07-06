import { FormEvent, useState } from 'react'
import { Check } from 'lucide-react'
import type { Profile } from '@/types/database'
import { updateProfileFields } from '@/lib/settingsData'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  profile: Profile
}

export function ProfileTab({ profile }: Props) {
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [draft, setDraft] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    job_title: profile.job_title ?? '',
    company_name: profile.company_name ?? '',
    avatar_url: profile.avatar_url ?? '',
    timezone: profile.timezone,
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
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      job_title: draft.job_title.trim() || null,
      company_name: draft.company_name.trim() || null,
      avatar_url: draft.avatar_url.trim() || null,
      timezone: draft.timezone,
    })
    setSaving(false)
    if (error) return setError(error)
    setSavedOk(true)
    await refreshProfile()
    setTimeout(() => setSavedOk(false), 1500)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4">
        {draft.avatar_url ? (
          <img
            src={draft.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full border-2 border-cream-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-200 text-xl font-semibold text-ink-500">
            {profile.first_name.slice(0, 1)}
          </div>
        )}
        <div className="flex-1">
          <label className="label">URL de l'avatar</label>
          <input
            className="input"
            value={draft.avatar_url}
            onChange={(e) => setDraft({ ...draft, avatar_url: e.target.value })}
            placeholder="https://…"
          />
        </div>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Poste / rôle</label>
          <input
            className="input"
            value={draft.job_title}
            onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
            placeholder="Designer produit indépendant"
          />
        </div>
        <div>
          <label className="label">Entreprise / studio</label>
          <input
            className="input"
            value={draft.company_name}
            onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label">Fuseau horaire</label>
        <select
          className="input"
          value={draft.timezone}
          onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
        >
          <option value="Africa/Dakar">Dakar (GMT)</option>
          <option value="Africa/Abidjan">Abidjan (GMT)</option>
          <option value="Africa/Lagos">Lagos (GMT+1)</option>
          <option value="Africa/Douala">Douala (GMT+1)</option>
          <option value="Europe/Paris">Paris (GMT+1 / +2)</option>
        </select>
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
