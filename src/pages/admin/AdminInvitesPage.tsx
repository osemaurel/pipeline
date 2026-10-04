import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Plus,
  RotateCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import {
  deleteInvite,
  fetchInvites,
  revokeInvite,
  sendInvite,
  type Invite,
  type InviteStatus,
} from '@/lib/invitesData'

const STATUS_LABEL: Record<InviteStatus, string> = {
  pending: 'En attente',
  sent: 'Envoyée',
  accepted: 'Acceptée',
  expired: 'Expirée',
  revoked: 'Révoquée',
}
const STATUS_COLOR: Record<InviteStatus, string> = {
  pending: 'bg-ink-100 text-ink-600',
  sent: 'bg-warn-50 text-warn-700',
  accepted: 'bg-success-50 text-success-700',
  expired: 'bg-cream-200 text-ink-500',
  revoked: 'bg-danger-50 text-danger-700',
}

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

// Résume l'état d'accès d'un invité à partir des infos auth + profil.
//   - "Jamais ouvert" : last_sign_in_at est null → l'invité n'a pas cliqué le lien.
//   - "Lien ouvert, mdp à définir" : connecté au moins une fois mais needs_password_setup=true.
//   - "Onboarding en cours" : mdp défini mais onboarding pas terminé.
//   - "Actif" : tout est OK.
type AccessState =
  | { kind: 'never'; label: string; color: string; icon: typeof EyeOff }
  | { kind: 'opened'; label: string; color: string; icon: typeof Eye; at: string }
  | { kind: 'onboarding'; label: string; color: string; icon: typeof UserCheck; at: string }
  | { kind: 'active'; label: string; color: string; icon: typeof UserCheck; at: string }

function describeAccess(inv: Invite): AccessState | null {
  // RPC indisponible : on ne sait rien, on n'affiche pas le badge.
  if (inv.last_sign_in_at === undefined) return null

  if (!inv.last_sign_in_at) {
    return {
      kind: 'never',
      label: 'Lien jamais ouvert',
      color: 'bg-ink-100 text-ink-500',
      icon: EyeOff,
    }
  }
  const at = fmtDateTime(inv.last_sign_in_at)
  if (inv.needs_password_setup) {
    return {
      kind: 'opened',
      label: `Lien ouvert · mot de passe à définir`,
      color: 'bg-warn-50 text-warn-700',
      icon: Eye,
      at,
    }
  }
  if (inv.onboarding_completed === false) {
    return {
      kind: 'onboarding',
      label: `Onboarding en cours`,
      color: 'bg-accent-500/10 text-accent-700',
      icon: UserCheck,
      at,
    }
  }
  return {
    kind: 'active',
    label: `Actif`,
    color: 'bg-success-50 text-success-700',
    icon: UserCheck,
    at,
  }
}

