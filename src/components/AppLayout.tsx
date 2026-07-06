import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  Users,
  Sparkles,
  Sun,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Filter,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { readDisabledModules } from '@/lib/settingsData'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
  { to: '/portfolio', label: 'Portfolio', icon: User, module: null },
  { to: '/crm', label: 'CRM', icon: Users, module: null },
  { to: '/ai', label: 'Générateur IA', icon: Sparkles, module: null },
  { to: '/routine', label: 'Ma routine', icon: Sun, module: 'routine' as const },
  { to: '/resources', label: 'Ressources', icon: BookOpen, module: null },
  { to: '/stats', label: 'Statistiques', icon: BarChart3, module: null },
]

const bottomItems = [
  { to: '/settings', label: 'Paramètres', icon: Settings },
]

export function AppLayout() {
  const signOut = useAuthStore((s) => s.signOut)
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const disabledModules = readDisabledModules(user?.user_metadata)
  const visibleItems = navItems.filter(
    (item) => !item.module || !disabledModules.includes(item.module),
  )

  const initials = profile
    ? `${profile.first_name.slice(0, 1)}${profile.last_name.slice(0, 1)}`.toUpperCase()
    : '·'

  return (
    <div className="flex min-h-screen bg-cream-100">
      <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-ink-100 bg-cream-50">
        <div className="flex items-center gap-2.5 px-6 pb-5 pt-7">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 shadow-xs">
            <Filter size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-ink-900">
            Pipeline
          </h1>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-cream-200 text-ink-900'
                    : 'text-ink-700 hover:bg-cream-100 hover:text-ink-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={isActive ? 'text-ink-500' : 'text-ink-400'}
                    strokeWidth={2}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 pb-4">
          {bottomItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-cream-200 text-ink-900'
                    : 'text-ink-700 hover:bg-cream-100 hover:text-ink-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={isActive ? 'text-ink-500' : 'text-ink-400'}
                    strokeWidth={2}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-ink-100 p-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full border border-ink-100 object-cover"
              />
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
                  <p className="truncate text-sm text-ink-400">{profile.email}</p>
                </>
              )}
            </div>
            <button
              onClick={signOut}
              className="shrink-0 rounded p-2 text-ink-400 transition hover:bg-cream-100 hover:text-ink-700"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
