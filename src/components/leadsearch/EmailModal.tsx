import { useEffect, useMemo, useState } from 'react'
import { Mail, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { LeadResult } from '@/lib/leadSearchData'

interface Template {
  id: string
  title: string
  subject: string | null
  content: string
}

interface Props {
  userId: string
  result: LeadResult
  onClose: () => void
  onSent: () => void // déclenché après ouverture du mailto + marquage contacté
}

function fillVars(text: string, result: LeadResult): string {
  const owner = result.owner_name?.trim() ?? ''
  const firstName = owner ? owner.split(/\s+/)[0] : ''
  return text
    .replace(/\{prenom\}/gi, firstName || 'Bonjour')
    .replace(/\{nom\}/gi, owner)
    .replace(/\{entreprise\}/gi, result.business_name)
}

export function EmailModal({ userId, result, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [email, setEmail] = useState(result.email ?? '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase
      .from('templates')
      .select('id, title, subject, content')
      .eq('user_id', userId)
      .eq('channel', 'email')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTemplates((data as Template[]) ?? []))
  }, [userId])

  const applyTemplate = (t: Template) => {
    setSubject(fillVars(t.subject ?? '', result))
    setMessage(fillVars(t.content, result))
  }

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (message) params.set('body', message)
    const qs = params.toString().replace(/\+/g, '%20')
    return `mailto:${encodeURIComponent(email)}${qs ? `?${qs}` : ''}`
  }, [email, subject, message])

  const emailValid = /\S+@\S+\.\S+/.test(email)

  const openAndMark = () => {
    if (!emailValid) return
    // Ouvre le client mail par défaut de l'utilisateur
    window.location.href = mailtoHref
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 backdrop-blur-sm sm:p-6">
      <div className="mt-6 w-full max-w-xl rounded-lg border border-ink-100 bg-cream-50 shadow-lg">
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600">
              <Mail size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                Email à {result.business_name}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Ça ouvre ton client mail avec le message pré-rempli. Tu envoies
                toi-même.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-800">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          {templates.length > 0 && (
            <div>
              <label className="label">Partir d'un template</label>
              <select
                className="input"
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value)
                  if (t) applyTemplate(t)
                }}
              >
                <option value="" disabled>
                  Choisir un template…
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-400">
                Les variables {'{prenom}'} et {'{entreprise}'} sont remplacées
                automatiquement.
              </p>
            </div>
          )}

          <div>
            <label className="label">Destinataire</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
            />
            {!result.email && (
              <p className="mt-1 text-xs text-warn-600">
                Aucun email trouvé pour ce commerce — saisis l'adresse
                manuellement.
              </p>
            )}
          </div>

          <div>
            <label className="label">Objet</label>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              className="input min-h-[160px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écris ton message ou choisis un template…"
            />
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-ink-100 p-5">
          <p className="text-xs text-ink-400">
            Le prospect sera ajouté à ton CRM.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button
              onClick={openAndMark}
              disabled={!emailValid}
              className="btn-primary"
            >
              <Mail size={15} />
              Ouvrir dans mon client mail
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
