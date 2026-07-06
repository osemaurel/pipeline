import { FormEvent, useState } from 'react'
import { Check, LogOut, Mail } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  readDisabledModules,
  updateDisabledModules,
  updatePassword,
} from '@/lib/settingsData'

const MODULES = [
  { value: 'routine', label: 'Ma routine', description: 'Le module quotidien LinkedIn / email / appels + objectifs.' },
]

export function AccountTab() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  const initialDisabled = readDisabledModules(user?.user_metadata)
  const [disabled, setDisabled] = useState<string[]>(initialDisabled)
  const [savingModules, setSavingModules] = useState(false)
  const [modulesSaved, setModulesSaved] = useState(false)

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const toggleModule = async (value: string) => {
    const next = disabled.includes(value)
      ? disabled.filter((v) => v !== value)
      : [...disabled, value]
    setDisabled(next)
    setSavingModules(true)
    const { error } = await updateDisabledModules(next)
    setSavingModules(false)
    if (!error) {
      setModulesSaved(true)
      setTimeout(() => setModulesSaved(false), 1500)
    }
  }

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)
    if (password.length < 6)
      return setPasswordError('Au moins 6 caractères.')
    if (password !== password2)
      return setPasswordError('Les deux mots de passe ne correspondent pas.')
    setSavingPassword(true)
    const { error } = await updatePassword(password)
    setSavingPassword(false)
    if (error) return setPasswordError(error)
    setPassword('')
    setPassword2('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Identifiants
        </h3>
        <div className="rounded-lg border border-ink-100 bg-cream-100 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-400">Email</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-800">
            <Mail size={14} className="text-ink-400" />
            {user?.email ?? '—'}
          </p>
          <p className="mt-2 text-xs text-ink-400">
            Le changement d'email n'est pas encore pris en charge.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Mot de passe
        </h3>
        <form onSubmit={submitPassword} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nouveau mot de passe</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirmation</label>
              <input
                type="password"
                className="input"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
          </div>
          {passwordError && (
            <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
              {passwordError}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            {passwordSaved && (
              <span className="flex items-center gap-1 text-xs text-success-500">
                <Check size={13} />
                Mot de passe mis à jour
              </span>
            )}
            <button
              type="submit"
              disabled={savingPassword || !password}
              className="btn-primary"
            >
              {savingPassword ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Modules
          </h3>
          {modulesSaved && (
            <span className="flex items-center gap-1 text-xs text-success-500">
              <Check size={13} />
              Préférences mises à jour
            </span>
          )}
        </div>
        <div className="space-y-2">
          {MODULES.map((m) => {
            const enabled = !disabled.includes(m.value)
            return (
              <label
                key={m.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-100 bg-cream-50 p-3 transition hover:bg-cream-100"
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleModule(m.value)}
                  disabled={savingModules}
                  className="mt-0.5 h-4 w-4 accent-[#7F56D9]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800">{m.label}</p>
                  <p className="text-xs text-ink-500">{m.description}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    enabled ? 'text-success-500' : 'text-ink-300'
                  }`}
                >
                  {enabled ? 'Activé' : 'Désactivé'}
                </span>
              </label>
            )
          })}
        </div>
      </section>

      <section className="border-t border-ink-100 pt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Session
        </h3>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 rounded border border-ink-200 bg-cream-50 px-4 py-2 text-sm text-ink-700 transition hover:bg-cream-100"
        >
          <LogOut size={14} />
          Se déconnecter
        </button>
      </section>
    </div>
  )
}
