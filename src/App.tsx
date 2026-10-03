import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthLayout } from '@/components/AuthLayout'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
// Inscription libre désactivée : les comptes sont pré-créés par l'admin via
// l'edge function send-invite. Ancien SignupPage conservé dans le repo
// (src/pages/auth/SignupPage.tsx) pour réactivation future quand on ajoutera
// la landing page + flow de paiement.
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PortfolioPage } from '@/pages/PortfolioPage'
import { CrmPage } from '@/pages/CrmPage'
import { LeadSearchPage } from '@/pages/LeadSearchPage'
import { AiGeneratorPage } from '@/pages/AiGeneratorPage'
import { RoutinePage } from '@/pages/RoutinePage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PublicPortfolioPage } from '@/pages/PublicPortfolioPage'
import { AdminRoute } from '@/components/admin/AdminRoute'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage'
import { AdminActivityPage } from '@/pages/admin/AdminActivityPage'
import { AdminLogsPage } from '@/pages/admin/AdminLogsPage'
import { AdminResourcesPage } from '@/pages/admin/AdminResourcesPage'
import { AdminInvitesPage } from '@/pages/admin/AdminInvitesPage'

export default function App() {
  const init = useAuthStore((s) => s.init)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    init()
  }, [init])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 text-ink-500">
        <div className="animate-pulse text-xl font-semibold">TopCloz</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/p/:slug" element={<PublicPortfolioPage />} />

      {/* Espace admin — layout et protection dédiés */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserDetailPage />} />
        <Route path="resources" element={<AdminResourcesPage />} />
        <Route path="invites" element={<AdminInvitesPage />} />
        <Route path="activity" element={<AdminActivityPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        {/* Redirection : plus de signup libre pour l'instant → page de connexion */}
        <Route path="/signup" element={<Navigate to="/login" replace />} />
      </Route>

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireOnboarding={false}>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/recherche" element={<LeadSearchPage />} />
        <Route path="/ai" element={<AiGeneratorPage />} />
        <Route path="/routine" element={<RoutinePage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
