import { useEffect, useMemo, useState } from 'react'
import {
  KanbanSquare,
  List,
  Plus,
  Search,
  Star,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { PIPELINE_STAGES, ACTIVE_STAGES } from '@/lib/pipelineStatus'
import { fetchProspects, type Prospect } from '@/lib/crmData'
import { ProspectListItem } from '@/components/crm/ProspectListItem'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { ProspectForm } from '@/components/crm/ProspectForm'
import { ProspectDrawer } from '@/components/crm/ProspectDrawer'
import { updateProspect } from '@/lib/crmData'

type View = 'list' | 'kanban'

export function CrmPage() {
  const user = useAuthStore((s) => s.user)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'won' | string>('active')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchProspects(user.id).then((data) => {
      setProspects(data)
      setLoading(false)
    })
  }, [user])

  const filtered = useMemo(() => {
    let list = prospects
    if (statusFilter === 'active') {
      list = list.filter((p) => (ACTIVE_STAGES as string[]).includes(p.status))
    } else if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (favoritesOnly) list = list.filter((p) => p.is_favorite)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          p.company_name.toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [prospects, statusFilter, favoritesOnly, search])

  const stats = useMemo(() => {
    const active = prospects.filter((p) =>
      (ACTIVE_STAGES as string[]).includes(p.status),
    ).length
    const totalValue = prospects
      .filter((p) => (ACTIVE_STAGES as string[]).includes(p.status))
      .reduce((sum, p) => sum + (p.estimated_deal_value ?? 0), 0)
    const won = prospects.filter((p) => p.status === 'won').length
    return { active, totalValue, won, total: prospects.length }
  }, [prospects])

  const selected = selectedId
    ? prospects.find((p) => p.id === selectedId) ?? null
    : null

  const onProspectSaved = (p: Prospect) => {
    setProspects((prev) => {
      const exists = prev.some((x) => x.id === p.id)
      return exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    })
  }

  const onProspectDeleted = (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const onKanbanMove = async (p: Prospect, newStage: string) => {
    setProspects((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, status: newStage } : x)),
    )
    const { data, error } = await updateProspect(p.id, { status: newStage })
    if (error) {
      setProspects((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: p.status } : x)),
      )
    } else if (data) {
      setProspects((prev) => prev.map((x) => (x.id === p.id ? data : x)))
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">CRM</h1>
          <p className="mt-1 text-sm text-ink-500">
            Tes prospects, ton pipeline, ton pouls commercial.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={14} />
          Ajouter un prospect
        </button>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Actifs" value={stats.active} />
        <MiniStat label="Gagnés" value={stats.won} />
        <MiniStat label="Total" value={stats.total} />
        <MiniStat
          label="Pipeline (FCFA)"
          value={stats.totalValue.toLocaleString('fr-FR')}
        />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded border border-ink-200">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition ${
              view === 'list'
                ? 'bg-ink-900 text-white'
                : 'bg-cream-50 text-ink-500 hover:bg-cream-100'
            }`}
          >
            <List size={14} />
            Liste
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition ${
              view === 'kanban'
                ? 'bg-ink-900 text-white'
                : 'bg-cream-50 text-ink-500 hover:bg-cream-100'
            }`}
          >
            <KanbanSquare size={14} />
            Pipeline
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300"
          />
          <input
            className="input pl-9"
            placeholder="Chercher un prospect ou une entreprise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Actifs</option>
          <option value="all">Tous</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`flex items-center gap-1 rounded border px-3 py-2 text-sm transition ${
            favoritesOnly
              ? 'border-accent-500 bg-accent-500/10 text-accent-700'
              : 'border-ink-200 text-ink-500 hover:bg-cream-100'
          }`}
        >
          <Star size={13} fill={favoritesOnly ? 'currentColor' : 'none'} />
          Favoris
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-cream-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyProspects hasAny={prospects.length > 0} onAdd={() => setShowAdd(true)} />
      ) : view === 'list' ? (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ProspectListItem
              key={p.id}
              prospect={p}
              onClick={() => setSelectedId(p.id)}
              active={selectedId === p.id}
            />
          ))}
        </div>
      ) : (
        <KanbanBoard
          prospects={filtered}
          onOpen={(p) => setSelectedId(p.id)}
          onMove={onKanbanMove}
        />
      )}

      {selected && user && (
        <ProspectDrawer
          userId={user.id}
          prospect={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={onProspectSaved}
          onDeleted={onProspectDeleted}
        />
      )}

      {showAdd && user && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/20 p-6 backdrop-blur-sm">
          <div className="mt-8 w-full max-w-2xl rounded-lg bg-cream-50 p-6 shadow-2xl">
            <ProspectForm
              userId={user.id}
              onSaved={(p) => {
                onProspectSaved(p)
                setShowAdd(false)
                setSelectedId(p.id)
              }}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="card !p-4">
      <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  )
}

function EmptyProspects({
  hasAny,
  onAdd,
}: {
  hasAny: boolean
  onAdd: () => void
}) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-200 text-ink-400">
        <Users size={22} />
      </div>
      <h3 className="text-lg font-semibold text-ink-900">
        {hasAny ? 'Aucun résultat' : 'Aucun prospect'}
      </h3>
      <p className="max-w-md text-sm text-ink-500">
        {hasAny
          ? 'Aucun prospect ne correspond à tes filtres actuels.'
          : 'Ajoute ton premier prospect pour commencer à construire ton pipeline.'}
      </p>
      {!hasAny && (
        <button onClick={onAdd} className="btn-primary mt-2">
          <Plus size={14} />
          Ajouter un prospect
        </button>
      )}
    </div>
  )
}
