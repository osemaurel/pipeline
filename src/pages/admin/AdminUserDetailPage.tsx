import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, Ban, Coins, ExternalLink, Loader2, Mail, MinusCircle, PlusCircle, RotateCcw, X,
} from 'lucide-react'
import {
  ACTION_LABELS, addCredits, fetchAdminProfile, fetchLogs, fetchUserActivity, fetchUserContent,
  fetchUserCredits, removeCredits, suspendUser, unsuspendUser,
  type ActivityEvent, type AdminLog, type AdminProfile, type UserContent,
} from '@/lib/adminData'
import { StatusBadge } from './AdminUsersPage'

type Tab = 'profil' | 'activite' | 'contenu' | 'historique'
type ModalKind = 'add' | 'remove' | 'suspend' | null

export function AdminUserDetailPage() {
  const { id = '' } = useParams()
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('profil')
  const [modal, setModal] = useState<ModalKind>(null)
  const [toast, setToast] = useState<string | null>(null)

  const reload = () => {
    fetchAdminProfile(id).then(setProfile)
    fetchUserCredits(id).then(setCredits)
  }
  useEffect(reload, [id])

  if (!profile) return <div className="py-10 text-center text-sm text-ink-400">Chargement…</div>

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/` : ''

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"><ArrowLeft size={15} />Retour à la liste</Link>

      {toast && (
        <div className="mb-4 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{toast}</div>
      )}

      <header className="card mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream-200 text-lg font-semibold text-ink-500">
              {profile.first_name.slice(0, 1)}{profile.last_name.slice(0, 1)}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-ink-900">{profile.first_name} {profile.last_name}</h1>
              <StatusBadge suspended={profile.is_suspended} paid={profile.has_paid} />
            </div>
            <p className="text-sm text-ink-500">{profile.email}</p>
            <p className="text-xs text-ink-400">Crédits restants : <span className="font-mono font-semibold text-ink-700">{credits ?? '—'}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal('add')} className="btn-secondary text-xs"><PlusCircle size={13} />Ajouter crédits</button>
          <button onClick={() => setModal('remove')} className="btn-secondary text-xs"><MinusCircle size={13} />Retirer crédits</button>
          {profile.is_suspended ? (
            <button onClick={async () => { await unsuspendUser(id); setToast('Compte réactivé.'); reload() }} className="inline-flex items-center gap-1.5 rounded border border-success-200 bg-success-50 px-3 py-2 text-xs font-semibold text-success-700 hover:bg-success-100"><RotateCcw size={13} />Réactiver</button>
          ) : (
            <button onClick={() => setModal('suspend')} className="inline-flex items-center gap-1.5 rounded border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700 hover:bg-danger-100"><Ban size={13} />Suspendre</button>
          )}
          <a href={`mailto:${profile.email}`} className="btn-secondary text-xs"><Mail size={13} />Email</a>
        </div>
      </header>

      <div className="mb-4 flex gap-4 border-b border-ink-200">
        {(['profil', 'activite', 'contenu', 'historique'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-1 py-2.5 text-sm font-medium capitalize transition ${tab === t ? 'border-accent-500 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-700'}`}>
            {t === 'activite' ? 'Activité' : t === 'historique' ? 'Historique admin' : t}
          </button>
        ))}
      </div>

      {tab === 'profil' && <ProfileTab p={profile} />}
      {tab === 'activite' && <ActivityTab userId={id} />}
      {tab === 'contenu' && <ContentTab userId={id} publicUrl={publicUrl} />}
      {tab === 'historique' && <HistoryTab userId={id} />}

      {modal && (
        <ActionModal
          kind={modal}
          userName={`${profile.first_name} ${profile.last_name}`}
          onClose={() => setModal(null)}
          onDone={(msg) => { setModal(null); setToast(msg); reload(); setTimeout(() => setToast(null), 4000) }}
          userId={id}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-ink-100 py-2 last:border-0">
      <div className="w-44 shrink-0 text-sm text-ink-400">{label}</div>
      <div className="text-sm text-ink-800">{value || <span className="text-ink-300">—</span>}</div>
    </div>
  )
}

