import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { ACTION_LABELS, downloadCsv, fetchLogs, type AdminLog } from '@/lib/adminData'

const PAGE_SIZE = 25

export function AdminLogsPage() {
  const [rows, setRows] = useState<AdminLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [actionType, setActionType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLogs({ actionType: actionType || undefined, page, pageSize: PAGE_SIZE }).then((r) => {
      setRows(r.rows); setTotal(r.total); setLoading(false)
    })
  }, [actionType, page])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const exportCsv = async () => {
    const all = await fetchLogs({ actionType: actionType || undefined, pageSize: 5000 })
    downloadCsv(
      'logs-admin-pipeline.csv',
      ['Date', 'Admin', 'Action', 'Cible', 'Détails'],
      all.rows.map((l) => [
        format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
        l.admin_name ?? '', ACTION_LABELS[l.action_type] ?? l.action_type, l.target_name ?? '',
        l.details ? JSON.stringify(l.details) : '',
      ]),
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink-900">Logs admin <span className="font-mono text-base text-ink-400">({total})</span></h1>
        <div className="flex items-center gap-2">
          <select className="input max-w-[180px]" value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(0) }}>
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={exportCsv} className="btn-secondary"><Download size={14} />Export CSV</button>
        </div>
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Admin</th>
                <th className="px-3 py-3 font-medium">Action</th>
                <th className="px-3 py-3 font-medium">Utilisateur cible</th>
                <th className="px-4 py-3 font-medium">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Chargement…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-ink-400">Aucun log.</td></tr>
              ) : rows.map((l) => (
                <tr key={l.id} className="border-b border-ink-100 last:border-0 hover:bg-cream-100">
                  <td className="px-4 py-2.5 text-xs text-ink-500">{format(new Date(l.created_at), 'd MMM yyyy HH:mm', { locale: fr })}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {l.admin_avatar ? <img src={l.admin_avatar} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 text-[10px] font-semibold text-ink-500">{l.admin_name?.slice(0, 2).toUpperCase()}</span>}
                      <span className="text-ink-700">{l.admin_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><span className="rounded-full bg-cream-200 px-2 py-0.5 text-xs font-medium text-ink-600">{ACTION_LABELS[l.action_type] ?? l.action_type}</span></td>
                  <td className="px-3 py-2.5">
                    {l.target_user_id ? <Link to={`/admin/users/${l.target_user_id}`} className="text-ink-700 hover:text-accent-600 hover:underline">{l.target_name}</Link> : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-500">
                    {l.details && Object.keys(l.details).length > 0 ? Object.entries(l.details).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
          <span className="text-xs text-ink-400">Page {page + 1} / {pages}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="flex h-8 w-8 items-center justify-center rounded border border-ink-200 text-ink-500 disabled:opacity-40 hover:bg-cream-100"><ChevronLeft size={15} /></button>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="flex h-8 w-8 items-center justify-center rounded border border-ink-200 text-ink-500 disabled:opacity-40 hover:bg-cream-100"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
