import { useState } from 'react'
import { FileText, User } from 'lucide-react'
import type { Portfolio } from '@/lib/portfolioData'
import { SectionCard } from './SectionCard'

interface Props {
  portfolio: Partial<Portfolio>
  onChange: (patch: Partial<Portfolio>) => void
}

export function HeaderSection({ portfolio, onChange }: Props) {
  const [local, setLocal] = useState({
    headline: portfolio.headline ?? '',
    bio: portfolio.bio ?? '',
    photo_url: portfolio.photo_url ?? '',
    whatsapp_number: portfolio.whatsapp_number ?? '',
    cv_url: portfolio.cv_url ?? '',
  })
  const [available, setAvailable] = useState(portfolio.is_available ?? true)

  const commit = () => {
    onChange({
      headline: local.headline || null,
      bio: local.bio || null,
      photo_url: local.photo_url || null,
      whatsapp_number: local.whatsapp_number || null,
      cv_url: local.cv_url || null,
    })
  }

  const toggleAvailable = () => {
    const next = !available
    setAvailable(next)
    onChange({ is_available: next })
  }

  return (
    <SectionCard
      title="En-tête"
      icon={User}
      description="La première impression : ta photo, ton pitch, ta disponibilité."
    >
      <label className="mb-4 flex cursor-pointer items-center justify-between rounded-lg border border-ink-100 bg-cream-100 p-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${
              available ? 'animate-pulse-dot bg-success-500' : 'bg-ink-300'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-ink-800">
              Disponible pour de nouveaux projets
            </p>
            <p className="text-xs text-ink-500">
              Affiche le badge « Disponible » en haut de ta page publique.
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={available}
          onChange={toggleAvailable}
          className="h-4 w-4 accent-[#7F56D9]"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          {local.photo_url ? (
            <img
              src={local.photo_url}
              alt=""
              className="h-24 w-24 rounded-full border-2 border-cream-200 object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-cream-200 text-ink-300">
              <User size={30} />
            </div>
          )}
          <p className="text-xs text-ink-400">Photo</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">URL de la photo</label>
            <input
              className="input"
              value={local.photo_url}
              onChange={(e) => setLocal({ ...local, photo_url: e.target.value })}
              onBlur={commit}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label">Accroche</label>
            <input
              className="input"
              value={local.headline}
              onChange={(e) => setLocal({ ...local, headline: e.target.value })}
              onBlur={commit}
              placeholder="Ex : Designer produit — j'aide les startups à convertir plus."
              maxLength={140}
            />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea
              className="input min-h-[100px]"
              value={local.bio}
              onChange={(e) => setLocal({ ...local, bio: e.target.value })}
              onBlur={commit}
              placeholder="Quelques phrases sur ton parcours, ta manière de travailler…"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Numéro WhatsApp</label>
              <input
                className="input"
                value={local.whatsapp_number}
                onChange={(e) =>
                  setLocal({ ...local, whatsapp_number: e.target.value })
                }
                onBlur={commit}
                placeholder="+221 77 000 00 00"
              />
            </div>
            <div>
              <label className="label">
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} />
                  Lien vers ton CV (PDF)
                </span>
              </label>
              <input
                className="input"
                value={local.cv_url}
                onChange={(e) => setLocal({ ...local, cv_url: e.target.value })}
                onBlur={commit}
                placeholder="https://…/mon-cv.pdf"
              />
            </div>
          </div>
          <p className="text-xs text-ink-400">
            Le bouton « Télécharger mon CV » n'apparaît que si un lien est
            renseigné.
          </p>
        </div>
      </div>
    </SectionCard>
  )
}
