import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  requireOnboarding?: boolean
}

export function ProtectedRoute({ children, requireOnboarding = true }: Props) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Invité qui vient d'arriver via magic link : doit d'abord définir son mot
  // de passe pour pouvoir se reconnecter plus tard. On vérifie deux sources,
  // dans cet ordre, pour être résilient si l'une d'elles manque :
  //  - le flag `needs_password_setup` dans la table `profiles` (posé par le
  //    trigger `apply_invite_on_signup` côté SQL) ;
  //  - le flag dans `user_metadata` (posé par l'edge function `send-invite`).
  const needsPasswordSetup =
    profile?.needs_password_setup === true ||
    (user.user_metadata as Record<string, unknown> | undefined)?.needs_password_setup === true
  if (needsPasswordSetup && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />
  }

  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
