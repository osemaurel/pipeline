import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/admin/activity', label: 'Activité', icon: Activity, end: false },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText, end: false },
]

export function AdminLayout() {
  const profile = useAuthStore((s) => s.profile)

  return (
    <div className="flex min-h-screen bg-cream-100">
      {/* Sidebar sombre — distincte de l'app utilisateur */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-ink-950 text-ink-200">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
            <ShieldCheck size={17} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Pipeline</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-400">Admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink-300 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={16} />
            Retour à l’app utilisateur
          </Link>
          {profile && (
            <p className="mt-2 px-3 text-xs text-ink-400">
              Connecté : {profile.first_name} {profile.last_name}
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header avec badge Mode Admin toujours visible */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-200 bg-ink-900 px-6 py-3 text-white">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-500 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
              Mode Admin
            </span>
            <span className="text-sm text-ink-300">Back-office Pipeline</span>
          </div>
          <Link to="/dashboard" className="flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10">
            <ArrowLeft size={13} />
            App utilisateur
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
