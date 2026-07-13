import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SUPPORT_EMAIL, useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const loading = useAuthStore((s) => s.loading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suspended, setSuspended] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuspended(false)
    const { error } = await signIn(email, password)
    if (error === 'suspended') {
      setSuspended(true)
      return
    }
    if (error) {
      setError(error)
      return
    }
    navigate('/', { replace: true })
  }

  if (suspended) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold text-ink-900">Compte suspendu</h2>
        <p className="text-sm text-ink-600">
          Votre compte a été suspendu. Contactez le support si vous pensez qu’il
          s’agit d’une erreur.
        </p>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-primary inline-flex">
          Contacter le support
        </a>
        <button onClick={() => setSuspended(false)} className="block w-full text-sm text-ink-400 hover:text-ink-700">
          Retour
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Connexion</h2>
        <p className="mt-1 text-sm text-ink-500">Content de te revoir.</p>
      </div>

      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">Mot de passe</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>

      <p className="text-center text-sm text-ink-500">
        Pas encore de compte ?{' '}
        <Link to="/signup" className="font-medium text-accent-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  )
}
