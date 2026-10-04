import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  BookOpen,
  LayoutDashboard,
  Mail,
  Menu,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/admin/invites', label: 'Invitations', icon: Mail, end: false },
  { to: '/admin/resources', label: 'Ressources', icon: BookOpen, end: false },
  { to: '/admin/activity', label: 'Activité', icon: Activity, end: false },
  { to: '/admin/logs', label: 'Logs', icon: ScrollText, end: false },
]

function AdminBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
        <ShieldCheck size={17} className="text-white" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-sm font-bold tracking-tight text-white">TopCloz</p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-400">Admin</p>
      </div>
    </div>
  )
}

function AdminNav() {
  const profile = useAuthStore((s) => s.profile)
  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-3 text-sm font-medium transition lg:py-2 ${
                isActive ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded px-3 py-3 text-sm font-medium text-ink-300 transition hover:bg-white/5 hover:text-white lg:py-2"
        >
          <ArrowLeft size={16} />
          Retour à l’app utilisateur
        </Link>
        {profile && (
          <p className="mt-2 truncate px-3 text-xs text-ink-400">
            Connecté : {profile.first_name} {profile.last_name}
          </p>
        )}
      </div>
    </>
  )
}

export function AdminLayout() {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Ferme le tiroir à chaque navigation
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Verrouille le scroll de la page + fermeture via Échap quand le tiroir est ouvert
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  return (
    <div className="flex min-h-[100dvh] bg-cream-100">
      {/* Sidebar sombre — distincte de l'app utilisateur (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-950 text-ink-200 lg:flex">
        <div className="px-5 pb-5 pt-6">
          <AdminBrand />
        </div>
        <AdminNav />
      </aside>

      {/* Tiroir mobile */}
      <div
        className={`fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm transition-opacity lg:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-xs flex-col bg-ink-950 pt-[env(safe-area-inset-top)] text-ink-200 shadow-2xl transition-transform duration-300 lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!drawerOpen}
        aria-label="Navigation admin"
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-5">
          <AdminBrand />
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>
        <AdminNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header avec badge Mode Admin toujours visible */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-900 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition hover:bg-white/10 lg:hidden"
              aria-label="Ouvrir le menu admin"
              aria-expanded={drawerOpen}
            >
              <Menu size={20} />
            </button>
            <span className="shrink-0 rounded-full bg-accent-500 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
              Mode Admin
            </span>
            <span className="hidden truncate text-sm text-ink-300 sm:inline">Back-office TopCloz</span>
          </div>
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded border border-white/20 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10 sm:py-1.5"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">App utilisateur</span>
            <span className="sm:hidden">App</span>
          </Link>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
