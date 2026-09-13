import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Eye,
  ImageIcon,
  Loader2,
  Pencil,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
  ZoomIn,
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
import { PlatformIcon } from './PlatformIcon'

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
  const [previewSuggestion, setPreviewSuggestion] = useState<SuggestedService | null>(null)

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

  const chooseSuggestion = async (s: SuggestedService, customInstructions?: string) => {
    setWritingId(s.id)
    setError(null)
    const { data, error } = await generateService(platform, s.id, customInstructions)
    setWritingId(null)
    if (error || !data) return setError(error ?? 'Erreur.')
    setServices((prev) => [data.service, ...prev])
    onCredits(data.credits_remaining)
    setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_selected: true } : x)))
    setPreviewSuggestion(null) // ferme la page de preview si ouverte
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

  // Vue "page dédiée" pour une suggestion sélectionnée : elle prend toute la place,
  // masque la liste des suggestions et des services rédigés en dessous.
  if (previewSuggestion) {
    return (
      <SuggestionDetailPage
        suggestion={previewSuggestion}
        platform={platform}
        cur={cur}
        writing={writingId === previewSuggestion.id}
        onBack={() => setPreviewSuggestion(null)}
        onWrite={(instructions) => chooseSuggestion(previewSuggestion, instructions)}
      />
    )
  }

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
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-100 bg-cream-50">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setPreviewSuggestion(s)}
                      disabled={writingId !== null}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${potentialBadge[s.potential] ?? potentialBadge.medium}`}>
                        {s.potential === 'high' ? 'Fort' : s.potential === 'low' ? 'Faible' : 'Moyen'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">{s.title}</span>
                      {s.is_selected && <Check size={14} className="shrink-0 text-accent-600" />}
                      {writingId === s.id ? (
                        <Loader2 size={14} className="shrink-0 animate-spin text-accent-600" />
                      ) : (
                        <ArrowRight size={14} className="shrink-0 text-ink-300" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
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

// ---------------------------------------------------------------------------
// Page dédiée d'une suggestion de service — remplace l'ancien popup.
// Contient : détails de l'idée, bloc "veille concurrentielle" avec liens
// directs vers la recherche marketplace + Pinterest, textarea de consignes
// personnalisées, puis CTA "Rédiger la description".
// ---------------------------------------------------------------------------
function SuggestionDetailPage({
  suggestion,
  platform,
  cur,
  writing,
  onBack,
  onWrite,
}: {
  suggestion: SuggestedService
  platform: Platform
  cur: string
  writing: boolean
  onBack: () => void
  onWrite: (customInstructions: string) => void
}) {
  const [instructions, setInstructions] = useState('')

  const potentialLabel =
    suggestion.potential === 'high'
      ? 'Fort potentiel'
      : suggestion.potential === 'low'
        ? 'Faible potentiel'
        : 'Potentiel moyen'

  // Requête à passer aux moteurs de recherche des marketplaces.
  // Le titre suggéré démarre souvent par "Je vais / I will …", qu'on retire
  // pour ne garder que la matière recherchable.
  const searchQuery = suggestion.title
    .replace(/^(je vais|i will)\s+/i, '')
    .trim()
    .slice(0, 100)
  const q = encodeURIComponent(searchQuery)
  const marketplaceLabel = platform === 'fiverr' ? 'Fiverr' : 'ComeUp'
  const marketplaceUrl =
    platform === 'fiverr'
      ? `https://fr.fiverr.com/search/gigs?query=${q}`
      : `https://comeup.com/fr/search/services?q=${q}`

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        disabled={writing}
        className="inline-flex items-center gap-1 text-sm text-ink-500 transition hover:text-ink-800 disabled:opacity-50"
      >
        <ArrowLeft size={15} />
        Retour aux idées
      </button>

      <section className="card space-y-5">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <Sparkles size={13} className="text-accent-500" />
            Idée de service {marketplaceLabel}
          </p>
          <h1 className="text-xl font-semibold leading-tight text-ink-900 sm:text-2xl">
            {suggestion.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${potentialBadge[suggestion.potential] ?? potentialBadge.medium}`}
            >
              {potentialLabel}
            </span>
            {suggestion.category && (
              <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-600">
                {suggestion.category}
              </span>
            )}
            {suggestion.price_min != null && (
              <span className="rounded-full bg-ink-100 px-2.5 py-0.5 font-mono text-xs text-ink-800">
                {suggestion.price_min}
                {cur}
                {suggestion.price_max != null && suggestion.price_max !== suggestion.price_min
                  ? `–${suggestion.price_max}${cur}`
                  : ''}
              </span>
            )}
            {suggestion.is_selected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2.5 py-0.5 text-xs text-accent-700">
                <Check size={12} />
                Déjà rédigé
              </span>
            )}
          </div>
        </div>

        {suggestion.rationale && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Pourquoi ce service
            </p>
            <p className="text-sm leading-relaxed text-ink-700">{suggestion.rationale}</p>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Veille concurrentielle</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Regarde ce que font les top-vendeurs sur ce type de service avant de rédiger ta fiche. Tu peux t'inspirer de leur structure, leurs packs, leur positionnement.
          </p>
        </div>
        <a
          href={marketplaceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3 transition hover:border-accent-500/40 hover:bg-cream-100"
        >
          <PlatformIcon platform={platform} size={28} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-medium text-ink-800">
              Voir les top-vendeurs sur {marketplaceLabel}
              <ExternalLink size={12} className="text-ink-400" />
            </p>
            <p className="mt-0.5 truncate text-xs text-ink-500">« {searchQuery} »</p>
          </div>
        </a>
      </section>

      <section className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Consignes personnalisées (optionnel)</p>
          <p className="mt-0.5 text-xs text-ink-500">
            Ajoute des instructions pour orienter la rédaction : angle, ton, tarifs, expertise particulière, exemples de packs à créer, éléments à mettre en avant…
          </p>
        </div>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={writing}
          className="input min-h-[110px] text-sm leading-relaxed"
          placeholder={`Exemples :
• Insiste sur mon expertise Next.js et cite Shopify Hydrogen
• Prix de base à 80€, pack premium à 500€
• Ajoute un pack "AUDIT + FIX" à 250€
• Ton plus premium, éviter le vocabulaire "startup"`}
        />
        <p className="text-[11px] text-ink-400">
          {instructions.length > 0 ? `${instructions.length} caractères — l'IA en tiendra compte` : 'Laisse vide pour laisser l\'IA décider.'}
        </p>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-100 bg-cream-50/95 p-4 shadow-lg backdrop-blur">
        <p className="text-xs text-ink-500">
          Coût : <span className="font-mono font-semibold text-ink-800">{platform === 'comeup' ? '2 crédits' : '1 crédit'}</span>
          {' · '}
          L'IA génère titre, description, packs, options, FAQ, miniature-concept.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onBack} disabled={writing} className="btn-secondary">
            Annuler
          </button>
          <button onClick={() => onWrite(instructions)} disabled={writing} className="btn-primary">
            {writing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Rédaction…
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Rédiger la description
              </>
            )}
          </button>
        </div>
      </div>
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
  const [lightboxOpen, setLightboxOpen] = useState(false)

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
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="group relative block aspect-[3/2] w-full overflow-hidden rounded-lg border border-ink-100"
                aria-label="Agrandir la miniature"
              >
                <img
                  src={service.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-ink-900/0 text-white opacity-0 transition group-hover:bg-ink-900/40 group-hover:opacity-100">
                  <ZoomIn size={22} />
                </span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onThumbnail}
                  className="btn-secondary flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  title="Générer une nouvelle version (3 crédits)"
                >
                  <ImageIcon size={12} />
                  Regénérer
                </button>
                <a
                  href={service.thumbnail_url}
                  download={`${slugFromTitle(service.title)}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  title="Télécharger l'image PNG"
                >
                  <Download size={12} />
                  Télécharger
                </a>
              </div>
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

      {lightboxOpen && service.thumbnail_url && (
        <ImageLightbox
          src={service.thumbnail_url}
          alt={service.title}
          downloadName={`${slugFromTitle(service.title)}.png`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Lightbox : miniature agrandie plein écran, avec bouton fermer + télécharger.
// Ferme sur Échap ou clic sur le fond noir.
// ---------------------------------------------------------------------------
function ImageLightbox({
  src,
  alt,
  downloadName,
  onClose,
}: {
  src: string
  alt: string
  downloadName: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Miniature agrandie"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full max-w-5xl flex-col gap-3"
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[80vh] w-auto rounded-lg border border-ink-700 object-contain shadow-2xl"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-ink-200">{alt}</p>
          <div className="flex items-center gap-2">
            <a
              href={src}
              download={downloadName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
            >
              <Download size={13} />
              Télécharger
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
            >
              <X size={13} />
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Slug propre pour le nom de fichier téléchargé.
function slugFromTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/^(je vais|i will)\s+/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'miniature'
  )
}
