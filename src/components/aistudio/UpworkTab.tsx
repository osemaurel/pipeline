import { useEffect, useState } from 'react'
import { Check, Copy, History, Loader2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  fetchUpworkProposals,
  generateUpworkProposal,
  markProposalUsed,
  type UpworkProposal,
} from '@/lib/aiStudioData'

interface Props {
  userId: string
  onCredits: (n: number) => void
}

export function UpworkTab({ userId, onCredits }: Props) {
  const [offer, setOffer] = useState('')
  const [current, setCurrent] = useState<UpworkProposal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<UpworkProposal[]>([])

  useEffect(() => {
    fetchUpworkProposals(userId).then(setHistory)
  }, [userId])

  const run = async () => {
    if (offer.trim().length < 30) return
    setLoading(true)
    setError(null)
    setCurrent(null)
    const { data, error } = await generateUpworkProposal(offer.trim())
    setLoading(false)
    if (error || !data) return setError(error ?? 'Erreur.')
    setCurrent(data.proposal)
    setHistory((prev) => [data.proposal, ...prev])
    onCredits(data.credits_remaining)
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleUsed = async (p: UpworkProposal) => {
    await markProposalUsed(p.id, !p.is_used)
    setHistory((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_used: !x.is_used } : x)))
    if (current?.id === p.id) setCurrent({ ...current, is_used: !current.is_used })
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <label className="label">Colle ici le texte de l’offre Upwork</label>
        <textarea
          className="input min-h-[160px]"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Copie-colle la description complète de l'offre Upwork…"
        />
        <p className="mt-1.5 text-xs text-ink-400">
          Copie le texte de l’offre directement. Les liens ne sont pas supportés car les offres Upwork sont derrière un login.
        </p>
        {error && (
          <p className="mt-3 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">{error}</p>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={run} disabled={loading || offer.trim().length < 30} className="btn-primary">
            {loading ? (<><Loader2 size={15} className="animate-spin" />Génération…</>) : (<><Send size={15} />Générer ma candidature (1 crédit)</>)}
          </button>
        </div>
      </section>

      {current && (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              {current.job_title ?? 'Candidature générée'}
            </h2>
            <button onClick={() => copy(current.generated_proposal)} className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline">
              {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <textarea
            className="input min-h-[280px] whitespace-pre-wrap text-sm leading-relaxed"
            value={current.generated_proposal}
            onChange={(e) => setCurrent({ ...current, generated_proposal: e.target.value })}
          />
          <p className="mt-2 text-xs text-ink-400">Tu peux éditer avant de copier.</p>
        </section>
      )}

      {history.length > 0 && (
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <History size={16} className="text-ink-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Historique</h2>
          </div>
          <ul className="divide-y divide-ink-100">
            {history.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <button onClick={() => setCurrent(p)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-ink-800">{p.job_title ?? 'Candidature'}</p>
                  <p className="text-xs text-ink-400">
                    {formatDistanceToNow(new Date(p.created_at), { locale: fr, addSuffix: true })}
                  </p>
                </button>
                <button
                  onClick={() => toggleUsed(p)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    p.is_used ? 'bg-success-50 text-success-700' : 'border border-ink-200 text-ink-500 hover:bg-cream-100'
                  }`}
                >
                  {p.is_used ? '✓ Utilisée' : 'Marquer utilisée'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
