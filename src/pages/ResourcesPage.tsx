import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  GraduationCap,
  Search,
  Sparkles,
  Wand2,
  Wrench,
} from 'lucide-react'
import {
  RESOURCE_TYPES,
  fetchPublishedResources,
  uniqueCategories,
  type Resource,
  type ResourceType,
} from '@/lib/resourcesData'

const TYPE_ICON: Record<ResourceType, typeof BookOpen> = {
  ebook: BookOpen,
  tool: Wrench,
  prompt: Wand2,
  training: GraduationCap,
}

export function ResourcesPage() {
  const [tab, setTab] = useState<ResourceType>('ebook')
  const [items, setItems] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchPublishedResources().then((r) => {
      setItems(r)
      setLoading(false)
    })
  }, [])

  const byTab = useMemo(() => items.filter((it) => it.type === tab), [items, tab])
  const categoriesForTab = useMemo(() => uniqueCategories(byTab), [byTab])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return byTab.filter((it) => {
      if (category !== 'all' && (it.category ?? '') !== category) return false
      if (!q) return true
      return (
        it.title.toLowerCase().includes(q) ||
        (it.description ?? '').toLowerCase().includes(q) ||
        (it.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [byTab, category, search])

  const countsByType = useMemo(() => {
    const m = new Map<ResourceType, number>()
    for (const r of items) m.set(r.type, (m.get(r.type) ?? 0) + 1)
    return m
  }, [items])

  const switchTab = (t: ResourceType) => {
    setTab(t)
    setCategory('all')
    setSearch('')
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900">Ressources</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ebooks, outils, prompts et formations sélectionnés pour t'aider à mieux vendre et livrer.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RESOURCE_TYPES.map((t) => {
          const Icon = TYPE_ICON[t.value]
          const active = tab === t.value
          const count = countsByType.get(t.value) ?? 0
          return (
            <button
              key={t.value}
              onClick={() => switchTab(t.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                active
                  ? 'border-accent-500 bg-accent-500/5 text-ink-900'
                  : 'border-ink-100 bg-cream-50 text-ink-500 hover:bg-cream-100'
              }`}
            >
              <Icon size={17} className={active ? 'text-accent-600' : 'text-ink-400'} />
              <span className="flex-1 text-left">{t.plural}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-accent-500/10 text-accent-700' : 'bg-cream-200 text-ink-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {byTab.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="input pl-9 text-sm"
            />
          </div>
          {categoriesForTab.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setCategory('all')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  category === 'all' ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-500 hover:bg-cream-200'
                }`}
              >
                Toutes
              </button>
              {categoriesForTab.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    category === c ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-500 hover:bg-cream-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-ink-100 bg-cream-50 py-16 text-center text-sm text-ink-400">
          Chargement…
        </div>
      ) : byTab.length === 0 ? (
        <EmptyState type={tab} />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 py-12 text-center text-sm text-ink-400">
          Aucune ressource ne correspond à ta recherche.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Carte ressource — rendu adapté au type
// ---------------------------------------------------------------------------
function ResourceCard({ resource }: { resource: Resource }) {
  const Icon = TYPE_ICON[resource.type]
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!resource.content_text) return
    try {
      await navigator.clipboard.writeText(resource.content_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      alert("Impossible d'accéder au presse-papiers.")
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-ink-100 bg-cream-50 transition hover:border-accent-500/40">
      {resource.type === 'ebook' || resource.type === 'training' ? (
        resource.cover_url ? (
          <img src={resource.cover_url} alt="" className="aspect-[16/10] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-accent-500/10 to-cream-200">
            <Icon size={40} className="text-accent-500/70" />
          </div>
        )
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          {(resource.type === 'tool' || resource.type === 'prompt') && (
            resource.cover_url ? (
              <img src={resource.cover_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-accent-500/10 text-accent-600">
                <Icon size={18} />
              </span>
            )
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-ink-900">{resource.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
              {resource.category && (
                <span className="rounded bg-cream-200 px-1.5 py-0.5">{resource.category}</span>
              )}
              {resource.type === 'training' && resource.duration_minutes != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock size={11} />
                  {resource.duration_minutes} min
                </span>
              )}
            </div>
          </div>
        </div>

        {resource.description && (
          <p className="text-xs leading-relaxed text-ink-600">{resource.description}</p>
        )}

        {resource.type === 'prompt' && resource.content_text && (
          <div className="rounded border border-ink-100 bg-cream-100 p-2.5">
            <p className="line-clamp-4 font-mono text-[11px] leading-relaxed text-ink-600">
              {resource.content_text}
            </p>
          </div>
        )}

        <div className="mt-auto pt-1">
          {resource.type === 'ebook' && resource.content_url && (
            <a
              href={resource.content_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-xs"
            >
              <Download size={13} />
              Télécharger le PDF
            </a>
          )}
          {resource.type === 'tool' && resource.content_url && (
            <a
              href={resource.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-xs"
            >
              <ExternalLink size={13} />
              Ouvrir l'outil
            </a>
          )}
          {resource.type === 'prompt' && (
            <button onClick={handleCopy} className="btn-primary w-full text-xs">
              {copied ? (
                <>
                  <Check size={13} />
                  Copié !
                </>
              ) : (
                <>
                  <Copy size={13} />
                  Copier le prompt
                </>
              )}
            </button>
          )}
          {resource.type === 'training' && resource.content_url && (
            <a
              href={resource.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-xs"
            >
              <GraduationCap size={13} />
              Suivre la formation
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function EmptyState({ type }: { type: ResourceType }) {
  const t = RESOURCE_TYPES.find((x) => x.value === type)
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-cream-50 py-16 text-center">
      <Sparkles size={26} className="mx-auto text-ink-300" />
      <p className="mt-3 text-sm font-medium text-ink-700">
        Aucune ressource « {t?.plural.toLowerCase()} » pour le moment
      </p>
      <p className="mt-1 text-xs text-ink-500">
        L'admin ajoutera bientôt des ressources dans cette catégorie.
      </p>
    </div>
  )
}
