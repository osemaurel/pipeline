import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ChipMultiSelect } from '@/components/onboarding/ChipMultiSelect'
import {
  BUDGET_RANGES,
  BUSINESS_TYPES,
  CHANNELS,
  COMPANY_SIZES,
  DECISION_MAKER_ROLES,
  REGION_SUGGESTIONS,
  SECTOR_SUGGESTIONS,
} from '@/lib/onboardingOptions'

interface FormData {
  job_title: string
  company_name: string
  business_type: string
  main_offer: string
  business_description: string
  pitch_problem: string
  pitch_solution: string
  pitch_proposition: string
  icp_sectors: string[]
  icp_company_size: string
  icp_regions: string[]
  icp_decision_maker_role: string
  icp_main_problem: string
  icp_budget_range: string
  active_channels: string[]
}

const STEPS = ['Activité', 'Pitch', 'Client idéal', 'Canaux', 'Récap'] as const

export function OnboardingPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const user = useAuthStore((s) => s.user)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<FormData>({
    job_title: profile?.job_title ?? '',
    company_name: profile?.company_name ?? '',
    business_type: profile?.business_type ?? '',
    main_offer: profile?.main_offer ?? '',
    business_description: profile?.business_description ?? '',
    pitch_problem: profile?.pitch_problem ?? '',
    pitch_solution: profile?.pitch_solution ?? '',
    pitch_proposition: profile?.pitch_proposition ?? '',
    icp_sectors: profile?.icp_sectors ?? [],
    icp_company_size: profile?.icp_company_size ?? '',
    icp_regions: profile?.icp_regions ?? [],
    icp_decision_maker_role: profile?.icp_decision_maker_role ?? '',
    icp_main_problem: profile?.icp_main_problem ?? '',
    icp_budget_range: profile?.icp_budget_range ?? '',
    active_channels: profile?.active_channels ?? [],
  })

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return data.job_title.trim() && data.business_type && data.main_offer.trim()
      case 1:
        return (
          data.pitch_problem.trim() &&
          data.pitch_solution.trim() &&
          data.pitch_proposition.trim()
        )
      case 2:
        return data.icp_sectors.length > 0 && data.icp_main_problem.trim()
      case 3:
        return data.active_channels.length > 0
      default:
        return true
    }
  }, [step, data])

  const handleFinish = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, onboarding_completed: true })
      .eq('user_id', user.id)
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    await refreshProfile()
    navigate('/dashboard', { replace: true })
  }

  const goNext = (e?: FormEvent) => {
    e?.preventDefault()
    if (!canGoNext) return
    if (step === STEPS.length - 1) {
      handleFinish()
    } else {
      setStep((s) => s + 1)
    }
  }

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="min-h-screen bg-cream-100 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-ink-900">
            Bienvenue{profile ? `, ${profile.first_name}` : ''}
          </h1>
          <p className="mt-1 text-ink-500">
            Ces informations personnalisent ton portfolio et les suggestions IA.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition ${
                  i < step
                    ? 'bg-accent-500 text-white'
                    : i === step
                      ? 'bg-ink-900 text-white'
                      : 'bg-cream-50 text-ink-300 border border-ink-200'
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 ${
                    i < step ? 'bg-accent-500' : 'bg-ink-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={goNext} className="card space-y-5">
          <h2 className="text-lg font-semibold text-ink-900">{STEPS[step]}</h2>

          {step === 0 && (
            <>
              <div>
                <label className="label">Ton rôle / poste</label>
                <input
                  className="input"
                  placeholder="Ex : Designer UX freelance"
                  value={data.job_title}
                  onChange={(e) => update('job_title', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Nom de ton entreprise (optionnel)</label>
                <input
                  className="input"
                  value={data.company_name}
                  onChange={(e) => update('company_name', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Type d’activité</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BUSINESS_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update('business_type', t)}
                      className={`rounded border px-3 py-2 text-sm transition ${
                        data.business_type === t
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
                <label className="label">Ton offre principale</label>
                <input
                  className="input"
                  placeholder="Ex : Refonte de site vitrine en 3 semaines"
                  value={data.main_offer}
                  onChange={(e) => update('main_offer', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Description courte (optionnel)</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="En quelques phrases, ce que tu fais et pour qui."
                  value={data.business_description}
                  onChange={(e) => update('business_description', e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-ink-500">
                Ton pitch en trois temps — c’est ce qui sera utilisé dans ton
                portfolio et par le générateur IA.
              </p>
              <div>
                <label className="label">Le problème que tu résous</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Quel problème vivent tes clients avant de te contacter ?"
                  value={data.pitch_problem}
                  onChange={(e) => update('pitch_problem', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Ta solution</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Comment tu le résous, concrètement."
                  value={data.pitch_solution}
                  onChange={(e) => update('pitch_solution', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Ta proposition de valeur</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Le résultat que le client obtient. Ex : « Un site qui convertit deux fois plus, en 3 semaines. »"
                  value={data.pitch_proposition}
                  onChange={(e) => update('pitch_proposition', e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-ink-500">
                Ton <span className="font-medium text-ink-700">client idéal</span> — plus
                c’est précis, plus tes suggestions le sont.
              </p>
              <div>
                <label className="label">Secteurs visés</label>
                <ChipMultiSelect
                  value={data.icp_sectors}
                  onChange={(v) => update('icp_sectors', v)}
                  suggestions={SECTOR_SUGGESTIONS}
                  placeholder="Ajoute un secteur (Entrée pour valider)"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Taille d’entreprise</label>
                  <select
                    className="input"
                    value={data.icp_company_size}
                    onChange={(e) => update('icp_company_size', e.target.value)}
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
                    value={data.icp_budget_range}
                    onChange={(e) => update('icp_budget_range', e.target.value)}
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
                  value={data.icp_regions}
                  onChange={(v) => update('icp_regions', v)}
                  suggestions={REGION_SUGGESTIONS}
                  placeholder="Ajoute un pays / région"
                />
              </div>
              <div>
                <label className="label">Interlocuteur type</label>
                <select
                  className="input"
                  value={data.icp_decision_maker_role}
                  onChange={(e) =>
                    update('icp_decision_maker_role', e.target.value)
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
                <label className="label">Problème principal du client</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Le déclencheur qui pousse ton client à chercher quelqu’un comme toi."
                  value={data.icp_main_problem}
                  onChange={(e) => update('icp_main_problem', e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-ink-500">
                Sur quels canaux tu prospectes ou communiques (choisis-en au moins un).
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CHANNELS.map((c) => {
                  const active = data.active_channels.includes(c.value)
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() =>
                        update(
                          'active_channels',
                          active
                            ? data.active_channels.filter((v) => v !== c.value)
                            : [...data.active_channels, c.value],
                        )
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
            </>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <p className="text-ink-500">
                Vérifie tes informations. Tu pourras tout modifier ensuite depuis
                <span className="font-medium text-ink-700"> Paramètres</span>.
              </p>
              <RecapRow label="Rôle" value={data.job_title} />
              <RecapRow label="Type d’activité" value={data.business_type} />
              <RecapRow label="Offre principale" value={data.main_offer} />
              <RecapRow
                label="Pitch"
                value={
                  data.pitch_proposition ||
                  `${data.pitch_problem} → ${data.pitch_solution}`
                }
              />
              <RecapRow
                label="Secteurs cibles"
                value={data.icp_sectors.join(', ')}
              />
              <RecapRow
                label="Régions cibles"
                value={data.icp_regions.join(', ')}
              />
              <RecapRow
                label="Budget type"
                value={
                  BUDGET_RANGES.find((b) => b.value === data.icp_budget_range)
                    ?.label ?? '—'
                }
              />
              <RecapRow
                label="Canaux actifs"
                value={data.active_channels
                  .map(
                    (v) => CHANNELS.find((c) => c.value === v)?.label ?? v,
                  )
                  .join(', ')}
              />
            </div>
          )}

          {error && (
            <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="btn-secondary"
            >
              <ArrowLeft size={16} />
              Retour
            </button>
            <button
              type="submit"
              disabled={!canGoNext || saving}
              className="btn-primary"
            >
              {step === STEPS.length - 1 ? (
                saving ? (
                  'Enregistrement...'
                ) : (
                  <>
                    Terminer
                    <Check size={16} />
                  </>
                )
              ) : (
                <>
                  Continuer
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-ink-100 py-2 last:border-0">
      <div className="w-40 shrink-0 text-ink-400">{label}</div>
      <div className="text-ink-800">{value || <span className="text-ink-300">—</span>}</div>
    </div>
  )
}
