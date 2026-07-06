import { useState } from 'react'
import { Edit3, MessageSquareQuote, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PortfolioTestimonial } from '@/lib/portfolioData'
import { SectionCard } from './SectionCard'
import { ItemEditor } from './ItemEditor'

interface Draft {
  id?: string
  client_name: string
  content: string
  rating: string
}

const emptyDraft = (): Draft => ({ client_name: '', content: '', rating: '5' })

interface Props {
  userId: string
  testimonials: PortfolioTestimonial[]
  onChange: (next: PortfolioTestimonial[]) => void
}

export function TestimonialsSection({ userId, testimonials, onChange }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const startNew = () => setEditing({ ...emptyDraft() })
  const startEdit = (t: PortfolioTestimonial) =>
    setEditing({
      id: t.id,
      client_name: t.client_name,
      content: t.content,
      rating: t.rating?.toString() ?? '',
    })

  const submit = async () => {
    if (!editing) return
    setSaving(true)
    const payload = {
      user_id: userId,
      client_name: editing.client_name.trim(),
      content: editing.content.trim(),
      rating: editing.rating ? Number(editing.rating) : null,
    }
    if (editing.id) {
      const { data } = await supabase
        .from('portfolio_testimonials')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (data)
        onChange(
          testimonials.map((t) =>
            t.id === editing.id ? (data as PortfolioTestimonial) : t,
          ),
        )
    } else {
      const { data } = await supabase
        .from('portfolio_testimonials')
        .insert({ ...payload, order_index: testimonials.length })
        .select()
        .single()
      if (data) onChange([...testimonials, data as PortfolioTestimonial])
    }
    setSaving(false)
    setEditing(null)
  }

  const remove = async () => {
    if (!editing?.id) return
    setSaving(true)
    await supabase.from('portfolio_testimonials').delete().eq('id', editing.id)
    onChange(testimonials.filter((t) => t.id !== editing.id))
    setSaving(false)
    setEditing(null)
  }

  return (
    <SectionCard
      title="Témoignages"
      icon={MessageSquareQuote}
      description="Ce que tes clients disent de toi."
      onAdd={startNew}
      addLabel="Ajouter un témoignage"
    >
      {testimonials.length === 0 && !editing && (
        <p className="rounded border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
          Aucun témoignage. Un mot d'un client vaut mille descriptions.
        </p>
      )}

      <div className="space-y-3">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-ink-100 bg-cream-50 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink-800">
                « {t.content} »
              </p>
              <button
                onClick={() => startEdit(t)}
                className="shrink-0 text-ink-400 hover:text-accent-600"
              >
                <Edit3 size={14} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
              <span className="font-medium text-ink-700">— {t.client_name}</span>
              {t.rating != null && (
                <span className="flex items-center gap-0.5 text-accent-600">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-3">
          <ItemEditor
            title={editing.id ? 'Modifier le témoignage' : 'Nouveau témoignage'}
            onCancel={() => setEditing(null)}
            onSubmit={submit}
            onDelete={editing.id ? remove : undefined}
            saving={saving}
          >
            <div>
              <label className="label">Nom du client</label>
              <input
                className="input"
                value={editing.client_name}
                onChange={(e) =>
                  setEditing({ ...editing, client_name: e.target.value })
                }
                required
                placeholder="Ex : Fatou Diop, CEO chez BoutiquePlus"
              />
            </div>
            <div>
              <label className="label">Ses mots</label>
              <textarea
                className="input min-h-[100px]"
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                required
                placeholder="Copie-colle son message ou un extrait."
              />
            </div>
            <div>
              <label className="label">Note (0-5)</label>
              <select
                className="input"
                value={editing.rating}
                onChange={(e) => setEditing({ ...editing, rating: e.target.value })}
              >
                <option value="">Aucune</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} étoile{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          </ItemEditor>
        </div>
      )}
    </SectionCard>
  )
}
