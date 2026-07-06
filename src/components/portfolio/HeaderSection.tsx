import { useState } from 'react'
import { User } from 'lucide-react'
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
  })

  const commit = (patch: Partial<typeof local>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    onChange({
      headline: next.headline || null,
      bio: next.bio || null,
      photo_url: next.photo_url || null,
      whatsapp_number: next.whatsapp_number || null,
    })
  }

  return (
    <SectionCard
      title="En-tête"
      icon={User}
      description="La première impression : ta photo, ton pitch, un moyen de te joindre."
    >
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
              onBlur={() => commit({})}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label">Accroche</label>
            <input
              className="input"
              value={local.headline}
              onChange={(e) => setLocal({ ...local, headline: e.target.value })}
              onBlur={() => commit({})}
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
              onBlur={() => commit({})}
              placeholder="Quelques phrases sur ton parcours, ta manière de travailler…"
            />
          </div>
          <div>
            <label className="label">Numéro WhatsApp</label>
            <input
              className="input"
              value={local.whatsapp_number}
              onChange={(e) =>
                setLocal({ ...local, whatsapp_number: e.target.value })
              }
              onBlur={() => commit({})}
              placeholder="+221 77 000 00 00"
            />
            <p className="mt-1 text-xs text-ink-400">
              Format international. Apparaît en bouton sur ta page publique.
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
