import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function AuthLayout() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  // Un user connecté n'a rien à faire sur /login — SAUF sur /set-password,
  // où l'invité arrive justement connecté via le magic link.
  if (user && location.pathname !== '/set-password') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent-500 shadow-xs">
            <Filter size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            TopCloz
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Envoie un lien, pas un CV. Suis tes prospects, pas ta mémoire.
          </p>
        </div>
        <div className="card">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
