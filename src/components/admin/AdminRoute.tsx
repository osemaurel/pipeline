import { ReactNode, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { checkIsAdmin } from '@/lib/adminData'

export function AdminRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<'checking' | 'ok' | 'forbidden'>('checking')

  useEffect(() => {
    if (!user) return
    checkIsAdmin().then((ok) => setState(ok ? 'ok' : 'forbidden'))
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-300">
        <div className="animate-pulse text-sm">Vérification des droits…</div>
      </div>
    )
  }

  if (state === 'forbidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <ShieldAlert size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-ink-900">Accès réservé aux administrateurs</h1>
          <p className="mt-2 text-sm text-ink-500">
            Ton compte n’a pas les droits nécessaires pour accéder à l’espace d’administration.
          </p>
          <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
            Retour au dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
