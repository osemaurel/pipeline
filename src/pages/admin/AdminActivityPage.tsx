import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity, CreditCard, Search, Sparkles, UserPlus, Users } from 'lucide-react'
import { fetchGlobalActivity, type GlobalEvent } from '@/lib/adminData'

const ICONS: Record<GlobalEvent['type'], typeof Activity> = {
  signup: UserPlus, payment: CreditCard, prospect: Users, service: Sparkles, search: Search,
}
const TYPE_LABEL: Record<GlobalEvent['type'], string> = {
  signup: 'Inscriptions', payment: 'Paiements', prospect: 'Prospects', service: 'Services', search: 'Recherches',
}

export function AdminActivityPage() {
  const [events, setEvents] = useState<GlobalEvent[]>([])
  const [filter, setFilter] = useState<GlobalEvent['type'] | 'all'>('all')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const load = () => fetchGlobalActivity().then((e) => { setEvents(e); setLastUpdate(new Date()) })
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const shown = useMemo(() => (filter === 'all' ? events : events.filter((e) => e.type === filter)), [events, filter])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-ink-900">Activité globale</h1>
        <span className="flex items-center gap-1.5 text-xs text-ink-400">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success-500" />
          Rafraîchi {formatDistanceToNow(lastUpdate, { locale: fr, addSuffix: true })}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['all', 'signup', 'payment', 'prospect', 'service', 'search'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-ink-900 text-white' : 'bg-cream-200 text-ink-600 hover:bg-ink-100'}`}>
            {f === 'all' ? 'Tout' : TYPE_LABEL[f]}
          </button>
        ))}
      </div>

      <section className="card">
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Aucun événement.</p>
        ) : (
          <ul className="space-y-3">
            {shown.map((e, i) => {
              const Icon = ICONS[e.type]
              return (
                <li key={i} className="flex items-start gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-ink-500"><Icon size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800">{e.label}</p>
                    <p className="text-xs text-ink-400">{formatDistanceToNow(new Date(e.at), { locale: fr, addSuffix: true })}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
