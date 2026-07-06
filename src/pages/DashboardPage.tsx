import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Calendar,
  Copy,
  Eye,
  Inbox,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
  ExternalLink,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchDashboardData,
  type DashboardData,
} from '@/lib/dashboardData'
import { PIPELINE_STAGES, stageInfo } from '@/lib/pipelineStatus'
import { StatCard } from '@/components/dashboard/StatCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { supabase } from '@/lib/supabase'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    fetchDashboardData(user.id)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const publicPortfolioUrl = data?.portfolio?.slug
    ? `${window.location.origin}/p/${data.portfolio.slug}`
    : null

  const markActionDone = async (id: string) => {
    await supabase
      .from('actions')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
    setData((d) =>
      d
        ? { ...d, todaysActions: d.todaysActions.filter((a) => a.id !== id) }
        : d,
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            Vue d'ensemble de ton activité —{' '}
            {format(new Date(), "EEEE d MMMM", { locale: fr })}.
          </p>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Prospects actifs"
          value={loading ? '—' : data?.stats.activeProspects ?? 0}
          icon={Users}
          hint={
            data && data.stats.totalProspects > 0
              ? `${data.stats.totalProspects} au total`
              : 'Commence à prospecter'
          }
        />
        <StatCard
          label="RDV cette semaine"
          value={loading ? '—' : data?.stats.meetingsThisWeek ?? 0}
          icon={Calendar}
          hint="7 prochains jours"
          accent
        />
        <StatCard
          label="Vues portfolio"
          value={loading ? '—' : data?.stats.portfolioViews ?? 0}
          icon={Eye}
          hint={
            data?.portfolio?.is_published ? 'En ligne' : 'Non publié'
          }
        />
        <StatCard
          label="Leads en attente"
          value={loading ? '—' : data?.stats.unconvertedLeads ?? 0}
          icon={Inbox}
          hint="À convertir en prospect"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <SectionHeader
              title="Aujourd’hui"
              icon={Target}
              action={{ label: 'Voir toutes les actions', to: '/crm' }}
            />
            {loading ? (
              <SkeletonList />
            ) : !data || data.todaysActions.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Rien de prévu aujourd’hui"
                description="Profites-en pour planifier ta journée."
                action={{ label: 'Aller au CRM', to: '/crm' }}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.todaysActions.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <button
                      onClick={() => markActionDone(a.id)}
                      className="mt-0.5 text-ink-300 transition hover:text-accent-500"
                      title="Marquer comme fait"
                    >
                      <Circle size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800">
                        {a.title}
                      </p>
                      {a.prospect && (
                        <p className="text-xs text-ink-400">
                          {a.prospect.first_name} {a.prospect.last_name} ·{' '}
                          {a.prospect.company_name}
                        </p>
                      )}
                      {a.description && (
                        <p className="mt-1 text-xs text-ink-500">
                          {a.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-ink-400">
                      {format(new Date(a.scheduled_at), 'HH:mm')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <SectionHeader
              title="Prochains rendez-vous"
              icon={Calendar}
              action={{ label: 'Voir tous les RDV', to: '/crm' }}
            />
            {loading ? (
              <SkeletonList />
            ) : !data || data.upcomingMeetings.length === 0 ? (
              <EmptyState
                icon={Video}
                title="Aucun RDV planifié"
                description="Les prochains rendez-vous des 7 prochains jours apparaîtront ici."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.upcomingMeetings.map((m) => {
                  const d = new Date(m.scheduled_at)
                  return (
                    <li key={m.id} className="flex items-center gap-4 py-3">
                      <div className="shrink-0 rounded-lg bg-cream-200 px-3 py-2 text-center">
                        <p className="font-mono text-xs uppercase text-ink-400">
                          {format(d, 'MMM', { locale: fr })}
                        </p>
                        <p className="text-xl font-semibold leading-none text-ink-900">
                          {format(d, 'd')}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-800">
                          {m.prospect
                            ? `${m.prospect.first_name} ${m.prospect.last_name}`
                            : 'Prospect supprimé'}
                        </p>
                        <p className="text-xs text-ink-400">
                          {m.prospect?.company_name} ·{' '}
                          {formatMeetingWhen(d)} · {m.duration_minutes ?? 30} min
                        </p>
                      </div>
                      {m.platform && (
                        <span className="hidden shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs text-ink-500 sm:inline">
                          {m.platform}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="card">
            <SectionHeader
              title="Nouveaux leads"
              icon={Inbox}
              action={{ label: 'Voir tous les leads', to: '/portfolio' }}
            />
            {loading ? (
              <SkeletonList />
            ) : !data || data.recentLeads.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Aucun lead pour le moment"
                description="Les demandes reçues via ton portfolio public apparaîtront ici."
                action={
                  !data?.portfolio?.is_published
                    ? { label: 'Publier mon portfolio', to: '/portfolio' }
                    : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.recentLeads.map((l) => (
                  <li key={l.id} className="flex items-start gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/10 font-medium text-accent-700">
                      {l.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-800">{l.name}</p>
                      <p className="text-xs text-ink-400">
                        {l.email || l.phone || '—'} ·{' '}
                        {formatDistanceToNow(new Date(l.created_at), {
                          locale: fr,
                          addSuffix: true,
                        })}
                      </p>
                      {l.message && (
                        <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                          « {l.message} »
                        </p>
                      )}
                    </div>
                    <Link
                      to="/portfolio"
                      className="shrink-0 text-xs font-medium text-accent-600 hover:underline"
                    >
                      Ouvrir
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <SectionHeader title="Ton portfolio" icon={Eye} />
            {loading || !data ? (
              <div className="h-24 animate-pulse rounded bg-cream-100" />
            ) : data.portfolio?.slug ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      data.portfolio.is_published
                        ? 'bg-success-500'
                        : 'bg-ink-300'
                    }`}
                  />
                  <span className="text-sm font-medium text-ink-700">
                    {data.portfolio.is_published ? 'En ligne' : 'Brouillon'}
                  </span>
                </div>
                {publicPortfolioUrl && (
                  <div className="rounded border border-ink-100 bg-cream-100 p-2">
                    <p className="mb-1 text-xs text-ink-400">Ton lien public</p>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink-700">
                        {publicPortfolioUrl}
                      </code>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(publicPortfolioUrl)
                        }
                        className="shrink-0 rounded p-1 text-ink-400 hover:bg-cream-50 hover:text-ink-700"
                        title="Copier le lien"
                      >
                        <Copy size={14} />
                      </button>
                      {data.portfolio.is_published && (
                        <a
                          href={publicPortfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded p-1 text-ink-400 hover:bg-cream-50 hover:text-ink-700"
                          title="Ouvrir dans un nouvel onglet"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-baseline justify-between rounded bg-cream-100 px-3 py-2">
                  <span className="text-xs text-ink-500">Vues cumulées</span>
                  <span className="font-mono text-lg font-semibold text-ink-900">
                    {data.stats.portfolioViews}
                  </span>
                </div>
                <Link to="/portfolio" className="btn-secondary w-full">
                  Éditer mon portfolio
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Pas encore de portfolio"
                description="Crée-le en quelques minutes pour partager ton lien."
                action={{ label: 'Créer mon portfolio', to: '/portfolio' }}
              />
            )}
          </section>

          <section className="card">
            <SectionHeader title="Pipeline" icon={TrendingUp} />
            {loading || !data ? (
              <div className="h-40 animate-pulse rounded bg-cream-100" />
            ) : data.stats.totalProspects === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucun prospect"
                description="Ajoute ton premier prospect pour construire ton pipeline."
                action={{ label: 'Ajouter un prospect', to: '/crm' }}
              />
            ) : (
              <ul className="space-y-2">
                {PIPELINE_STAGES.map((s) => {
                  const count = data.pipeline.byStage[s.value] ?? 0
                  return (
                    <li
                      key={s.value}
                      className="flex items-center justify-between"
                    >
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${stageInfo(s.value).color}`}
                      >
                        {s.label}
                      </span>
                      <span className="font-mono text-sm font-semibold text-ink-800">
                        {count}
                      </span>
                    </li>
                  )
                })}
                <li className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
                  <span className="text-ink-500">Total</span>
                  <span className="font-mono font-semibold text-ink-900">
                    {data.stats.totalProspects}
                  </span>
                </li>
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string
  icon: typeof Target
  action?: { label: string; to: string }
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-ink-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
        >
          {action.label}
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-cream-100" />
      ))}
    </div>
  )
}

function formatMeetingWhen(d: Date) {
  if (isToday(d)) return `Aujourd’hui, ${format(d, 'HH:mm')}`
  if (isTomorrow(d)) return `Demain, ${format(d, 'HH:mm')}`
  return format(d, "EEEE d MMM, HH:mm", { locale: fr })
}
