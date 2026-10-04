import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// Page affichée à l'invité quand il arrive via le magic link. Demande
// prénom + nom (s'ils n'ont pas déjà été renseignés par l'invitation) et
// mot de passe, puis redirige vers l'onboarding.
export function SetPasswordPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pré-remplit avec ce qu'on a (invitation ou signup frontend).
  useEffect(() => {
    if (profile?.first_name) setFirstName(profile.first_name)
    if (profile?.last_name) setLastName(profile.last_name)
  }, [profile?.first_name, profile?.last_name])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      return setError('Renseigne ton prénom et ton nom.')
    }
    if (password.length < 8) {
      return setError('Ton mot de passe doit faire au moins 8 caractères.')
    }
    if (password !== confirm) {
      return setError('Les deux mots de passe ne correspondent pas.')
    }
    setLoading(true)

    const { error: updateErr } = await supabase.auth.updateUser({
      password,
      data: { needs_password_setup: false },
    })
    if (updateErr) {
      setLoading(false)
      return setError(updateErr.message)
    }

    // Mise à jour du profil : prénom/nom + flag côté profiles (ceinture
    // + bretelles si l'edge function n'était pas à jour).
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          needs_password_setup: false,
        })
        .eq('user_id', user.id)
    }

    setLoading(false)
    await refreshProfile()
    navigate('/onboarding', { replace: true })
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-500/10 text-accent-600">
          <Lock size={20} />
        </div>
        <h1 className="text-xl font-semibold text-ink-900">Bienvenue sur TopCloz</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Dis-nous qui tu es et choisis un mot de passe pour te reconnecter plus tard.
        </p>
        {user?.email && (
          <p className="mt-3 inline-block max-w-full truncate rounded-full bg-cream-200 px-3 py-1 font-mono text-xs text-ink-700">
            {user.email}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Prénom</label>
            <input
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              autoFocus={!firstName}
            />
          </div>
          <div>
            <label className="label">Nom</label>
            <input
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Mot de passe</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="mt-1 text-[11px] text-ink-400">Minimum 8 caractères.</p>
        </div>
        <div>
          <label className="label">Confirme ton mot de passe</label>
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Check size={16} />
              Continuer
            </>
          )}
        </button>

        <p className="text-center text-xs text-ink-400">
          Après ça tu rempliras un rapide formulaire d'onboarding (métier, cible, canaux…) pour configurer ton compte.
        </p>
      </form>
    </div>
  )
}
