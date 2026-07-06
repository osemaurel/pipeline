import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  History,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuthStore } from '@/stores/authStore'
import {
  AI_PRESETS,
  deleteGeneration,
  fetchGenerationHistory,
  generateContent,
  getPreset,
  type AiGeneration,
} from '@/lib/aiGenerator'

export function AiGeneratorPage() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const [presetValue, setPresetValue] = useState(AI_PRESETS[0].value)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyOk, setCopyOk] = useState(false)
  const [history, setHistory] = useState<AiGeneration[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const preset = useMemo(() => getPreset(presetValue), [presetValue])

  useEffect(() => {
    if (!user) return
    setHistoryLoading(true)
    fetchGenerationHistory(user.id).then((h) => {
      setHistory(h)
      setHistoryLoading(false)
    })
  }, [user])

  const canGenerate =
    !!input.trim() && !!preset && !generating && !!profile?.onboarding_completed

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!canGenerate) return
    setGenerating(true)
    setError(null)
    setResult('')
    const { data, error } = await generateContent(presetValue, input)
    setGenerating(false)
    if (error) {
      setError(error)
      return
    }
    if (data) {
      setResult(data.content)
      setHistory((h) => [data.generation, ...h])
    }
  }

  const copyResult = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopyOk(true)
    setTimeout(() => setCopyOk(false), 1500)
  }

  const openFromHistory = (g: AiGeneration) => {
    setPresetValue(g.type)
    setInput(g.input_prompt)
    setResult(g.generated_content)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeFromHistory = async (id: string) => {
    if (!confirm('Supprimer cette génération de ton historique ?')) return
    await deleteGeneration(id)
    setHistory((h) => h.filter((g) => g.id !== id))
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            Générateur IA
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Rédige plus vite. Chaque texte tient compte de ton pitch et de ton
            client idéal.
          </p>
        </div>
      </header>

      {!profile?.onboarding_completed && (
        <div className="card mb-6 border-warn-500/30 bg-warn-500/5">
          <p className="text-sm text-ink-700">
            Termine ton onboarding pour que l'IA puisse s'appuyer sur ton pitch
            et ton client idéal.
          </p>
        </div>
      )}

      <section className="card mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Que veux-tu générer ?
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AI_PRESETS.map((p) => {
            const Icon = p.icon
            const active = p.value === presetValue
            return (
              <button
                key={p.value}
                onClick={() => setPresetValue(p.value)}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                  active
                    ? 'border-accent-500 bg-accent-500/5'
                    : 'border-ink-100 bg-cream-50 hover:bg-cream-100'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active
                      ? 'bg-accent-500 text-white'
                      : 'bg-cream-200 text-ink-500'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <p
                  className={`text-sm font-medium ${
                    active ? 'text-accent-700' : 'text-ink-800'
                  }`}
                >
                  {p.label}
                </p>
                <p className="text-xs text-ink-500">{p.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      <form onSubmit={submit} className="card mb-6 space-y-4">
        <div>
          <label className="label">{preset?.helper}</label>
          <textarea
            className="input"
            style={{ minHeight: `${(preset?.minRows ?? 3) * 28}px` }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={preset?.placeholder}
            required
          />
        </div>

        {error && (
          <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canGenerate}
          className="btn-primary w-full"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Générer
            </>
          )}
        </button>
      </form>

      {result && (
        <section className="card mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Résultat
              </h2>
            </div>
            <button
              onClick={copyResult}
              className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
            >
              {copyOk ? <Check size={13} /> : <Copy size={13} />}
              {copyOk ? 'Copié' : 'Copier'}
            </button>
          </div>
          <textarea
            className="input min-h-[220px] whitespace-pre-wrap font-sans text-base leading-relaxed"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          />
          <p className="mt-2 text-xs text-ink-400">
            Tu peux éditer directement avant de copier.
          </p>
        </section>
      )}

      <section className="card">
        <div className="mb-3 flex items-center gap-2">
          <History size={16} className="text-ink-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Historique
          </h2>
        </div>

        {historyLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-cream-100" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="rounded border border-dashed border-ink-200 py-6 text-center text-sm text-ink-400">
            Rien pour l'instant. Tes générations passées apparaîtront ici.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {history.map((g) => {
              const p = getPreset(g.type)
              const Icon = p?.icon ?? Sparkles
              return (
                <li key={g.id} className="flex gap-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-200 text-ink-500">
                    <Icon size={14} />
                  </div>
                  <button
                    onClick={() => openFromHistory(g)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        {p?.label ?? g.type}
                      </p>
                      <span className="text-xs text-ink-400">
                        {formatDistanceToNow(new Date(g.created_at), {
                          locale: fr,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-ink-700">
                      {g.input_prompt}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                      {g.generated_content}
                    </p>
                  </button>
                  <button
                    onClick={() => removeFromHistory(g.id)}
                    className="shrink-0 text-ink-300 hover:text-danger-500"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