function ProfileTab({ p }: { p: AdminProfile }) {
  return (
    <div className="space-y-4">
      <section className="card">
        <Row label="Entreprise" value={p.company_name} />
        <Row label="Poste" value={p.job_title} />
        <Row label="Type d'activité" value={p.business_type} />
        <Row label="Offre principale" value={p.main_offer} />
        <Row label="Pitch — problème" value={p.pitch_problem} />
        <Row label="Pitch — solution" value={p.pitch_solution} />
        <Row label="Proposition de valeur" value={p.pitch_proposition} />
        <Row label="Secteurs ICP" value={p.icp_sectors?.join(', ')} />
        <Row label="Canaux actifs" value={p.active_channels?.join(', ')} />
        <Row label="Inscrit le" value={format(new Date(p.created_at), 'd MMMM yyyy', { locale: fr })} />
        <Row label="Dernière activité" value={formatDistanceToNow(new Date(p.updated_at), { locale: fr, addSuffix: true })} />
      </section>

      <section className="card">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Paiement</h3>
        {p.has_paid ? (
          <Row label="Payé" value={`${p.amount_paid ?? '?'} ${p.currency ?? ''} — ${p.paid_at ? format(new Date(p.paid_at), 'd MMM yyyy', { locale: fr }) : ''}`} />
        ) : (
          <p className="text-sm text-ink-500">Aucun paiement enregistré.</p>
        )}
      </section>

      {p.is_suspended && (
        <section className="card border-danger-200 bg-danger-50">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger-600">Compte suspendu</h3>
          <Row label="Depuis" value={p.suspended_at ? format(new Date(p.suspended_at), 'd MMM yyyy HH:mm', { locale: fr }) : '—'} />
          <Row label="Raison" value={p.suspension_reason} />
        </section>
      )}
    </div>
  )
}

