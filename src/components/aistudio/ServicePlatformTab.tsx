import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Eye,
  ImageIcon,
  Loader2,
  Pencil,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from 'lucide-react'
import {
  deleteGeneratedService,
  fetchGeneratedServices,
  fetchSuggestions,
  generateService,
  suggestServices,
  updateGeneratedService,
  type GeneratedService,
  type Platform,
  type SuggestedService,
} from '@/lib/aiStudioData'
import { ThumbnailModal } from './ThumbnailModal'
import { MarkdownView } from './MarkdownView'
import { MarkdownEditor } from './MarkdownEditor'

interface Props {
  userId: string
  platform: Platform
  onCredits: (n: number) => void
}

const potentialBadge: Record<string, string> = {
  high: 'bg-success-50 text-success-700',
  medium: 'bg-warn-50 text-warn-700',
  low: 'bg-ink-100 text-ink-500',
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export function ServicePlatformTab({ userId, platform, onCredits }: Props) {
  const cur = platform === 'fiverr' ? '$' : '€'
  const [suggestions, setSuggestions] = useState<SuggestedService[]>([])
  const [services, setServices] = useState<GeneratedService[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [writingId, setWritingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thumbFor, setThumbFor] = useState<GeneratedService | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(true)

  useEffect(() => {
    setSelectedId(null)
    fetchSuggestions(userId, platform).then(setSuggestions)
    fetchGeneratedServices(userId, platform).then(setServices)
  }, [userId, platform])

  const runSuggest = async () => {
    setLoadingSuggest(true)
    setError(null)
    const { data, error } = await suggestServices(platform)
    setLoadingSuggest(false)
    if (error || !data) return setError(error ?? 'Erreur.')
    setSuggestions(data.suggestions)
    onCredits(data.credits_remaining)
  }

  const chooseSuggestion = async (s: SuggestedService) => {
    setWritingId(s.id)
    setError(null)
    const { data, error } = await generateService(platform, s.id)
    setWritingId(null)
    if (error || !data) return setError(error ?? 'Erreur.')
    setServices((prev) => [data.service, ...prev])
    onCredits(data.credits_remaining)
    setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_selected: true } : x)))
    setSelectedId(data.service.id) // ouvre directement la fiche rédigée
    setSuggestOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const patchService = (svc: GeneratedService) =>
    setServices((prev) => prev.map((x) => (x.id === svc.id ? svc : x)))

  const removeService = async (id: string) => {
    if (!confirm('Supprimer ce service rédigé ?')) return
    await deleteGeneratedService(id)
    setServices((prev) => prev.filter((x) => x.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selected = selectedId ? services.find((s) => s.id === selectedId) ?? null : null

  return (
    <div className="space-y-6">
      {/* Étape 1 : suggestions (repliable pour ne pas encombrer) */}
      <section className="card">
        <button
          onClick={() => setSuggestOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-500" />
            <span className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Idées de services gagnants
            </span>
          </span>
          <ChevronDown size={16} className={`text-ink-400 transition ${suggestOpen ? 'rotate-180' : ''}`} />
        </button>

        {suggestOpen && (
          <div className="mt-4">
            <button onClick={runSuggest} disabled={loadingSuggest} className="btn-primary mb-4">
              {loadingSuggest ? (<><Loader2 size={15} className="animate-spin" />Analyse de ton profil…</>) : (<><Wand2 size={15} />Générer des idées adaptées à mon profil</>)}
            </button>

            {error && (
              <p className="mb-3 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">{error}</p>
            )}

            {suggestions.length === 0 ? (
              <p className="rounded border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">
                Clique sur « Générer des idées » — l’IA propose 8 à 10 services adaptés à ton profil (1 crédit).
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => chooseSuggestion(s)}
                    disabled={writingId !== null}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition ${
                      s.is_selected ? 'border-accent-500/40 bg-accent-500/5' : 'border-ink-100 bg-cream-50 hover:border-accent-500/40 hover:bg-cream-100'
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${potentialBadge[s.potential] ?? potentialBadge.medium}`}>
                        {s.potential === 'high' ? 'Fort potentiel' : s.potential === 'low' ? 'Faible' : 'Moyen'}
                      </span>
                      {s.is_selected && <Check size={14} className="text-accent-600" />}
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{s.title}</p>
                    {s.rationale && <p className="text-xs text-ink-500">{s.rationale}</p>}
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                      {s.category && <span className="rounded bg-cream-200 px-1.5 py-0.5">{s.category}</span>}
                      {s.price_min != null && (
                        <span className="font-mono text-accent-700">{s.price_min}{cur}–{s.price_max ?? s.price_min}{cur}</span>
                      )}
                    </div>
                    {writingId === s.id && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-accent-600">
                        <Loader2 size={12} className="animate-spin" />Rédaction en cours…
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Étape 2 : liste ↔ détail */}
      {selected ? (
        <ServiceDetail
          service={selected}
          cur={cur}
          platform={platform}
          onBack={() => setSelectedId(null)}
          onPatch={patchService}
          onDelete={() => removeService(selected.id)}
          onThumbnail={() => setThumbFor(selected)}
        />
      ) : (
        <section className="card !p-0">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Mes services rédigés ({services.length})
            </h2>
          </div>
          {services.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-400">
              Aucun service pour l’instant. Choisis une idée ci-dessus pour rédiger ta première fiche.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {services.map((svc) => (
                <li key={svc.id}>
                  <button
                    onClick={() => { setSelectedId(svc.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-cream-100"
                  >
                    {svc.thumbnail_url ? (
                      <img src={svc.thumbnail_url} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-cream-200 text-ink-300">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{svc.title}</p>
                      <p className="text-xs text-ink-400">
                        {fmtDate(svc.created_at)}
                        {svc.thumbnail_url ? ' · miniature ✓' : ' · sans miniature'}
                        {svc.price != null ? ` · ${svc.price}${cur}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-accent-600">Ouvrir →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {thumbFor && (
        <ThumbnailModal
          userId={userId}
          service={thumbFor}
          onClose={() => setThumbFor(null)}
          onGenerated={(url, credits) => {
            patchService({ ...thumbFor, thumbnail_url: url })
            onCredits(credits)
            setThumbFor(null)
          }}
        />
      )}
    </div>
  )
}

function ServiceDetail({
  service,
  cur,
  platform,
  onBack,
  onPatch,
  onDelete,
  onThumbnail,
}: {
  service: GeneratedService
  cur: string
  platform: Platform
  onBack: () => void
  onPatch: (s: GeneratedService) => void
  onDelete: () => void
  onThumbnail: () => void
}) {
  const [title, setTitle] = useState(service.title)
  const [description, setDescription] = useState(service.description)
  const [editMode, setEditMode] = useState(false)
  const [copied, setCopied] = useState(false)

  const raw = service.raw_generation_json
  const titleOptions: string[] = Array.isArray(raw?.titles?.options)
    ? (raw!.titles!.options as string[])
    : typeof raw?.titles?.options === 'string'
      ? (raw!.titles!.options as string).split('\n').map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean)
      : []

  const saveField = async (patch: Partial<GeneratedService>) => {
    const updated = await updateGeneratedService(service.id, patch)
    if (updated) onPatch(updated)
  }

  const copyAll = async () => {
    let out = `${title}\n\n${description}`
    if (platform === 'fiverr') {
      if (service.pricing_tiers?.length) out += '\n\n' + service.pricing_tiers.map((t) => `${t.tier.toUpperCase()} — ${t.price}${cur} (${t.delivery_days}j)\n${(t.features ?? []).join('\n')}`).join('\n\n')
      if (service.faq?.length) out += '\n\nFAQ\n' + service.faq.map((f) => `Q: ${f.question}\nR: ${f.answer}`).join('\n\n')
    }
    await navigator.clipboard.writeText(out)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800">
          <ArrowLeft size={15} />Retour à mes services
        </button>
        <div className="flex items-center gap-3">
          <button onClick={copyAll} className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
            {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copié' : 'Copier la fiche'}
          </button>
          <button onClick={onDelete} className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline">
            <Trash2 size={13} />Supprimer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500">Titre du service</label>
            <input
              className="input text-base font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== service.title && saveField({ title })}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-ink-500">Description ({platform === 'comeup' ? 'ComeUp' : 'Fiverr'})</label>
              {platform === 'fiverr' && (
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
                >
                  {editMode ? <><Eye size={12} />Aperçu</> : <><Pencil size={12} />Éditer</>}
                </button>
              )}
            </div>
            {platform === 'comeup' ? (
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                onBlur={(md) => md !== service.description && saveField({ description: md })}
                placeholder="Rédige ta fiche ComeUp ici…"
              />
            ) : editMode ? (
              <textarea
                className="input min-h-[280px] font-mono text-xs leading-relaxed"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => description !== service.description && saveField({ description })}
              />
            ) : (
              <div className="rounded-lg border border-ink-100 bg-cream-50 p-4">
                <MarkdownView content={description} />
              </div>
            )}
          </div>

          {/* Paliers Fiverr (spécifique) */}
          {platform === 'fiverr' && service.pricing_tiers?.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {service.pricing_tiers.map((t, i) => (
                <div key={i} className="rounded-lg border border-ink-100 bg-cream-100 p-3">
                  <p className="text-xs font-semibold uppercase text-ink-500">{t.tier}</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-accent-700">{t.price}{cur}</p>
                  <p className="text-xs text-ink-400">{t.delivery_days} jours</p>
                  <ul className="mt-2 space-y-1">
                    {(t.features ?? []).map((f, j) => (
                      <li key={j} className="text-xs text-ink-600">• {f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Mots-clés : à titre explicatif (SEO) */}
          {service.tags?.length > 0 && (
            <div className="rounded-lg border border-ink-100 bg-cream-100 p-3">
              <p className="mb-1.5 text-xs font-semibold text-ink-500">
                Mots-clés utilisés pour optimiser ton référencement {platform === 'comeup' ? 'ComeUp' : 'Fiverr'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {service.tags.map((t) => (
                  <span key={t} className="rounded-full bg-cream-200 px-2 py-0.5 text-xs text-ink-600">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Titres alternatifs : compact et optionnel */}
          {titleOptions.length > 0 && (
            <details className="group rounded-lg border border-ink-100 bg-cream-50 p-3">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-ink-500">
                Voir {titleOptions.length} titres alternatifs
                <ChevronDown size={13} className="transition group-open:rotate-180" />
              </summary>
              <div className="mt-2 space-y-1">
                {titleOptions.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setTitle(t); saveField({ title: t }) }}
                    className={`block w-full rounded border px-2.5 py-1.5 text-left text-xs transition ${t === title ? 'border-accent-500 bg-accent-500/5 text-accent-700' : 'border-ink-100 bg-cream-50 text-ink-700 hover:border-accent-500/40'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Miniature */}
        <div className="w-full shrink-0 md:w-64">
          <label className="mb-1.5 block text-xs font-medium text-ink-500">Miniature</label>
          {service.thumbnail_url ? (
            <div className="space-y-2">
              <img src={service.thumbnail_url} alt="" className="aspect-[3/2] w-full rounded-lg border border-ink-100 object-cover" />
              <button onClick={onThumbnail} className="btn-secondary w-full text-xs">
                <ImageIcon size={13} />Regénérer (3 crédits)
              </button>
            </div>
          ) : (
            <button
              onClick={onThumbnail}
              className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 bg-cream-100 text-ink-400 transition hover:border-accent-500 hover:bg-accent-50"
            >
              <Star size={22} />
              <span className="text-xs font-medium">Générer la miniature</span>
              <span className="text-[10px]">3 crédits</span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
