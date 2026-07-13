import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Ban, Coins, CreditCard, FileText, Search, Sparkles, TrendingUp, Users } from 'lucide-react'
import {
  fetchDashboardStats, fetchSignupsTrend, fetchUsers,
  type AdminUserRow, type DashboardStats,
} from '@/lib/adminData'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([])
  const [recent, setRecent] = useState<AdminUserRow[]>([])

  useEffect(() => {
    fetchDashboardStats().then(setStats)
    fetchSignupsTrend().then(setTrend)
    fetchUsers({ sort: 'created_desc', pageSize: 5 }).then((r) => setRecent(r.rows))
  }, [])

  const donut = stats
    ? [
        { name: 'Payants', value: stats.paid_users, color: '#17B26A' },
        { name: 'Non payants', value: Math.max(0, stats.total_users - stats.paid_users - stats.suspended_users), color: '#7F56D9' },
        { name: 'Suspendus', value: stats.suspended_users, color: '#F04438' },
      ]
    : []

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Vue d’ensemble</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Utilisateurs" value={stats ? fmt(stats.total_users) : '—'} icon={Users} />
        <Kpi label="Payants" value={stats ? fmt(stats.paid_users) : '—'} icon={CreditCard} accent />
        <Kpi label="Suspendus" value={stats ? fmt(stats.suspended_users) : '—'} icon={Ban} />
        <Kpi label="Revenus" value={stats ? fmt(stats.total_revenue) : '—'} hint="FCFA" icon={TrendingUp} />
        <Kpi label="Nouveaux 7j" value={stats ? fmt(stats.new_users_7d) : '—'} icon={Users} />
        <Kpi label="Nouveaux 30j" value={stats ? fmt(stats.new_users_30d) : '—'} icon={Users} />
        <Kpi label="Prospects" value={stats ? fmt(stats.total_prospects) : '—'} icon={Users} />
        <Kpi label="Services générés" value={stats ? fmt(stats.total_generated_services) : '—'} icon={Sparkles} />
        <Kpi label="Propositions Upwork" value={stats ? fmt(stats.total_upwork_proposals) : '—'} icon={FileText} />
        <Kpi label="Recherches leads" value={stats ? fmt(stats.total_lead_searches) : '—'} icon={Search} />
        <Kpi label="Crédits consommés" value={stats ? fmt(stats.total_credits_consumed) : '—'} icon={Coins} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Inscriptions (30 jours)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#7F56D9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EAEB" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'd/MM')} tick={{ fontSize: 10, fill: '#717680' }} interval={4} stroke="#D5D7DA" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#717680' }} stroke="#D5D7DA" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E9EAEB' }} labelFormatter={(d) => format(new Date(d), 'd MMM', { locale: fr })} />
              <Area type="monotone" dataKey="count" name="Inscriptions" stroke="#7F56D9" strokeWidth={2} fill="url(#sg)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">Répartition</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500">5 derniers inscrits</h2>
        <table className="w-full text-sm">
          <tbody>
            {recent.map((u) => (
              <tr key={u.user_id} className="border-b border-ink-100 last:border-0">
                <td className="py-2.5">
                  <p className="font-medium text-ink-800">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-ink-400">{u.email}</p>
                </td>
                <td className="py-2.5 text-xs text-ink-500">{format(new Date(u.created_at), 'd MMM yyyy', { locale: fr })}</td>
                <td className="py-2.5 text-right">
                  <Link to={`/admin/users/${u.user_id}`} className="text-xs font-medium text-accent-600 hover:underline">Voir la fiche</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Kpi({ label, value, hint, icon: Icon, accent }: { label: string; value: string; hint?: string; icon: typeof Users; accent?: boolean }) {
  return (
    <div className="card !p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent ? 'bg-accent-500/10 text-accent-600' : 'bg-ink-100 text-ink-500'}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-ink-900">{value}</p>
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  )
}
