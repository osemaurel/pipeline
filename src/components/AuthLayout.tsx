import { Navigate, Outlet } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function AuthLayout() {
  const user = useAuthStore((s) => s.user)

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent-500 shadow-xs">
            <Filter size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Pipeline
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
