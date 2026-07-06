import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Area,
  AreaChart,
} from 'recharts'
import {
  BarChart3,
  Coins,
  Eye,
  Target,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchStats,
  type PeriodDays,
  type StatsBundle,
} from '@/lib/statsData'
import { stageInfo } from '@/lib/pipelineStatus'
import { StatCard } from '@/components/dashboard/StatCard'

const CHANNEL_COLORS = [
  '#7F56D9',
  '#9E77ED',
  '#B692F6',
  '#D6BBFB',
  '#E9D7FE',
  '#D5D7DA',
  '#A9A59A',
]

export function StatsPage() {
  const user = useAuthStore((s) => s.user)
  const [days, setDays] = useState<PeriodDays>(30)
  const [data, setData] = useState<StatsBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchStats(user.id, days).then((b) => {
      setData(b)
      setLoading(false)
    })
  }, [user, days])

  const fmt = (n: number) => n.toLocaleString('fr-FR')

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            Statistiques
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Ce que tu peux mesurer, tu peux l'améliorer.
          </p>
        </div>
        <div className="flex overflow-hidden rounded border border-ink-200">
          {([7, 30, 90] as PeriodDays[]).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-2 text-sm transition ${
                days === d
                  ? 'bg-ink-900 text-white'
                  : 'bg-cream-50 text-ink-500 hover:bg-cream-100'
              }`}
            >
              {d}j
            </button>
          ))}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Prospects actifs"
          value={loading ? '—' : fmt(data?.kpis.activeProspects ?? 0)}
          icon={Users}
        />
        <StatCard
          label="Taux de conversion"
          value={loading ? '—' : `${data?.kpis.conversionRate ?? 0}%`}
          icon={TrendingUp}
          hint={
            data
              ? `${data.kpis.wonProspects} gagné(s) / ${data.kpis.wonProspects + data.kpis.lostProspects} clôturés`
              : undefined
          }
          accent
        />
        <StatCard
          label="CA gagné"
          value={loading ? '—' : fmt(data?.kpis.wonRevenue ?? 0)}
          icon={Trophy}
          hint="FCFA"
        />
        <StatCard
          label="Pipeline potentiel"
          value={loading ? '—' : fmt(data?.kpis.pipelineRevenue ?? 0)}
          icon={Coins}
          hint="FCFA"
        />
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Prospects perdus"
          value={loading ? '—' : fmt(data?.kpis.lostProspects ?? 0)}
          icon={XCircle}
        />
        <StatCard
          label="Vues portfolio"
          value={loading ? '—' : fmt(data?.kpis.portfolioViews ?? 0)}
          icon={Eye}
        />
        <StatCard
          label="Leads reçus"
          value={loading ? '—' : fmt(data?.kpis.totalLeads ?? 0)}
          icon={Target}
          hint="Depuis la page publique"
        />
        <StatCard
          label="Prospects gagnés"
          value={loading ? '—' : fmt(data?.kpis.wonProspects ?? 0)}
          icon={BarChart3}
        />
      </section>

      <section className="card mb-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-ink-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Activité quotidienne
          </h2>
        </div>
        {loading || !data ? (
          <div className="h-64 animate-pulse rounded bg-cream-100" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#7F56D9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillInteractions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#535862" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#535862" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EAEB" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#717680' }}
                interval={Math.max(0, Math.floor(data.daily.length / 8))}
                stroke="#D5D7DA"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#717680' }}
                stroke="#D5D7DA"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E9EAEB',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#535862' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="outbound"
                name="Outreach (LinkedIn + email + appels)"
                stroke="#7F56D9"
                strokeWidth={2}
                fill="url(#fillOutbound)"
              />
              <Area
                type="monotone"
                dataKey="interactions"
                name="Interactions enregistrées"
                stroke="#535862"
                strokeWidth={2}
                fill="url(#fillInteractions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-ink-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Répartition du pipeline
            </h2>
          </div>
          {loading || !data ? (
            <div className="h-64 animate-pulse rounded bg-cream-100" />
          ) : data.kpis.activeProspects + data.kpis.wonProspects + data.kpis.lostProspects === 0 ? (
            <EmptyChart message="Aucun prospect à afficher pour le moment." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.byStage}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EAEB" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#717680' }}
                  stroke="#D5D7DA"
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#717680' }}
                  stroke="#D5D7DA"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E9EAEB',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, key: string) =>
                    key === 'count' ? [v, 'Prospects'] : [v, key]
                  }
                />
                <Bar dataKey="count" fill="#7F56D9" radius={[6, 6, 0, 0]}>
                  {data.byStage.map((s, i) => (
                    <Cell
                      key={i}
                      fill={
                        s.stage === 'won'
                          ? '#17B26A'
                          : s.stage === 'lost'
                            ? '#F04438'
                            : '#7F56D9'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-ink-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Par canal d'acquisition
            </h2>
          </div>
          {loading || !data ? (
            <div className="h-64 animate-pulse rounded bg-cream-100" />
          ) : data.byChannel.length === 0 ? (
            <EmptyChart message="Aucune donnée sur les canaux." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byChannel}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.byChannel.map((_, i) => (
                    <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E9EAEB',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  verticalAlign="bottom"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={16} className="text-accent-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Top 5 prospects par valeur estimée
          </h2>
        </div>
        {loading || !data ? (
          <div className="h-32 animate-pulse rounded bg-cream-100" />
        ) : data.topProspects.length === 0 ? (
          <EmptyChart message="Ajoute des valeurs estimées à tes prospects pour classer ton pipeline." />
        ) : (
          <ul className="divide-y divide-ink-100">
            {data.topProspects.map((p, i) => {
              const s = stageInfo(p.status)
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="w-6 shrink-0 font-mono text-sm text-ink-400">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">{p.company}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}
                  >
                    {s.label}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-accent-700">
                    {fmt(p.estimated_deal_value)}{' '}
                    <span className="text-xs font-normal text-ink-400">FCFA</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="rounded border border-dashed border-ink-200 py-8 text-center text-sm text-ink-400">
      {message}
    </p>
  )
}
