import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  Users,
  Radar,
  Sparkles,
  Sun,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Filter,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { readDisabledModules } from '@/lib/settingsData'

interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
  module: 'routine' | null
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', short: 'Accueil', icon: LayoutDashboard, module: null },
  { to: '/portfolio', label: 'Portfolio', short: 'Portfolio', icon: User, module: null },
  { to: '/crm', label: 'CRM', short: 'CRM', icon: Users, module: null },
  { to: '/recherche', label: 'Recherche de prospects', short: 'Prospects', icon: Radar, module: null },
  { to: '/ai', label: 'Générateur IA', short: 'IA', icon: Sparkles, module: null },
  { to: '/routine', label: 'Ma routine', short: 'Routine', icon: Sun, module: 'routine' },
  { to: '/resources', label: 'Ressources', short: 'Ressources', icon: BookOpen, module: null },
  { to: '/stats', label: 'Statistiques', short: 'Stats', icon: BarChart3, module: null },
]

const settingsItem: NavItem = {
  to: '/settings', label: 'Paramètres', short: 'Paramètres', icon: Settings, module: null,
}

// Les 4 destinations les plus fréquentes, accessibles au pouce en bas d'écran.
const TAB_BAR_PATHS = ['/dashboard', '/crm', '/recherche', '/ai']

function SideLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition lg:py-2 ${
          isActive ? 'bg-cream-200 text-ink-900' : 'text-ink-700 hover:bg-cream-100 hover:text-ink-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} className={isActive ? 'text-accent-600' : 'text-ink-400'} strokeWidth={2} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 shadow-xs">
        <Filter size={16} className="text-white" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight text-ink-900">TopCloz</span>
    </div>
  )
}

export function AppLayout() {
  const signOut = useAuthStore((s) => s.signOut)
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const disabledModules = readDisabledModules(user?.user_metadata)
  const visibleItems = navItems.filter((item) => !item.module || !disabledModules.includes(item.module))
  const tabItems = TAB_BAR_PATHS.map((p) => visibleItems.find((i) => i.to === p)).filter(
    (i): i is NavItem => Boolean(i),
  )

  const initials = profile
    ? `${profile.first_name.slice(0, 1)}${profile.last_name.slice(0, 1)}`.toUpperCase()
    : '·'

  // Ferme le tiroir à chaque changement de page.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Bloque le scroll du fond + fermeture par Échap quand le tiroir est ouvert.
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  const profileBlock = (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold text-ink-500 ring-1 ring-inset ring-ink-100">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {profile && (
          <>
            <p className="truncate text-sm font-semibold text-ink-900">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="truncate text-xs text-ink-400">{profile.email}</p>
          </>
        )}
      </div>
      <button
        onClick={signOut}
        className="shrink-0 rounded-lg p-2.5 text-ink-400 transition hover:bg-cream-100 hover:text-ink-700"
        title="Déconnexion"
        aria-label="Déconnexion"
      >
        <LogOut size={18} />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream-100 lg:flex">
      {/* ---------- Sidebar desktop ---------- */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-ink-100 bg-cream-50 lg:flex">
        <div className="px-6 pb-5 pt-7">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4">
          {visibleItems.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="px-4 pb-4">
          <SideLink item={settingsItem} />
        </div>
        <div className="border-t border-ink-100 p-4">{profileBlock}</div>
      </aside>

      {/* ---------- Barre du haut mobile ---------- */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-cream-50/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand />
          <button
            onClick={() => setDrawerOpen(true)}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-700 transition active:bg-cream-200"
            aria-label="Ouvrir le menu"
            aria-expanded={drawerOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ---------- Tiroir mobile ---------- */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-ink-900/40 backdrop-blur-[2px] transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
          className={`absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-cream-50 shadow-2xl transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="border-b border-ink-100 pt-[env(safe-area-inset-top)]">
            <div className="flex h-14 items-center justify-between px-4">
              <Brand />
              <button
                onClick={() => setDrawerOpen(false)}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 active:bg-cream-200"
                aria-label="Fermer le menu"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 py-3">
            {visibleItems.map((item) => (
              <SideLink key={item.to} item={item} onNavigate={() => setDrawerOpen(false)} />
            ))}
            <div className="my-2 border-t border-ink-100" />
            <SideLink item={settingsItem} onNavigate={() => setDrawerOpen(false)} />
          </nav>
          <div className="border-t border-ink-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {profileBlock}
          </div>
        </aside>
      </div>

      {/* ---------- Contenu ---------- */}
      <main className="min-w-0 flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>

      {/* ---------- Barre d'onglets mobile ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navigation rapide"
      >
        <div className="grid grid-cols-5">
          {tabItems.map(({ to, short, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:bg-cream-200 ${
                  isActive ? 'text-accent-600' : 'text-ink-400'
                }`
              }
            >
              <Icon size={22} strokeWidth={2} />
              {short}
            </NavLink>
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-400 transition active:bg-cream-200"
          >
            <Menu size={22} strokeWidth={2} />
            Plus
          </button>
        </div>
      </nav>
    </div>
  )
}