export function AdminInvitesPage() {
  const [items, setItems] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [accessFilter, setAccessFilter] = useState<'all' | 'never' | 'opened' | 'active'>('all')
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchInvites().then((r) => {
      setItems(r)
      setLoading(false)
    })
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (q) {
        const matchQuery =
          it.email.toLowerCase().includes(q) ||
          (it.first_name ?? '').toLowerCase().includes(q) ||
          (it.notes ?? '').toLowerCase().includes(q)
        if (!matchQuery) return false
      }
      if (accessFilter === 'all') return true
      const a = describeAccess(it)
      if (!a) return true // RPC indisponible : on n'exclut pas
      if (accessFilter === 'never') return a.kind === 'never'
      if (accessFilter === 'opened') return a.kind === 'opened' || a.kind === 'onboarding'
      if (accessFilter === 'active') return a.kind === 'active'
      return true
    })
  }, [items, search, accessFilter])

  // Compteurs par état d'accès (pour les boutons de filtre)
  const accessCounts = useMemo(() => {
    const c = { never: 0, opened: 0, active: 0 }
    for (const it of items) {
      const a = describeAccess(it)
      if (!a) continue
      if (a.kind === 'never') c.never++
      else if (a.kind === 'opened' || a.kind === 'onboarding') c.opened++
      else if (a.kind === 'active') c.active++
    }
    return c
  }, [items])

  const counts = useMemo(() => {
    const m: Record<InviteStatus, number> = { pending: 0, sent: 0, accepted: 0, expired: 0, revoked: 0 }
    for (const it of items) m[it.status] = (m[it.status] ?? 0) + 1
    return m
  }, [items])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  const handleSent = (saved: Invite) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setShowForm(false)
    showToast(`Invitation envoyée à ${saved.email}`, true)
  }

  // Appelé après un envoi en lot : on fusionne les invitations créées sans
  // fermer la popup (laisse l'admin voir le récap).
  const handleBulkDone = (invites: Invite[], okCount: number) => {
    setItems((prev) => {
      const map = new Map(prev.map((it) => [it.id, it]))
      for (const inv of invites) map.set(inv.id, inv)
      return Array.from(map.values()).sort((a, b) =>
        (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      )
    })
    if (okCount > 0) {
      showToast(`${okCount} invitation${okCount > 1 ? 's' : ''} envoyée${okCount > 1 ? 's' : ''}`, true)
    }
  }

  const handleResend = async (inv: Invite) => {
    setBusyId(inv.id)
    const { data, error } = await sendInvite({
      email: inv.email,
      first_name: inv.first_name ?? undefined,
      credits_granted: inv.credits_granted,
      notes: inv.notes ?? undefined,
      resend: true,
    })
    setBusyId(null)
    if (error || !data) return showToast(error ?? 'Erreur.', false)
    handleSent(data.invite)
  }

  const handleRevoke = async (inv: Invite) => {
    if (!confirm(`Révoquer l'invitation à ${inv.email} ?`)) return
    setBusyId(inv.id)
    const { error } = await revokeInvite(inv.id)
    setBusyId(null)
    if (error) return showToast(error, false)
    setItems((prev) => prev.map((x) => (x.id === inv.id ? { ...x, status: 'revoked' as InviteStatus } : x)))
    showToast(`Invitation révoquée`, true)
  }

  const handleDelete = async (inv: Invite) => {
    if (!confirm(`Supprimer définitivement l'invitation à ${inv.email} ? (ne supprime pas le compte user)`)) return
    setBusyId(inv.id)
    const { error } = await deleteInvite(inv.id)
    setBusyId(null)
    if (error) return showToast(error, false)
    setItems((prev) => prev.filter((x) => x.id !== inv.id))
    showToast('Invitation supprimée', true)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink-900 sm:text-2xl">Invitations</h1>
          <p className="mt-1 text-sm text-ink-500">
            Envoie des accès aux early users avec un montant de crédits attribué.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex w-full items-center gap-1.5 text-sm sm:w-auto">
          <Plus size={14} />
          Nouvelle invitation
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex max-w-full overflow-x-auto whitespace-nowrap rounded border border-ink-200 text-xs">
          <span className="bg-cream-50 px-3 py-1.5 font-medium text-ink-500">
            Total : <span className="font-mono font-semibold text-ink-800">{items.length}</span>
          </span>
          <span className="border-l border-ink-200 bg-cream-50 px-3 py-1.5 font-medium text-ink-500">
            Envoyées : <span className="font-mono font-semibold text-warn-700">{counts.sent}</span>
          </span>
          <span className="border-l border-ink-200 bg-cream-50 px-3 py-1.5 font-medium text-ink-500">
            Acceptées : <span className="font-mono font-semibold text-success-700">{counts.accepted}</span>
          </span>
          <span className="border-l border-ink-200 bg-cream-50 px-3 py-1.5 font-medium text-ink-500">
            Révoquées : <span className="font-mono font-semibold text-danger-700">{counts.revoked}</span>
          </span>
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email, prénom, notes…"
            className="input pl-9 text-sm"
          />
        </div>
      </div>

      {/* Filtre par état d'accès */}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto sm:flex-wrap">
        {([
          { v: 'all', label: 'Toutes', color: 'bg-ink-900 text-white', count: items.length },
          { v: 'never', label: 'Jamais ouvert', color: 'bg-ink-500 text-white', count: accessCounts.never },
          { v: 'opened', label: 'Lien ouvert', color: 'bg-warn-500 text-white', count: accessCounts.opened },
          { v: 'active', label: 'Actifs', color: 'bg-success-500 text-white', count: accessCounts.active },
        ] as const).map((f) => {
          const active = accessFilter === f.v
          return (
            <button
              key={f.v}
              onClick={() => setAccessFilter(f.v)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? `${f.color} border-transparent`
                  : 'border-ink-200 bg-cream-50 text-ink-600 hover:bg-cream-100'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 font-mono ${active ? 'opacity-80' : 'text-ink-400'}`}>
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="rounded-lg border border-ink-100 bg-cream-50 py-16 text-center text-sm text-ink-400">
          Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 py-16 text-center text-sm text-ink-400">
          {items.length === 0
            ? "Aucune invitation envoyée pour l'instant."
            : 'Aucune invitation ne correspond à ta recherche.'}
        </div>
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-100 bg-cream-50">
          {visible.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-start gap-3 p-4 sm:flex-nowrap sm:items-center sm:gap-4">
              {(() => {
                const access = describeAccess(inv)
                const Icon = access?.icon ?? (inv.status === 'accepted' ? UserCheck : Mail)
                const iconColor =
                  access?.kind === 'active'
                    ? 'bg-success-500/10 text-success-600'
                    : access?.kind === 'opened' || access?.kind === 'onboarding'
                      ? 'bg-warn-500/10 text-warn-600'
                      : access?.kind === 'never'
                        ? 'bg-ink-100 text-ink-400'
                        : 'bg-accent-500/10 text-accent-600'
                return (
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColor}`}>
                    <Icon size={17} />
                  </span>
                )
              })()}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {inv.first_name ? `${inv.first_name} — ` : ''}
                    {inv.email}
                  </p>
                  {(() => {
                    const access = describeAccess(inv)
                    if (!access) {
                      // RPC indisponible : on retombe sur le statut de la table.
                      return (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[inv.status]}`}>
                          {STATUS_LABEL[inv.status]}
                        </span>
                      )
                    }
                    return (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${access.color}`}
                        title={access.kind !== 'never' ? `Dernière connexion : ${access.at}` : undefined}
                      >
                        {access.label}
                      </span>
                    )
                  })()}
                  {inv.status === 'revoked' && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR.revoked}`}>
                      Révoquée
                    </span>
                  )}
                  <span className="font-mono text-xs text-accent-700">
                    {inv.credits_granted} crédits
                  </span>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                  <Clock size={11} className="shrink-0" />
                  {inv.sent_at
                    ? `Envoyée le ${fmtDate(inv.sent_at)}`
                    : `Créée le ${fmtDate(inv.created_at)}`}
                  {inv.last_sign_in_at && (
                    <>
                      {' · '}Dernière connexion : {fmtDate(inv.last_sign_in_at)}
                    </>
                  )}
                  {!inv.last_sign_in_at && inv.last_resent_at && (
                    <>
                      {' · '}Dernier renvoi : {fmtDate(inv.last_resent_at)}
                    </>
                  )}
                </p>
                {inv.notes && <p className="mt-0.5 truncate text-xs italic text-ink-500">« {inv.notes} »</p>}
              </div>
              <div className="-my-1 flex shrink-0 basis-full items-center justify-end gap-1 sm:my-0 sm:basis-auto">
                <button
                  onClick={() => navigator.clipboard.writeText(inv.email)}
                  className="rounded p-2 text-ink-500 hover:bg-cream-100 hover:text-ink-800"
                  title="Copier l'email"
                >
                  <Copy size={14} />
                </button>
                {inv.status !== 'accepted' && inv.status !== 'revoked' && (
                  <button
                    onClick={() => handleResend(inv)}
                    disabled={busyId === inv.id}
                    className="rounded p-2 text-ink-500 hover:bg-cream-100 hover:text-ink-800 disabled:opacity-50"
                    title="Renvoyer l'email"
                  >
                    {busyId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                  </button>
                )}
                {inv.status !== 'revoked' && inv.status !== 'accepted' && (
                  <button
                    onClick={() => handleRevoke(inv)}
                    disabled={busyId === inv.id}
                    className="rounded p-2 text-ink-500 hover:bg-cream-100 hover:text-ink-800 disabled:opacity-50"
                    title="Révoquer"
                  >
                    <UserX size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(inv)}
                  disabled={busyId === inv.id}
                  className="rounded p-2 text-danger-500 hover:bg-danger-50 disabled:opacity-50"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <InviteForm
          onClose={() => setShowForm(false)}
          onSent={handleSent}
          onBulkDone={handleBulkDone}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.ok ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
          }`}
          role="status"
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// Extrait tous les emails d'une chaîne libre (coller depuis Excel, Notion,
// une liste séparée par virgules, retours à la ligne, point-virgule…).
// Retourne {valid, invalid} dédupliqués en minuscules.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const EMAIL_FULL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmailList(raw: string): { valid: string[]; invalid: string[] } {
  // On regarde d'abord ligne par ligne / token par token (pour isoler les
  // morceaux qui ne contiennent PAS d'arobase et les signaler comme invalides).
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const valid = new Set<string>()
  const invalid: string[] = []

  for (const t of tokens) {
    const matches = t.match(EMAIL_RE)
    if (!matches) {
      invalid.push(t)
      continue
    }
    for (const m of matches) {
      const low = m.toLowerCase()
      if (EMAIL_FULL_RE.test(low)) valid.add(low)
      else invalid.push(m)
    }
  }

  return { valid: Array.from(valid), invalid }
}

