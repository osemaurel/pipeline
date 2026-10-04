import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import {
  downloadCsv, fetchAllUsersForExport, fetchUsers,
  type AdminUserRow, type UserSort, type UserStatusFilter,
} from '@/lib/adminData'

const PAGE_SIZE = 20

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<UserStatusFilter>('all')
  const [sort, setSort] = useState<UserSort>('created_desc')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    fetchUsers({ search: debounced, status, sort, page, pageSize: PAGE_SIZE }).then((r) => {
      setRows(r.rows); setTotal(r.total); setLoading(false)
    })
  }, [debounced, status, sort, page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const exportCsv = async () => {
    const all = await fetchAllUsersForExport({ search: debounced, status, sort })
    downloadCsv(
      'utilisateurs-topcloz.csv',
      ['Nom', 'Email', 'Inscription', 'Statut', 'Crédits', 'Prospects', 'Services'],
      all.map((u) => [
        `${u.first_name} ${u.last_name}`, u.email,
        format(new Date(u.created_at), 'yyyy-MM-dd'),
        u.is_suspended ? 'Suspendu' : u.has_paid ? 'Payant' : 'Non payant',
        u.credits_remaining, u.prospects_count, u.services_count,
      ]),
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <h1 className="text-xl font-semibold text-ink-900 sm:text-2xl">Utilisateurs <span className="font-mono text-base text-ink-400">({total})</span></h1>
        <button onClick={exportCsv} className="btn-secondary" aria-label="Exporter en CSV">
          <Download size={14} />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input pl-9" placeholder="Chercher par nom ou email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input min-w-0 flex-1 sm:max-w-[170px] sm:flex-none" value={status} onChange={(e) => { setStatus(e.target.value as UserStatusFilter); setPage(0) }}>
          <option value="all">Tous les statuts</option>
          <option value="paid">Payants</option>
          <option value="unpaid">Non payants</option>
          <option value="suspended">Suspendus</option>
        </select>
        <select className="input min-w-0 flex-1 sm:max-w-[190px] sm:flex-none" value={sort} onChange={(e) => setSort(e.target.value as UserSort)}>
          <option value="created_desc">Plus récents</option>
          <option value="created_asc">Plus anciens</option>
          <option value="credits_desc">Crédits ↓</option>
          <option value="activity_desc">Activité ↓</option>
        </select>
      </div>

      <div className="card overflow-hidden !p-0">
        {/* Mobile : cartes cliquables */}
        <ul className="divide-y divide-ink-100 md:hidden">
          {loading ? (
            <li className="py-10 text-center text-sm text-ink-400">Chargement…</li>
          ) : rows.length === 0 ? (
            <li className="py-10 text-center text-sm text-ink-400">Aucun utilisateur.</li>
          ) : rows.map((u) => (
            <li key={u.user_id}>
              <Link to={`/admin/users/${u.user_id}`} className="flex items-center gap-3 px-4 py-3 active:bg-cream-100">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-semibold text-ink-500">
                    {u.first_name.slice(0, 1)}{u.last_name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink-800">{u.first_name} {u.last_name}</p>
                    <StatusBadge suspended={u.is_suspended} paid={u.has_paid} />
                  </div>
                  <p className="truncate text-xs text-ink-400">{u.email}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-500">
                    {u.credits_remaining} crédits · {u.prospects_count} prospects · {u.services_count} services
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-300" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-3 py-3 font-medium">Inscription</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 text-right font-medium">Crédits</th>
                <th className="px-3 py-3 text-right font-medium">Prospects</th>
                <th className="px-3 py-3 text-right font-medium">Services</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-ink-400">Chargement…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-ink-400">Aucun utilisateur.</td></tr>
              ) : rows.map((u) => (
                <tr key={u.user_id} className="border-b border-ink-100 last:border-0 hover:bg-cream-100">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-xs font-semibold text-ink-500">
                          {u.first_name.slice(0, 1)}{u.last_name.slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-800">{u.first_name} {u.last_name}</p>
                        <p className="truncate text-xs text-ink-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-ink-500">{format(new Date(u.created_at), 'd MMM yyyy', { locale: fr })}</td>
                  <td className="px-3 py-2.5"><StatusBadge suspended={u.is_suspended} paid={u.has_paid} /></td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-700">{u.credits_remaining}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-700">{u.prospects_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-700">{u.services_count}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/admin/users/${u.user_id}`} className="text-xs font-medium text-accent-600 hover:underline">Voir la fiche</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
          <span className="text-xs text-ink-400">Page {page + 1} / {pages}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Page précédente" className="flex h-10 w-10 items-center justify-center rounded border border-ink-200 text-ink-500 disabled:opacity-40 hover:bg-cream-100 sm:h-8 sm:w-8"><ChevronLeft size={15} /></button>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Page suivante" className="flex h-10 w-10 items-center justify-center rounded border border-ink-200 text-ink-500 disabled:opacity-40 hover:bg-cream-100 sm:h-8 sm:w-8"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatusBadge({ suspended, paid }: { suspended: boolean; paid: boolean }) {
  if (suspended) return <span className="rounded-full bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-700">Suspendu</span>
  if (paid) return <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">Payant</span>
  return <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">Non payant</span>
}
