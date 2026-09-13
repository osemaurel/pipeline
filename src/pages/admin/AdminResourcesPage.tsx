import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Wand2,
  Wrench,
  X,
} from 'lucide-react'
import {
  RESOURCE_TYPES,
  createResource,
  deleteResource,
  fetchAllResources,
  toggleResourcePublished,
  updateResource,
  uploadResourceFile,
  type Resource,
  type ResourceInput,
  type ResourceType,
} from '@/lib/resourcesData'

const TYPE_ICON: Record<ResourceType, typeof BookOpen> = {
  ebook: BookOpen,
  tool: Wrench,
  prompt: Wand2,
  training: GraduationCap,
}

const TYPE_COLOR: Record<ResourceType, string> = {
  ebook: 'bg-accent-500/10 text-accent-700',
  tool: 'bg-warn-50 text-warn-700',
  prompt: 'bg-success-50 text-success-700',
  training: 'bg-ink-100 text-ink-700',
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export function AdminResourcesPage() {
  const [items, setItems] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ResourceType>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Resource | null>(null)
  const [creating, setCreating] = useState<ResourceType | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchAllResources().then((r) => {
      setItems(r)
      setLoading(false)
    })
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (filter !== 'all' && it.type !== filter) return false
      if (!q) return true
      return (
        it.title.toLowerCase().includes(q) ||
        (it.description ?? '').toLowerCase().includes(q) ||
        (it.category ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, filter, search])

  const patch = (r: Resource) => setItems((prev) => prev.map((x) => (x.id === r.id ? r : x)))
  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id))
  const add = (r: Resource) => setItems((prev) => [r, ...prev])

  const handleDelete = async (r: Resource) => {
    if (!confirm(`Supprimer « ${r.title} » ?`)) return
    const { error } = await deleteResource(r.id)
    if (error) return alert(error)
    remove(r.id)
  }

  const handleToggle = async (r: Resource) => {
    const next = !r.is_published
    const { error } = await toggleResourcePublished(r.id, next)
    if (error) return alert(error)
    patch({ ...r, is_published: next })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Ressources</h1>
          <p className="mt-1 text-sm text-ink-500">
            Contenu géré par l'admin, affiché aux utilisateurs dans leur onglet Ressources.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RESOURCE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setCreating(t.value)}
              className="btn-primary flex items-center gap-1.5 !px-3 !py-2 text-xs"
            >
              <Plus size={13} />
              Nouveau {t.label.toLowerCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded border border-ink-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              filter === 'all' ? 'bg-ink-900 text-white' : 'bg-cream-50 text-ink-500 hover:bg-cream-100'
            }`}
          >
            Tous ({items.length})
          </button>
          {RESOURCE_TYPES.map((t) => {
            const count = items.filter((it) => it.type === t.value).length
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`border-l border-ink-200 px-3 py-1.5 text-xs font-medium transition ${
                  filter === t.value ? 'bg-ink-900 text-white' : 'bg-cream-50 text-ink-500 hover:bg-cream-100'
                }`}
              >
                {t.plural} ({count})
              </button>
            )
          })}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un titre, une description, une catégorie…"
            className="input pl-9 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-ink-100 bg-cream-50 py-16 text-center text-sm text-ink-400">
          Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          Aucune ressource. Utilise les boutons ci-dessus pour en créer une.
        </div>
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-100 bg-cream-50">
          {visible.map((r) => {
            const Icon = TYPE_ICON[r.type]
            return (
              <li key={r.id} className="flex items-center gap-4 p-4">
                {r.cover_url ? (
                  <img src={r.cover_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded ${TYPE_COLOR[r.type]}`}>
                    <Icon size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{r.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_COLOR[r.type]}`}>
                      {RESOURCE_TYPES.find((t) => t.value === r.type)?.label}
                    </span>
                    {r.category && (
                      <span className="rounded bg-cream-200 px-1.5 py-0.5 text-[10px] text-ink-600">{r.category}</span>
                    )}
                    {!r.is_published && (
                      <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-500">
                        Brouillon
                      </span>
                    )}
                  </div>
                  {r.description && <p className="mt-0.5 truncate text-xs text-ink-500">{r.description}</p>}
                  <p className="mt-0.5 text-[11px] text-ink-400">Mis à jour le {fmtDate(r.updated_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(r)}
                    className="rounded p-2 text-ink-500 hover:bg-cream-100 hover:text-ink-800"
                    title={r.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {r.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={() => setEditing(r)}
                    className="rounded p-2 text-ink-500 hover:bg-cream-100 hover:text-ink-800"
                    title="Éditer"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="rounded p-2 text-danger-500 hover:bg-danger-50"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(creating || editing) && (
        <ResourceFormModal
          initialType={creating ?? editing!.type}
          existing={editing}
          onClose={() => {
            setCreating(null)
            setEditing(null)
          }}
          onSaved={(saved) => {
            if (editing) patch(saved)
            else add(saved)
            setCreating(null)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal formulaire — création + édition d'une ressource
// ---------------------------------------------------------------------------
function ResourceFormModal({
  initialType,
  existing,
  onClose,
  onSaved,
}: {
  initialType: ResourceType
  existing: Resource | null
  onClose: () => void
  onSaved: (r: Resource) => void
}) {
  const [type, setType] = useState<ResourceType>(existing?.type ?? initialType)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [contentUrl, setContentUrl] = useState(existing?.content_url ?? '')
  const [contentText, setContentText] = useState(existing?.content_text ?? '')
  const [coverUrl, setCoverUrl] = useState(existing?.cover_url ?? '')
  const [duration, setDuration] = useState<string>(
    existing?.duration_minutes != null ? String(existing.duration_minutes) : '',
  )
  const [category, setCategory] = useState(existing?.category ?? '')
  const [displayOrder, setDisplayOrder] = useState<string>(String(existing?.display_order ?? 0))
  const [isPublished, setIsPublished] = useState(existing?.is_published ?? false)

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coverInput = useRef<HTMLInputElement>(null)
  const pdfInput = useRef<HTMLInputElement>(null)

  const isEbook = type === 'ebook'
  const isTool = type === 'tool'
  const isPrompt = type === 'prompt'
  const isTraining = type === 'training'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Le titre est requis.')
    if ((isTool || isTraining) && !contentUrl.trim()) return setError("L'URL est requise.")
    if (isEbook && !contentUrl.trim()) return setError('Le PDF (URL) est requis.')
    if (isPrompt && !contentText.trim()) return setError('Le texte du prompt est requis.')

    const payload: ResourceInput = {
      type,
      title: title.trim(),
      description: description.trim() || null,
      cover_url: coverUrl.trim() || null,
      content_url: contentUrl.trim() || null,
      content_text: contentText.trim() || null,
      duration_minutes: isTraining && duration ? Number(duration) : null,
      category: category.trim() || null,
      is_published: isPublished,
      display_order: Number(displayOrder) || 0,
    }

    setSaving(true)
    if (existing) {
      const { data, error } = await updateResource(existing.id, payload)
      setSaving(false)
      if (error || !data) return setError(error ?? 'Erreur.')
      onSaved(data)
    } else {
      const { data, error } = await createResource(payload)
      setSaving(false)
      if (error || !data) return setError(error ?? 'Erreur.')
      onSaved(data)
    }
  }

  const uploadCover = async (file: File) => {
    setUploadingCover(true)
    const { url, error } = await uploadResourceFile(file, 'covers')
    setUploadingCover(false)
    if (error || !url) return setError(error ?? 'Upload échoué.')
    setCoverUrl(url)
  }

  const uploadPdf = async (file: File) => {
    setUploadingPdf(true)
    const { url, error } = await uploadResourceFile(file, 'ebooks')
    setUploadingPdf(false)
    if (error || !url) return setError(error ?? 'Upload échoué.')
    setContentUrl(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm sm:p-6">
      <form
        onSubmit={submit}
        className="mt-6 w-full max-w-2xl rounded-lg border border-ink-100 bg-cream-50 shadow-lg"
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 p-5">
          <h2 className="text-lg font-semibold text-ink-900">
            {existing ? 'Éditer la ressource' : 'Nouvelle ressource'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-ink-400 hover:text-ink-800"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {!existing && (
            <div>
              <label className="label">Type de ressource</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RESOURCE_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t.value]
                  const active = type === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition ${
                        active
                          ? 'border-accent-500 bg-accent-500/5 text-accent-700'
                          : 'border-ink-100 bg-cream-50 text-ink-500 hover:bg-cream-100'
                      }`}
                    >
                      <Icon size={18} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="label">Titre</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[70px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Résumé court affiché sur la carte utilisateur."
            />
          </div>

          {(isEbook || isTraining) && (
            <div>
              <label className="label">Image de couverture</label>
              <div className="flex items-center gap-3">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-16 w-24 rounded border border-ink-200 object-cover" />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded border-2 border-dashed border-ink-200 bg-cream-100 text-ink-300">
                    <FileText size={20} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  disabled={uploadingCover || saving}
                  className="btn-secondary text-xs"
                >
                  {uploadingCover ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Upload…
                    </>
                  ) : (
                    <>
                      <Upload size={13} />
                      {coverUrl ? 'Changer' : 'Charger une image'}
                    </>
                  )}
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className="text-xs text-danger-600 hover:underline"
                  >
                    Retirer
                  </button>
                )}
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadCover(f)
                  }}
                />
              </div>
            </div>
          )}

          {isTool && (
            <div>
              <label className="label">Logo (optionnel)</label>
              <div className="flex items-center gap-3">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="h-12 w-12 rounded border border-ink-200 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded border-2 border-dashed border-ink-200 bg-cream-100 text-ink-300">
                    <Wrench size={16} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  disabled={uploadingCover || saving}
                  className="btn-secondary text-xs"
                >
                  {uploadingCover ? 'Upload…' : coverUrl ? 'Changer' : 'Charger le logo'}
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className="text-xs text-danger-600 hover:underline"
                  >
                    Retirer
                  </button>
                )}
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadCover(f)
                  }}
                />
              </div>
            </div>
          )}

          {isEbook && (
            <div>
              <label className="label">Fichier PDF</label>
              <div className="flex items-center gap-3">
                {contentUrl ? (
                  <a
                    href={contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-accent-600 underline"
                  >
                    {contentUrl.split('/').pop() ?? 'Voir le PDF'}
                  </a>
                ) : (
                  <span className="text-xs text-ink-400">Aucun fichier</span>
                )}
                <button
                  type="button"
                  onClick={() => pdfInput.current?.click()}
                  disabled={uploadingPdf || saving}
                  className="btn-secondary text-xs"
                >
                  {uploadingPdf ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Upload…
                    </>
                  ) : (
                    <>
                      <Upload size={13} />
                      {contentUrl ? 'Remplacer le PDF' : 'Charger un PDF'}
                    </>
                  )}
                </button>
                <input
                  ref={pdfInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) uploadPdf(f)
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-400">Le PDF sera téléchargeable par l'utilisateur.</p>
            </div>
          )}

          {(isTool || isTraining) && (
            <div>
              <label className="label">URL {isTool ? "de l'outil" : 'de la formation'}</label>
              <input
                type="url"
                className="input"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder={isTool ? 'https://…' : 'https://youtube.com/… ou https://…'}
                required
              />
            </div>
          )}

          {isPrompt && (
            <div>
              <label className="label">Texte du prompt (à copier)</label>
              <textarea
                className="input min-h-[160px] font-mono text-xs leading-relaxed"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Colle ici le prompt complet que l'utilisateur pourra copier…"
                required
              />
            </div>
          )}

          {isTraining && (
            <div>
              <label className="label">Durée (minutes, optionnel)</label>
              <input
                type="number"
                min="0"
                className="input max-w-[140px]"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex : 45"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Catégorie</label>
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex : SEO, Copywriting, Design…"
              />
            </div>
            <div>
              <label className="label">Ordre d'affichage</label>
              <input
                type="number"
                className="input"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-[11px] text-ink-400">Plus petit = plus haut dans la liste.</p>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-[#E87A34]"
            />
            Publier immédiatement (visible pour les utilisateurs)
          </label>

          {error && (
            <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={saving || uploadingCover || uploadingPdf} className="btn-primary">
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>
                <Check size={16} />
                {existing ? 'Enregistrer' : 'Créer'}
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  )
}
