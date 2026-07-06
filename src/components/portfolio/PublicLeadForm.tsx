import { FormEvent, useState } from 'react'
import { Check, Send } from 'lucide-react'
import { submitLead } from '@/lib/portfolioData'

interface Props {
  userId: string
  ownerFirstName?: string
}

export function PublicLeadForm({ userId, ownerFirstName }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return
    if (!email.trim() && !phone.trim()) {
      setError('Laisse au moins un email ou un téléphone pour être recontacté.')
      return
    }
    setSubmitting(true)
    const { error } = await submitLead({
      user_id: userId,
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      message: message.trim() || undefined,
    })
    setSubmitting(false)
    if (error) return setError(error)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-success-500/30 bg-success-500/5 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-500/10 text-success-600">
          <Check size={24} />
        </div>
        <h3 className="text-lg font-semibold text-ink-900">Message envoyé</h3>
        <p className="text-sm text-ink-600">
          {ownerFirstName ? `${ownerFirstName} te` : 'On te'} recontactera très
          bientôt.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-ink-100 bg-cream-50 p-6"
    >
      <h3 className="text-lg font-semibold text-ink-900">Demander un devis</h3>
      <p className="mt-1 text-sm text-ink-500">
        Décris ton projet en quelques mots — réponse rapide.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="label">Ton nom</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Téléphone / WhatsApp</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+221…"
            />
          </div>
        </div>
        <div>
          <label className="label">Ton projet</label>
          <textarea
            className="input min-h-[100px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ce que tu cherches, ton budget approximatif, tes deadlines…"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary mt-4 w-full"
      >
        <Send size={14} />
        {submitting ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
    </form>
  )
}
