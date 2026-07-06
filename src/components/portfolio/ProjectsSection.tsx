import { useState } from 'react'
import { Edit3, ExternalLink, FolderKanban, ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PortfolioProject } from '@/lib/portfolioData'
import { SectionCard } from './SectionCard'
import { ItemEditor } from './ItemEditor'

interface Draft {
  id?: string
  title: string
  description: string
  image_url: string
  external_link: string
}

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  image_url: '',
  external_link: '',
})

interface Props {
  userId: string
  projects: PortfolioProject[]
  onChange: (next: PortfolioProject[]) => void
}

export function ProjectsSection({ userId, projects, onChange }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const startNew = () => setEditing({ ...emptyDraft() })
  const startEdit = (p: PortfolioProject) =>
    setEditing({
      id: p.id,
      title: p.title,
      description: p.description ?? '',
      image_url: p.image_url ?? '',
      external_link: p.external_link ?? '',
    })

  const submit = async () => {
    if (!editing) return
    setSaving(true)
    const payload = {
      user_id: userId,
      title: editing.title.trim(),
      description: editing.description.trim() || null,
      image_url: editing.image_url.trim() || null,
      external_link: editing.external_link.trim() || null,
    }
    if (editing.id) {
      const { data } = await supabase
        .from('portfolio_projects')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (data)
        onChange(
          projects.map((p) =>
            p.id === editing.id ? (data as PortfolioProject) : p,
          ),
        )
    } else {
      const { data } = await supabase
        .from('portfolio_projects')
        .insert({ ...payload, order_index: projects.length })
        .select()
        .single()
      if (data) onChange([...projects, data as PortfolioProject])
    }
    setSaving(false)
    setEditing(null)
  }

  const remove = async () => {
    if (!editing?.id) return
    setSaving(true)
    await supabase.from('portfolio_projects').delete().eq('id', editing.id)
    onChange(projects.filter((p) => p.id !== editing.id))
    setSaving(false)
    setEditing(null)
  }

  return (
    <SectionCard
      title="Réalisations"
      icon={FolderKanban}
      description="Tes projets marquants — la preuve par l'exemple."
      onAdd={startNew}
      addLabel="Ajouter un projet"
    >
      {projects.length === 0 && !editing && (
        <p className="rounded border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
          Aucun projet. Ajoute une réalisation qui te rend fier.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-lg border border-ink-100 bg-cream-50"
          >
            {p.image_url ? (
              <img
                src={p.image_url}
                alt=""
                className="h-32 w-full object-cover"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-cream-200 text-ink-300">
                <ImageIcon size={24} />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink-800">{p.title}</p>
                <button
                  onClick={() => startEdit(p)}
                  className="shrink-0 text-ink-400 hover:text-accent-600"
                  title="Modifier"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                  {p.description}
                </p>
              )}
              {p.external_link && (
                <a
                  href={p.external_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
                >
                  Voir le projet
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3">
          <ItemEditor
            title={editing.id ? 'Modifier le projet' : 'Nouveau projet'}
            onCancel={() => setEditing(null)}
            onSubmit={submit}
            onDelete={editing.id ? remove : undefined}
            saving={saving}
          >
            <div>
              <label className="label">Titre</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
                placeholder="Ex : Refonte site vitrine BoutiquePlus"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px]"
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                placeholder="Le contexte, ton rôle, le résultat obtenu."
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Image (URL)</label>
                <input
                  className="input"
                  value={editing.image_url}
                  onChange={(e) =>
                    setEditing({ ...editing, image_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="label">Lien externe</label>
                <input
                  className="input"
                  value={editing.external_link}
                  onChange={(e) =>
                    setEditing({ ...editing, external_link: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          </ItemEditor>
        </div>
      )}
    </SectionCard>
  )
}
