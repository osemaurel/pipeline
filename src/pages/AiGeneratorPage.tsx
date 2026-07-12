import { useEffect, useState } from 'react'
import { Briefcase, ShoppingBag, Store, Zap } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { fetchCredits } from '@/lib/aiStudioData'
import { ServicePlatformTab } from '@/components/aistudio/ServicePlatformTab'
import { UpworkTab } from '@/components/aistudio/UpworkTab'

type Tab = 'comeup' | 'fiverr' | 'upwork'

const TABS: { value: Tab; label: string; icon: typeof Store; accent: string }[] = [
  { value: 'comeup', label: 'ComeUp', icon: Store, accent: 'text-[#00A67E]' },
  { value: 'fiverr', label: 'Fiverr', icon: ShoppingBag, accent: 'text-[#1DBF73]' },
  { value: 'upwork', label: 'Upwork', icon: Briefcase, accent: 'text-[#14A800]' },
]

export function AiGeneratorPage() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState<Tab>('comeup')
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    if (user) fetchCredits(user.id).then(setCredits)
  }, [user])

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Générateur IA</h1>
          <p className="mt-1 text-sm text-ink-500">
            Ton assistant pour construire ton business sur ComeUp, Fiverr et Upwork.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-cream-100 px-3.5 py-2">
          <Zap size={15} className="text-accent-500" />
          <span className="text-sm">
            <span className="font-mono font-semibold">{credits === null ? '—' : credits}</span> crédits
          </span>
        </div>
      </header>

      {!profile?.onboarding_completed && (
        <div className="card mb-6 border-warn-200 bg-warn-50">
          <p className="text-sm text-ink-700">
            Termine ton onboarding pour que l’IA s’appuie sur ton profil (compétences, secteur, expérience).
          </p>
        </div>
      )}

      {/* Onglets plateformes */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition ${
                active ? 'border-accent-500 bg-accent-500/5 text-ink-900' : 'border-ink-100 bg-cream-50 text-ink-500 hover:bg-cream-100'
              }`}
            >
              <Icon size={17} className={active ? t.accent : 'text-ink-400'} />
              {t.label}
            </button>
          )
        })}
      </div>

      {user && (
        tab === 'upwork' ? (
          <UpworkTab userId={user.id} onCredits={setCredits} />
        ) : (
          <ServicePlatformTab
            key={tab}
            userId={user.id}
            platform={tab}
            onCredits={setCredits}
          />
        )
      )}
    </div>
  )
}
