import { FormEvent, useEffect, useState } from 'react'
import {
  Building2,
  Check,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Radar,
  Search,
  UserPlus,
  Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuthStore } from '@/stores/authStore'
import {
  BUSINESS_CATEGORIES,
  categoryLabel,
  convertResultToProspect,
  fetchCredits,
  fetchSearchHistory,
  fetchSearchResults,
  markContacted,
  runBusinessSearch,
  type LeadResult,
  type LeadSearch,
} from '@/lib/leadSearchData'
import { EmailModal } from '@/components/leadsearch/EmailModal'

export function LeadSearchPage() {
  const user = useAuthStore((s) => s.user)

  const [credits, setCredits] = useState<number | null>(null)
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('restaurant')
  const [excludeWithWebsite, setExcludeWithWebsite] = useState(true)

  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<LeadResult[]>([])
  const [lastSearchLabel, setLastSearchLabel] = useState<string | null>(null)

  const [history, setHistory] = useState<LeadSearch[]>([])
  const [emailTarget, setEmailTarget] = useState<LeadResult | null>(null)
  const [busyRow, setBusyRow] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchCredits(user.id).then(setCredits)
    fetchSearchHistory(user.id).then(setHistory)
  }, [user])

  const canSearch =
    !!city.trim() && !searching && credits !== null && credits >= 1

  const launch = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSearch) return
    setSearching(true)
    setError(null)
    setResults([])
    const { data, error } = await runBusinessSearch({
      city: city.trim(),
      category,
      exclude_with_website: excludeWithWebsite,
    })
    setSearching(false)
    if (error || !data) {
      setError(error ?? 'Recherche impossible.')
      return
    }
    setResults(data.results)
    setCredits(data.credits_remaining)
    setLastSearchLabel(
      `${categoryLabel(category)} · ${city.trim()} — ${data.results_count} résultat${
        data.results_count > 1 ? 's' : ''
      } (${data.credits_spent} crédit${data.credits_spent > 1 ? 's' : ''})`,
    )
    if (user) fetchSearchHistory(user.id).then(setHistory)
  }

  const openHistory = async (s: LeadSearch) => {
    setError(null)
    const rows = await fetchSearchResults(s.id)
    setResults(rows)
    setLastSearchLabel(
      `${categoryLabel(s.category)} · ${s.city} — ${s.results_count} résultat${
        s.results_count > 1 ? 's' : ''
      } (le ${format(new Date(s.created_at), 'd MMM', { locale: fr })})`,
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const patchResult = (updated: LeadResult) =>
    setResults((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))

  const onWhatsApp = async (r: LeadResult) => {
    if (!r.phone || !user) return
    const digits = r.phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener')
    setBusyRow(r.id)
    const { result } = await markContacted(user.id, r, 'whatsapp')
    if (result) patchResult(result)
    setBusyRow(null)
  }

  const onAddToCrm = async (r: LeadResult) => {
    if (!user) return
    setBusyRow(r.id)
    const { prospectId } = await convertResultToProspect(user.id, r, 'other')
    if (prospectId) patchResult({ ...r, converted_to_prospect_id: prospectId })
    setBusyRow(null)
  }

  const onEmailSent = async () => {
    if (!emailTarget || !user) return
    const target = emailTarget
    setEmailTarget(null)
    const { result } = await markContacted(user.id, target, 'email')
    if (result) patchResult(result)
  }

  const creditsLow = credits !== null && credits < 1

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            Recherche de prospects
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Trouve des commerces à démarcher et ajoute-les à ton CRM en un clic.
          </p>
        </div>
        <CreditsBadge credits={credits} />
      </header>

      {/* -------------------------------------------------- Formulaire */}
      <form onSubmit={launch} className="card mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label">Ville</label>
            <div className="relative">
              <MapPin
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300"
              />
              <input
                className="input pl-9"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex : Roubaix"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Type de commerce</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!canSearch}
              className="btn-primary h-[42px] w-full md:w-auto"
            >
              {searching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Recherche…
                </>
              ) : (
                <>
                  <Search size={16} />
                  Lancer la recherche
                </>
              )}
            </button>
          </div>
        </div>

        <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={excludeWithWebsite}
            onChange={(e) => setExcludeWithWebsite(e.target.checked)}
            className="h-4 w-4 accent-[#7F56D9]"
          />
          Sans site web uniquement
          <span className="text-xs text-ink-400">
            (les meilleurs prospects pour une prestation web)
          </span>
        </label>

        {creditsLow && (
          <p className="mt-4 rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-sm text-warn-700">
            Tu as utilisé tes 20 recherches offertes. L'achat de crédits
            supplémentaires arrivera bientôt.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}
      </form>

      {/* -------------------------------------------------- Résultats */}
      {searching ? (
        <div className="card">
          <div className="flex items-center justify-center gap-3 py-12 text-ink-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">
              Interrogation d'OpenStreetMap et de l'annuaire des entreprises…
            </span>
          </div>
        </div>
      ) : results.length > 0 ? (
        <section className="card overflow-hidden !p-0">
          {lastSearchLabel && (
            <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3 text-sm text-ink-500">
              <Building2 size={15} className="text-ink-400" />
              {lastSearchLabel}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3 font-medium">Entreprise</th>
                  <th className="px-3 py-3 font-medium">Dirigeant</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Adresse</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <ResultRow
                    key={r.id}
                    result={r}
                    busy={busyRow === r.id}
                    onEmail={() => setEmailTarget(r)}
                    onWhatsApp={() => onWhatsApp(r)}
                    onAddToCrm={() => onAddToCrm(r)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-200 text-ink-400">
            <Radar size={22} />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            Lance ta première recherche
          </h3>
          <p className="max-w-md text-sm text-ink-500">
            Ex : « Restaurant · Roubaix · sans site web ». Tu obtiendras une
            liste de commerces à contacter par email ou WhatsApp.
          </p>
        </section>
      )}

      {/* -------------------------------------------------- Historique */}
      {history.length > 0 && (
        <section className="card mt-6">
          <div className="mb-4 flex items-center gap-2">
            <History size={16} className="text-ink-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Historique des recherches
            </h2>
          </div>
          <ul className="divide-y divide-ink-100">
            {history.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">
                    {categoryLabel(s.category)} · {s.city}
                  </p>
                  <p className="text-xs text-ink-400">
                    {format(new Date(s.created_at), "d MMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}{' '}
                    · {s.results_count} résultat{s.results_count > 1 ? 's' : ''}{' '}
                    · {s.credits_spent} crédit{s.credits_spent > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => openHistory(s)}
                  className="shrink-0 text-xs font-medium text-accent-600 hover:underline"
                >
                  Revoir les résultats
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {emailTarget && user && (
        <EmailModal
          userId={user.id}
          result={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={onEmailSent}
        />
      )}
    </div>
  )
}

function CreditsBadge({ credits }: { credits: number | null }) {
  const low = credits !== null && credits <= 3
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 ${
        low
          ? 'border-warn-200 bg-warn-50 text-warn-700'
          : 'border-ink-100 bg-cream-100 text-ink-700'
      }`}
    >
      <Zap size={15} className={low ? 'text-warn-600' : 'text-accent-500'} />
      <span className="text-sm">
        <span className="font-mono font-semibold">
          {credits === null ? '—' : credits}
        </span>{' '}
        crédit{credits === 1 ? '' : 's'} restant{credits === 1 ? '' : 's'}
      </span>
    </div>
  )
}

function ResultRow({
  result: r,
  busy,
  onEmail,
  onWhatsApp,
  onAddToCrm,
}: {
  result: LeadResult
  busy: boolean
  onEmail: () => void
  onWhatsApp: () => void
  onAddToCrm: () => void
}) {
  const inCrm = !!r.converted_to_prospect_id

  return (
    <tr
      className={`border-b border-ink-100 last:border-0 ${
        r.contacted ? 'bg-cream-100/60 text-ink-400' : ''
      }`}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {r.contacted && <Check size={14} className="shrink-0 text-success-500" />}
          <span className="font-medium text-ink-800">{r.business_name}</span>
        </div>
        {r.contacted && (
          <span className="text-xs text-ink-400">
            Contacté ({r.contact_method === 'whatsapp' ? 'WhatsApp' : 'email'})
          </span>
        )}
        {!r.contacted && inCrm && (
          <span className="text-xs text-accent-600">Ajouté au CRM</span>
        )}
      </td>
      <td className="px-3 py-3">
        {r.owner_name ? (
          <span className="text-ink-700">{r.owner_name}</span>
        ) : (
          <span className="text-ink-300">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        {r.phone ? (
          <span className="inline-flex items-center gap-1 text-ink-700">
            <Phone size={12} className="text-ink-400" />
            {r.phone}
          </span>
        ) : (
          <span className="text-ink-300">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className="text-xs text-ink-500">{r.address ?? '—'}</span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={onEmail}
            disabled={busy}
            title="Envoyer un email"
            className="flex h-8 w-8 items-center justify-center rounded border border-ink-200 text-ink-500 transition hover:border-accent-500 hover:text-accent-600 disabled:opacity-40"
          >
            <Mail size={14} />
          </button>
          <button
            onClick={onWhatsApp}
            disabled={busy || !r.phone}
            title={r.phone ? 'Contacter sur WhatsApp' : 'Aucun téléphone'}
            className="flex h-8 w-8 items-center justify-center rounded border border-ink-200 text-ink-500 transition hover:border-success-500 hover:text-success-600 disabled:opacity-40"
          >
            <MessageCircle size={14} />
          </button>
          <button
            onClick={onAddToCrm}
            disabled={busy || inCrm}
            title={inCrm ? 'Déjà dans le CRM' : 'Ajouter au CRM'}
            className="flex h-8 items-center gap-1 rounded border border-ink-200 px-2 text-xs font-medium text-ink-600 transition hover:border-accent-500 hover:text-accent-600 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <UserPlus size={13} />
            )}
            CRM
          </button>
        </div>
      </td>
    </tr>
  )
}
