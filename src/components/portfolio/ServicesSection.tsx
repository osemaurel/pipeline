import { useState } from 'react'
import { Briefcase, Edit3, ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PortfolioService } from '@/lib/portfolioData'
import { SectionCard } from './SectionCard'
import { ItemEditor } from './ItemEditor'

interface Draft {
  id?: string
  title: string
  description: string
  price: string
  image_url: string
}

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  price: '',
  image_url: '',
})

interface Props {
  userId: string
  services: PortfolioService[]
  onChange: (next: PortfolioService[]) => void
}

export function ServicesSection({ userId, services, onChange }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const startNew = () =>
    setEditing({ ...emptyDraft() })

  const startEdit = (s: PortfolioService) =>
    setEditing({
      id: s.id,
      title: s.title,
      description: s.description ?? '',
      price: s.price?.toString() ?? '',
      image_url: s.image_url ?? '',
    })

  const submit = async () => {
    if (!editing) return
    setSaving(true)
    const payload = {
      user_id: userId,
      title: editing.title.trim(),
      description: editing.description.trim() || null,
      price: editing.price ? Number(editing.price) : null,
      image_url: editing.image_url.trim() || null,
    }
    if (editing.id) {
      const { data } = await supabase
        .from('portfolio_services')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (data) {
        onChange(services.map((s) => (s.id === editing.id ? (data as PortfolioService) : s)))
      }
    } else {
      const { data } = await supabase
        .from('portfolio_services')
        .insert({ ...payload, order_index: services.length })
        .select()
        .single()
      if (data) onChange([...services, data as PortfolioService])
    }
    setSaving(false)
    setEditing(null)
  }

  const remove = async () => {
    if (!editing?.id) return
    setSaving(true)
    await supabase.from('portfolio_services').delete().eq('id', editing.id)
    onChange(services.filter((s) => s.id !== editing.id))
    setSaving(false)
    setEditing(null)
  }

  return (
    <SectionCard
      title="Services"
      icon={Briefcase}
      description="Ce que tu vends, avec un prix indicatif."
      onAdd={startNew}
      addLabel="Ajouter un service"
    >
      {services.length === 0 && !editing && (
        <p className="rounded border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
          Aucun service. Ajoute ton offre principale pour commencer.
        </p>
      )}

      <div className="space-y-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-start gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3"
          >
            {s.image_url ? (
              <img
                src={s.image_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-cream-200 text-ink-300">
                <ImageIcon size={20} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-ink-800">{s.title}</p>
                {s.price != null && (
                  <span className="shrink-0 font-mono text-xs text-accent-700">
                    {s.price.toLocaleString('fr-FR')} {s.currency}
                  </span>
                )}
              </div>
              {s.description && (
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                  {s.description}
                </p>
              )}
            </div>
            <button
              onClick={() => startEdit(s)}
              className="shrink-0 text-ink-400 hover:text-accent-600"
              title="Modifier"
            >
              <Edit3 size={16} />
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3">
          <ItemEditor
            title={editing.id ? 'Modifier le service' : 'Nouveau service'}
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
                placeholder="Ex : Site vitrine WordPress"
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
                placeholder="Que comprend cette offre ? Livrables, délais…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prix (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({ ...editing, price: e.target.value })
                  }
                  placeholder="Ex : 250000"
                />
              </div>
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
            </div>
          </ItemEditor>
        </div>
      )}
    </SectionCard>
  )
}