type Mode = 'single' | 'bulk'
type BulkRowStatus = 'pending' | 'sending' | 'ok' | 'error'
interface BulkRow {
  email: string
  status: BulkRowStatus
  message?: string
}

function InviteForm({
  onClose,
  onSent,
  onBulkDone,
}: {
  onClose: () => void
  onSent: (inv: Invite) => void
  onBulkDone: (invites: Invite[], okCount: number) => void
}) {
  const [mode, setMode] = useState<Mode>('single')

  // --- champs partagés -----------------------------------------------------
  const [credits, setCredits] = useState<string>('20')
  const [notes, setNotes] = useState('')

  // --- mode "un email" -----------------------------------------------------
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [singleSending, setSingleSending] = useState(false)
  const [singleError, setSingleError] = useState<string | null>(null)

  // --- mode "en lot" -------------------------------------------------------
  const [bulkText, setBulkText] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)

  const parsed = useMemo(() => parseEmailList(bulkText), [bulkText])
  const sending = singleSending || bulkSending

  const submitSingle = async (e: FormEvent) => {
    e.preventDefault()
    setSingleError(null)
    const emailTrim = email.trim().toLowerCase()
    if (!EMAIL_FULL_RE.test(emailTrim)) return setSingleError('Email invalide.')
    const n = Number(credits)
    if (!Number.isFinite(n) || n < 1 || n > 500) return setSingleError('Crédits : nombre entre 1 et 500.')
    setSingleSending(true)
    const { data, error } = await sendInvite({
      email: emailTrim,
      first_name: firstName.trim() || undefined,
      credits_granted: Math.round(n),
      notes: notes.trim() || undefined,
    })
    setSingleSending(false)
    if (error || !data) return setSingleError(error ?? 'Erreur.')
    onSent(data.invite)
  }

  const startBulk = async (e: FormEvent) => {
    e.preventDefault()
    const n = Number(credits)
    if (!Number.isFinite(n) || n < 1 || n > 500) {
      return
    }
    if (parsed.valid.length === 0) return

    const initial: BulkRow[] = parsed.valid.map((em) => ({ email: em, status: 'pending' }))
    setBulkRows(initial)
    setBulkSending(true)
    setBulkDone(false)

    const sentInvites: Invite[] = []
    let okCount = 0

    // Envoi séquentiel : Resend accepte volontiers, mais on reste prudent
    // pour éviter un rate limit sur l'edge function (et laisser l'admin
    // voir la progression). ~1 par 400ms = ~2.5/s.
    for (let i = 0; i < initial.length; i++) {
      const row = initial[i]
      setBulkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'sending' } : r)))

      const { data, error } = await sendInvite({
        email: row.email,
        credits_granted: Math.round(n),
        notes: notes.trim() || undefined,
      })

      if (error || !data) {
        setBulkRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: 'error', message: error ?? 'Erreur inconnue' } : r,
          ),
        )
      } else {
        sentInvites.push(data.invite)
        okCount++
        setBulkRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'ok' } : r)),
        )
      }

      // petite pause pour ne pas marteler l'API
      if (i < initial.length - 1) await new Promise((r) => setTimeout(r, 400))
    }

    setBulkSending(false)
    setBulkDone(true)
    onBulkDone(sentInvites, okCount)
  }

  const resetBulk = () => {
    setBulkText('')
    setBulkRows([])
    setBulkDone(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-xl">
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 p-5">
          <h2 className="text-lg font-semibold text-ink-900">Nouvelle invitation</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-ink-400 hover:text-ink-800 disabled:opacity-50"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </header>

        {/* Onglets : un email vs envoi en lot */}
        <div className="grid grid-cols-2 gap-1 border-b border-ink-100 bg-cream-100 p-1.5">
          {([
            { v: 'single', label: 'Un email', icon: Mail },
            { v: 'bulk', label: 'En lot', icon: Users },
          ] as const).map((t) => {
            const Icon = t.icon
            const active = mode === t.v
            return (
              <button
                key={t.v}
                type="button"
                disabled={sending}
                onClick={() => setMode(t.v)}
                className={`flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  active ? 'bg-cream-50 text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ------------------------------------------------ MODE SINGLE */}
        {mode === 'single' && (
          <form onSubmit={submitSingle}>
            <div className="space-y-4 p-5">
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="freelance@example.com"
                />
              </div>
              <div>
                <label className="label">Prénom (optionnel)</label>
                <input
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Pour personnaliser l'email"
                />
              </div>
              <SharedFields credits={credits} setCredits={setCredits} notes={notes} setNotes={setNotes} />

              {singleError && (
                <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
                  {singleError}
                </p>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
              <button type="button" onClick={onClose} disabled={singleSending} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={singleSending} className="btn-primary">
                {singleSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Envoyer l'invitation
                  </>
                )}
              </button>
            </footer>
          </form>
        )}

        {/* ------------------------------------------------ MODE BULK */}
        {mode === 'bulk' && !bulkDone && (
          <form onSubmit={startBulk}>
            <div className="space-y-4 p-5">
              <div>
                <label className="label">Colle ta liste d'emails *</label>
                <textarea
                  className="input min-h-[140px] font-mono text-sm"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'alice@example.com\nbob@example.com, charlie@example.com\n…'}
                  disabled={bulkSending}
                  autoFocus
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {parsed.valid.length > 0 && (
                    <span className="rounded-full bg-success-50 px-2.5 py-1 font-medium text-success-700">
                      {parsed.valid.length} email{parsed.valid.length > 1 ? 's' : ''} détecté{parsed.valid.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {parsed.invalid.length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-warn-50 px-2.5 py-1 font-medium text-warn-700">
                      <AlertCircle size={11} />
                      {parsed.invalid.length} ignoré{parsed.invalid.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {parsed.valid.length === 0 && (
                    <span className="text-ink-400">
                      Virgules, retours à la ligne, espaces, point-virgules — tout fonctionne.
                    </span>
                  )}
                </div>
                {parsed.invalid.length > 0 && (
                  <p className="mt-1 break-words text-[11px] text-warn-700">
                    Ignorés : {parsed.invalid.slice(0, 10).join(', ')}
                    {parsed.invalid.length > 10 ? '…' : ''}
                  </p>
                )}
              </div>

              <SharedFields credits={credits} setCredits={setCredits} notes={notes} setNotes={setNotes} />

              <div className="rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-xs text-warn-700">
                Chaque email recevra une invitation séparée avec les mêmes crédits et la même note.
                L'envoi est séquentiel (~1 toutes les 400 ms) ; garde la fenêtre ouverte jusqu'à la fin.
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
              <button type="button" onClick={onClose} disabled={bulkSending} className="btn-secondary">
                Annuler
              </button>
              <button
                type="submit"
                disabled={bulkSending || parsed.valid.length === 0}
                className="btn-primary"
              >
                <Check size={16} />
                Envoyer {parsed.valid.length > 0 ? `à ${parsed.valid.length}` : ''} invité{parsed.valid.length > 1 ? 's' : ''}
              </button>
            </footer>
          </form>
        )}

        {/* ------------------------------------------------ PROGRESSION BULK */}
        {mode === 'bulk' && (bulkSending || bulkDone) && (
          <>
            <div className="space-y-3 p-5">
              <BulkProgress rows={bulkRows} sending={bulkSending} />
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
              {!bulkSending && (
                <button type="button" onClick={resetBulk} className="btn-secondary">
                  Envoyer un autre lot
                </button>
              )}
              <button type="button" onClick={onClose} disabled={bulkSending} className="btn-primary">
                {bulkSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours…
                  </>
                ) : (
                  <>Fermer</>
                )}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function SharedFields({
  credits, setCredits, notes, setNotes,
}: {
  credits: string
  setCredits: (v: string) => void
  notes: string
  setNotes: (v: string) => void
}) {
  return (
    <>
      <div>
        <label className="label">Crédits attribués *</label>
        <input
          type="number"
          min="1"
          max="500"
          required
          className="input max-w-[140px]"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-ink-400">
          Entre 1 et 500. Appliqués à chaque invité du lot.
        </p>
      </div>
      <div>
        <label className="label">Notes internes (optionnel)</label>
        <textarea
          className="input min-h-[60px] text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex : promo early users oct 2026…"
        />
        <p className="mt-1 text-[11px] text-ink-400">
          Visible uniquement par toi dans l'admin.
        </p>
      </div>
    </>
  )
}

function BulkProgress({ rows, sending }: { rows: BulkRow[]; sending: boolean }) {
  const okCount = rows.filter((r) => r.status === 'ok').length
  const errCount = rows.filter((r) => r.status === 'error').length
  const total = rows.length
  const pct = total === 0 ? 0 : Math.round(((okCount + errCount) / total) * 100)

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {sending ? 'Envoi en cours…' : 'Terminé'}
          </p>
          <p className="text-xs text-ink-500">
            {okCount} / {total} envoyé{okCount > 1 ? 's' : ''}
            {errCount > 0 && ` · ${errCount} échec${errCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <span className="font-mono text-lg font-semibold text-ink-800">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full bg-accent-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="max-h-[280px] space-y-1 overflow-y-auto rounded border border-ink-100 bg-cream-50 p-2 text-xs">
        {rows.map((r) => (
          <li key={r.email} className="flex items-center gap-2 px-2 py-1">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {r.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />}
              {r.status === 'sending' && <Loader2 size={13} className="animate-spin text-accent-500" />}
              {r.status === 'ok' && <Check size={13} className="text-success-500" />}
              {r.status === 'error' && <AlertCircle size={13} className="text-danger-500" />}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono">{r.email}</span>
            {r.message && (
              <span className="shrink-0 truncate text-[11px] text-danger-600" title={r.message}>
                {r.message.slice(0, 40)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
