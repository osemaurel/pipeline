import { useState } from 'react'
import { Briefcase, Edit3 } from 'lucide-react'
import {
  deleteExperience,
  saveExperience,
  type PortfolioExperience,
} from '@/lib/portfolioData'
import { SectionCard } from './SectionCard'
import { ItemEditor } from './ItemEditor'

interface Draft {
  id?: string
  role: string
  company: string
  start_year: string
  end_year: string
  description: string
}

const emptyDraft = (): Draft => ({
  role: '',
  company: '',
  start_year: new Date().getFullYear().toString(),
  end_year: '',
  description: '',
})

interface Props {
  userId: string
  experiences: PortfolioExperience[]
  onChange: (next: PortfolioExperience[]) => void
}

export function ExperiencesSection({ userId, experiences, onChange }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const startNew = () => setEditing(emptyDraft())
  const startEdit = (x: PortfolioExperience) =>
    setEditing({
      id: x.id,
      role: x.role,
      company: x.company,
      start_year: x.start_year,
      end_year: x.end_year ?? '',
      description: x.description ?? '',
    })

  const submit = async () => {
    if (!editing) return
    setSaving(true)
    const { data } = await saveExperience({
      id: editing.id,
      user_id: userId,
      role: editing.role.trim(),
      company: editing.company.trim(),
      start_year: editing.start_year.trim(),
      end_year: editing.end_year.trim() || null,
      description: editing.description.trim() || null,
      ...(editing.id ? {} : { order_index: experiences.length }),
    })
    setSaving(false)
    if (!data) return
    if (editing.id) {
      onChange(experiences.map((x) => (x.id === editing.id ? data : x)))
    } else {
      onChange([...experiences, data])
    }
    setEditing(null)
  }

  const remove = async () => {
    if (!editing?.id) return
    setSaving(true)
    await deleteExperience(editing.id)
    onChange(experiences.filter((x) => x.id !== editing.id))
    setSaving(false)
    setEditing(null)
  }

  return (
    <SectionCard
      title="Expérience"
      icon={Briefcase}
      description="Ton parcours — affiché en frise chronologique sur ta page publique."
      onAdd={startNew}
      addLabel="Ajouter une expérience"
    >
      {experiences.length === 0 && !editing && (
        <p className="rounded border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
          Aucune expérience. Ajoute tes missions ou postes marquants.
        </p>
      )}

      <div className="space-y-3">
        {experiences.map((x) => (
          <div
            key={x.id}
            className="flex items-start gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {x.role}
                </p>
                <span className="shrink-0 font-mono text-xs text-ink-400">
                  {x.start_year} — {x.end_year || "Aujourd'hui"}
                </span>
              </div>
              <p className="text-xs text-ink-500">{x.company}</p>
              {x.description && (
                <ul className="mt-2 space-y-0.5">
                  {x.description
                    .split('\n')
                    .filter(Boolean)
                    .map((line, i) => (
                      <li key={i} className="text-xs text-ink-600">
                        • {line.replace(/^[-•]\s*/, '')}
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => startEdit(x)}
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
            title={editing.id ? "Modifier l'expérience" : 'Nouvelle expérience'}
            onCancel={() => setEditing(null)}
            onSubmit={submit}
            onDelete={editing.id ? remove : undefined}
            saving={saving}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Poste / rôle</label>
                <input
                  className="input"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                  required
                  placeholder="Ex : Développeur web freelance"
                />
              </div>
              <div>
                <label className="label">Entreprise / client</label>
                <input
                  className="input"
                  value={editing.company}
                  onChange={(e) =>
                    setEditing({ ...editing, company: e.target.value })
                  }
                  required
                  placeholder="Ex : Digitips Consulting"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Année de début</label>
                <input
                  className="input"
                  value={editing.start_year}
                  onChange={(e) =>
                    setEditing({ ...editing, start_year: e.target.value })
                  }
                  required
                  placeholder="2022"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="label">Année de fin</label>
                <input
                  className="input"
                  value={editing.end_year}
                  onChange={(e) =>
                    setEditing({ ...editing, end_year: e.target.value })
                  }
                  placeholder="Vide = Aujourd'hui"
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <label className="label">Réalisations (une par ligne)</label>
              <textarea
                className="input min-h-[100px]"
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                placeholder={
                  'Refonte complète du site e-commerce\nAugmentation du trafic de 40 %'
                }
              />
            </div>
          </ItemEditor>
        </div>
      )}
    </SectionCard>
  )
}
