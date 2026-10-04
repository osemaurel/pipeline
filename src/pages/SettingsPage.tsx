import { useState } from 'react'
import { Briefcase, Target, User, UserCog } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ProfileTab } from '@/components/settings/ProfileTab'
import { BusinessTab } from '@/components/settings/BusinessTab'
import { IcpTab } from '@/components/settings/IcpTab'
import { AccountTab } from '@/components/settings/AccountTab'

type Tab = 'profile' | 'business' | 'icp' | 'account'

const TABS: { value: Tab; label: string; icon: typeof User }[] = [
  { value: 'profile', label: 'Profil', icon: User },
  { value: 'business', label: 'Activité & pitch', icon: Briefcase },
  { value: 'icp', label: 'Client idéal & canaux', icon: Target },
  { value: 'account', label: 'Compte', icon: UserCog },
]

export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-xl font-semibold text-ink-900 sm:text-2xl">Paramètres</h1>
        <p className="mt-1 text-sm text-ink-500">
          Tout ce qui personnalise ton expérience et alimente ton portfolio + le
          générateur IA.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-[220px_1fr]">
        {/* Mobile : onglets en ligne défilante — Desktop : menu vertical */}
        <nav
          aria-label="Sections des paramètres"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
        >
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-left text-sm transition md:rounded md:border-0 md:px-3 md:py-2 ${
                  active
                    ? 'border-accent-500 bg-accent-500/10 font-medium text-accent-700'
                    : 'border-ink-100 bg-cream-50 text-ink-600 hover:bg-cream-100 md:bg-transparent'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </nav>

        <section className="card">
          {!profile ? (
            <div className="h-40 animate-pulse rounded bg-cream-100" />
          ) : tab === 'profile' ? (
            <ProfileTab profile={profile} />
          ) : tab === 'business' ? (
            <BusinessTab profile={profile} />
          ) : tab === 'icp' ? (
            <IcpTab profile={profile} />
          ) : (
            <AccountTab />
          )}
        </section>
      </div>
    </div>
  )
}
