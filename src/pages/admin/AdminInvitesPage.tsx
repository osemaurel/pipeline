import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clock,
  Copy,
  Loader2,
  Mail,
  Plus,
  RotateCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
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

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function AdminInvitesPage() {
  const [items, setItems] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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
    if (!q) return items
    return items.filter(
      (it) =>
        it.email.toLowerCase().includes(q) ||
        (it.first_name ?? '').toLowerCase().includes(q) ||
        (it.notes ?? '').toLowerCase().includes(q),
    )
  }, [items, search])

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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Invitations</h1>
          <p className="mt-1 text-sm text-ink-500">
            Envoie des accès aux early users avec un montant de crédits attribué.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} />
          Nouvelle invitation
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded border border-ink-200 text-xs">
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
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email, prénom, notes…"
            className="input pl-9 text-sm"
          />
        </div>
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
            <li key={inv.id} className="flex items-center gap-4 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500/10 text-accent-600">
                {inv.status === 'accepted' ? <UserCheck size={17} /> : <Mail size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {inv.first_name ? `${inv.first_name} — ` : ''}
                    {inv.email}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[inv.status]}`}>
                    {STATUS_LABEL[inv.status]}
                  </span>
                  <span className="font-mono text-xs text-accent-700">
                    {inv.credits_granted} crédits
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                  <Clock size={11} className="shrink-0" />
                  {inv.status === 'accepted'
                    ? `Acceptée le ${fmtDate(inv.accepted_at)}`
                    : inv.sent_at
                      ? `Envoyée le ${fmtDate(inv.sent_at)}`
                      : `Créée le ${fmtDate(inv.created_at)}`}
                  {inv.last_resent_at && (
                    <>
                      {' · '}Dernier renvoi : {fmtDate(inv.last_resent_at)}
                    </>
                  )}
                </p>
                {inv.notes && <p className="mt-0.5 truncate text-xs italic text-ink-500">« {inv.notes} »</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
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

      {showForm && <InviteForm onClose={() => setShowForm(false)} onSent={handleSent} />}

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

function InviteForm({ onClose, onSent }: { onClose: () => void; onSent: (inv: Invite) => void }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [credits, setCredits] = useState<string>('20')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const emailTrim = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) return setError('Email invalide.')
    const n = Number(credits)
    if (!Number.isFinite(n) || n < 1 || n > 500) return setError('Crédits : nombre entre 1 et 500.')
    setSending(true)
    const { data, error } = await sendInvite({
      email: emailTrim,
      first_name: firstName.trim() || undefined,
      credits_granted: Math.round(n),
      notes: notes.trim() || undefined,
    })
    setSending(false)
    if (error || !data) return setError(error ?? 'Erreur.')
    onSent(data.invite)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-sm sm:p-6">
      <form
        onSubmit={submit}
        className="mt-6 w-full max-w-md rounded-lg border border-ink-100 bg-cream-50 shadow-lg"
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 p-5">
          <h2 className="text-lg font-semibold text-ink-900">Nouvelle invitation</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-ink-400 hover:text-ink-800"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </header>

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
              Entre 1 et 500. Iront dans son solde recherche prospects + génération IA.
            </p>
          </div>
          <div>
            <label className="label">Notes internes (optionnel)</label>
            <textarea
              className="input min-h-[60px] text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : contact LinkedIn, référé par X…"
            />
            <p className="mt-1 text-[11px] text-ink-400">Visible uniquement par toi dans l'admin.</p>
          </div>

          <div className="rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-xs text-warn-700">
            L'email d'invitation sera envoyé immédiatement depuis <strong>hello@topcloz.com</strong> avec un lien magique. Le compte est pré-marqué comme payé.
          </div>

          {error && (
            <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
          <button type="button" onClick={onClose} disabled={sending} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={sending} className="btn-primary">
            {sending ? (
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
    </div>
  )
}