function ActivityTab({ userId }: { userId: string }) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null)
  useEffect(() => { fetchUserActivity(userId).then(setEvents) }, [userId])
  if (!events) return <div className="py-8 text-center text-sm text-ink-400">Chargement…</div>
  if (events.length === 0) return <p className="card text-center text-sm text-ink-400">Aucune activité.</p>
  return (
    <section className="card">
      <ul className="space-y-3">
        {events.map((e, i) => (
          <li key={i} className="flex items-start justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
            <span className="text-sm text-ink-700">{e.label}</span>
            <span className="shrink-0 text-xs text-ink-400">{formatDistanceToNow(new Date(e.at), { locale: fr, addSuffix: true })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ContentTab({ userId, publicUrl }: { userId: string; publicUrl: string }) {
  const [content, setContent] = useState<UserContent | null>(null)
  useEffect(() => { fetchUserContent(userId).then(setContent) }, [userId])
  if (!content) return <div className="py-8 text-center text-sm text-ink-400">Chargement…</div>
  return (
    <div className="space-y-4">
      <section className="card">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Portfolio</h3>
        {content.portfolio ? (
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${content.portfolio.is_published ? 'bg-success-500' : 'bg-ink-300'}`} />
              {content.portfolio.is_published ? 'En ligne' : 'Brouillon'} · {content.portfolio.view_count} vues
            </div>
            {content.portfolio.is_published && (
              <a href={`${publicUrl}${content.portfolio.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
                Ouvrir<ExternalLink size={12} />
              </a>
            )}
          </div>
        ) : <p className="text-sm text-ink-500">Pas de portfolio.</p>}
      </section>

      <section className="card">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Services générés ({content.services.length})</h3>
        {content.services.length === 0 ? <p className="text-sm text-ink-500">Aucun service.</p> : (
          <ul className="space-y-2">
            {content.services.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                {s.thumbnail_url ? <img src={s.thumbnail_url} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-cream-200" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-800">{s.title}</p>
                  <p className="text-xs text-ink-400">{s.platform} · {format(new Date(s.created_at), 'd MMM yyyy', { locale: fr })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Propositions Upwork ({content.proposals.length})</h3>
        {content.proposals.length === 0 ? <p className="text-sm text-ink-500">Aucune proposition.</p> : (
          <ul className="divide-y divide-ink-100">
            {content.proposals.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-800">{p.job_title ?? 'Candidature'}</span>
                <span className="text-xs text-ink-400">{p.is_used ? '✓ Utilisée' : ''} {format(new Date(p.created_at), 'd MMM', { locale: fr })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function HistoryTab({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<AdminLog[] | null>(null)
  useEffect(() => { fetchLogs({ targetUserId: userId, pageSize: 100 }).then((r) => setLogs(r.rows)) }, [userId])
  if (!logs) return <div className="py-8 text-center text-sm text-ink-400">Chargement…</div>
  if (logs.length === 0) return <p className="card text-center text-sm text-ink-400">Aucune action admin sur ce compte.</p>
  return (
    <section className="card">
      <ul className="space-y-3">
        {logs.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-ink-800">{ACTION_LABELS[l.action_type] ?? l.action_type}</p>
              <p className="text-xs text-ink-400">
                par {l.admin_name}
                {l.details && Object.keys(l.details).length > 0 && ' · ' + Object.entries(l.details).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(', ')}
              </p>
            </div>
            <span className="shrink-0 text-xs text-ink-400">{formatDistanceToNow(new Date(l.created_at), { locale: fr, addSuffix: true })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ActionModal({ kind, userId, userName, onClose, onDone }: {
  kind: 'add' | 'remove' | 'suspend'
  userId: string
  userName: string
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const [amount, setAmount] = useState('10')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titles = { add: 'Ajouter des crédits', remove: 'Retirer des crédits', suspend: 'Suspendre le compte' }
  const Icon = kind === 'suspend' ? Ban : Coins

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (kind === 'suspend' && !reason.trim()) return setError('La raison est obligatoire.')
    setLoading(true)
    let res: { error: string | null }
    if (kind === 'add') res = await addCredits(userId, Number(amount), reason)
    else if (kind === 'remove') res = await removeCredits(userId, Number(amount), reason)
    else res = await suspendUser(userId, reason)
    setLoading(false)
    if (res.error) return setError(res.error)
    onDone(kind === 'add' ? `${amount} crédits ajoutés.` : kind === 'remove' ? `${amount} crédits retirés.` : 'Compte suspendu.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="mt-16 w-full max-w-md rounded-lg border border-ink-100 bg-cream-50 shadow-lg">
        <header className="flex items-center justify-between border-b border-ink-100 p-4">
          <div className="flex items-center gap-2">
            <Icon size={18} className={kind === 'suspend' ? 'text-danger-600' : 'text-accent-600'} />
            <h2 className="text-base font-semibold text-ink-900">{titles[kind]}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-800"><X size={18} /></button>
        </header>
        <div className="space-y-3 p-4">
          <p className="text-sm text-ink-500">Utilisateur : <span className="font-medium text-ink-800">{userName}</span></p>
          {kind !== 'suspend' && (
            <div>
              <label className="label">Nombre de crédits</label>
              <input type="number" min="1" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label">Raison {kind === 'suspend' && <span className="text-danger-600">*</span>}</label>
            <textarea className="input min-h-[70px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === 'suspend' ? 'Motif de la suspension…' : 'Motif (optionnel)'} required={kind === 'suspend'} />
          </div>
          {error && <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-ink-100 p-4">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={loading} className={kind === 'suspend' ? 'inline-flex items-center gap-2 rounded bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-danger-700 disabled:opacity-50' : 'btn-primary'}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {kind === 'suspend' ? 'Suspendre' : 'Confirmer'}
          </button>
        </footer>
      </form>
    </div>
  )
}
