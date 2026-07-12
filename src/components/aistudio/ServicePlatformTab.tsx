import { useEffect, useState } from 'react'
import {
  Check,
  Copy,
  ImageIcon,
  Loader2,
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

export function ServicePlatformTab({ userId, platform, onCredits }: Props) {
  const cur = platform === 'fiverr' ? '$' : '€'
  const [suggestions, setSuggestions] = useState<SuggestedService[]>([])
  const [services, setServices] = useState<GeneratedService[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [writingId, setWritingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thumbFor, setThumbFor] = useState<GeneratedService | null>(null)

  useEffect(() => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const patchService = (svc: GeneratedService) =>
    setServices((prev) => prev.map((x) => (x.id === svc.id ? svc : x)))

  const removeService = async (id: string) => {
    if (!confirm('Supprimer ce service rédigé ?')) return
    await deleteGeneratedService(id)
    setServices((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Étape 1 : suggestions */}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Idées de services gagnants
            </h2>
          </div>
          <button onClick={runSuggest} disabled={loadingSuggest} className="btn-primary">
            {loadingSuggest ? (<><Loader2 size={15} className="animate-spin" />Analyse de ton profil…</>) : (<><Wand2 size={15} />Générer des idées adaptées à mon profil</>)}
          </button>
        </div>

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
      </section>

      {/* Étapes 2 & 3 : services rédigés */}
      {services.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Mes services rédigés ({services.length})
          </h2>
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              cur={cur}
              platform={platform}
              onPatch={patchService}
              onDelete={() => removeService(svc.id)}
              onThumbnail={() => setThumbFor(svc)}
            />
          ))}
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

function ServiceCard({
  service,
  cur,
  platform,
  onPatch,
  onDelete,
  onThumbnail,
}: {
  service: GeneratedService
  cur: string
  platform: Platform
  onPatch: (s: GeneratedService) => void
  onDelete: () => void
  onThumbnail: () => void
}) {
  const [title, setTitle] = useState(service.title)
  const [description, setDescription] = useState(service.description)
  const [copied, setCopied] = useState(false)

  const saveField = async (patch: Partial<GeneratedService>) => {
    const updated = await updateGeneratedService(service.id, patch)
    if (updated) onPatch(updated)
  }

  const copyAll = async () => {
    const tiers = service.pricing_tiers?.length
      ? '\n\n' + service.pricing_tiers.map((t) => `${t.tier.toUpperCase()} — ${t.price}${cur} (${t.delivery_days}j)\n${(t.features ?? []).join('\n')}`).join('\n\n')
      : ''
    const faq = service.faq?.length ? '\n\nFAQ\n' + service.faq.map((f) => `Q: ${f.question}\nR: ${f.answer}`).join('\n\n') : ''
    const tags = service.tags?.length ? `\n\nTags : ${service.tags.join(', ')}` : ''
    await navigator.clipboard.writeText(`${title}\n\n${description}${tiers}${faq}${tags}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <input
            className="input text-base font-semibold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== service.title && saveField({ title })}
          />
          <textarea
            className="input min-h-[160px] text-sm leading-relaxed"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== service.description && saveField({ description })}
          />

          {platform === 'fiverr' && service.pricing_tiers?.length > 0 ? (
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
          ) : (
            service.price != null && (
              <p className="font-mono text-sm text-accent-700">Prix conseillé : {service.price}{cur}</p>
            )
          )}

          {service.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {service.tags.map((t) => (
                <span key={t} className="rounded-full bg-cream-200 px-2 py-0.5 text-xs text-ink-600">{t}</span>
              ))}
            </div>
          )}

          {service.faq?.length > 0 && (
            <details className="rounded-lg border border-ink-100 bg-cream-100 p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase text-ink-500">FAQ ({service.faq.length})</summary>
              <div className="mt-2 space-y-2">
                {service.faq.map((f, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-ink-800">{f.question}</p>
                    <p className="text-xs text-ink-500">{f.answer}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button onClick={copyAll} className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
              {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copié' : 'Tout copier'}
            </button>
            <button onClick={onDelete} className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:underline">
              <Trash2 size={13} />Supprimer
            </button>
          </div>
        </div>

        {/* Miniature */}
        <div className="w-full shrink-0 md:w-56">
          {service.thumbnail_url ? (
            <div className="space-y-2">
              <img src={service.thumbnail_url} alt="" className="aspect-[3/2] w-full rounded-lg border border-ink-100 object-cover" />
              <button onClick={onThumbnail} className="btn-secondary w-full text-xs">
                <ImageIcon size={13} />Regénérer
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
    </div>
  )
}
