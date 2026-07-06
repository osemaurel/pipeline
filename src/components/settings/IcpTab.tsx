import { FormEvent, useState } from 'react'
import { Check } from 'lucide-react'
import type { Profile } from '@/types/database'
import { updateProfileFields } from '@/lib/settingsData'
import { useAuthStore } from '@/stores/authStore'
import { ChipMultiSelect } from '@/components/onboarding/ChipMultiSelect'
import {
  BUDGET_RANGES,
  CHANNELS,
  COMPANY_SIZES,
  DECISION_MAKER_ROLES,
  REGION_SUGGESTIONS,
  SECTOR_SUGGESTIONS,
} from '@/lib/onboardingOptions'

interface Props {
  profile: Profile
}

export function IcpTab({ profile }: Props) {
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [draft, setDraft] = useState({
    icp_sectors: profile.icp_sectors,
    icp_company_size: profile.icp_company_size ?? '',
    icp_regions: profile.icp_regions,
    icp_decision_maker_role: profile.icp_decision_maker_role ?? '',
    icp_main_problem: profile.icp_main_problem ?? '',
    icp_budget_range: profile.icp_budget_range ?? '',
    active_channels: profile.active_channels,
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
      icp_sectors: draft.icp_sectors,
      icp_company_size: draft.icp_company_size || null,
      icp_regions: draft.icp_regions,
      icp_decision_maker_role: draft.icp_decision_maker_role || null,
      icp_main_problem: draft.icp_main_problem.trim() || null,
      icp_budget_range: draft.icp_budget_range || null,
      active_channels: draft.active_channels,
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
        <label className="label">Secteurs cibles</label>
        <ChipMultiSelect
          value={draft.icp_sectors}
          onChange={(v) => setDraft({ ...draft, icp_sectors: v })}
          suggestions={SECTOR_SUGGESTIONS}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Taille d'entreprise</label>
          <select
            className="input"
            value={draft.icp_company_size}
            onChange={(e) =>
              setDraft({ ...draft, icp_company_size: e.target.value })
            }
          >
            <option value="">— Choisir —</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Budget type</label>
          <select
            className="input"
            value={draft.icp_budget_range}
            onChange={(e) =>
              setDraft({ ...draft, icp_budget_range: e.target.value })
            }
          >
            <option value="">— Choisir —</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Régions ciblées</label>
        <ChipMultiSelect
          value={draft.icp_regions}
          onChange={(v) => setDraft({ ...draft, icp_regions: v })}
          suggestions={REGION_SUGGESTIONS}
        />
      </div>

      <div>
        <label className="label">Interlocuteur type</label>
        <select
          className="input"
          value={draft.icp_decision_maker_role}
          onChange={(e) =>
            setDraft({ ...draft, icp_decision_maker_role: e.target.value })
          }
        >
          <option value="">— Choisir —</option>
          {DECISION_MAKER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Problème principal du client idéal</label>
        <textarea
          className="input min-h-[80px]"
          value={draft.icp_main_problem}
          onChange={(e) =>
            setDraft({ ...draft, icp_main_problem: e.target.value })
          }
        />
      </div>

      <div className="border-t border-ink-100 pt-4">
        <label className="label">Canaux actifs</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHANNELS.map((c) => {
            const active = draft.active_channels.includes(c.value)
            return (
              <button
                key={c.value}
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    active_channels: active
                      ? draft.active_channels.filter((v) => v !== c.value)
                      : [...draft.active_channels, c.value],
                  })
                }
                className={`rounded border px-3 py-2 text-sm transition ${
                  active
                    ? 'border-accent-500 bg-accent-500/10 text-accent-700 font-medium'
                    : 'border-ink-200 text-ink-600 hover:bg-cream-100'
                }`}
              >
                {c.label}
              </button>
            )
          })}
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
