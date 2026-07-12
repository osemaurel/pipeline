import { useEffect, useState } from 'react'
import { Check, ImageIcon, Loader2, X } from 'lucide-react'
import {
  STYLE_PRESETS,
  fetchVisualStyle,
  generateThumbnail,
  type GeneratedService,
} from '@/lib/aiStudioData'

interface Props {
  userId: string
  service: GeneratedService
  onClose: () => void
  onGenerated: (url: string, creditsLeft: number) => void
}

export function ThumbnailModal({ userId, service, onClose, onGenerated }: Props) {
  const [preset, setPreset] = useState('modern_clean')
  const [customPrompt, setCustomPrompt] = useState('')
  const [color, setColor] = useState('#7F56D9')
  const [saveDefault, setSaveDefault] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVisualStyle(userId).then((s) => {
      if (s) {
        setPreset(s.style_preset ?? 'modern_clean')
        setCustomPrompt(s.custom_style_prompt ?? '')
        if (s.primary_color) setColor(s.primary_color)
      }
    })
  }, [userId])

  const run = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await generateThumbnail({
      service_id: service.id,
      style_preset: preset,
      custom_style_prompt: preset === 'custom' ? customPrompt : undefined,
      primary_color: color,
      save_as_default: saveDefault,
    })
    setLoading(false)
    if (error || !data) {
      setError(error ?? 'Génération impossible.')
      return
    }
    onGenerated(data.thumbnail_url, data.credits_remaining)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 backdrop-blur-sm sm:p-6">
      <div className="mt-6 w-full max-w-lg rounded-lg border border-ink-100 bg-cream-50 shadow-lg">
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600">
              <ImageIcon size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Générer la miniature</h2>
              <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">{service.title}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="text-ink-400 hover:text-ink-800">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div>
            <label className="label">Style visuel</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STYLE_PRESETS.map((s) => {
                const active = preset === s.value
                return (
                  <button
                    key={s.value}
                    onClick={() => setPreset(s.value)}
                    disabled={loading}
                    className={`rounded-lg border p-2.5 text-left transition ${
                      active ? 'border-accent-500 bg-accent-500/5' : 'border-ink-100 bg-cream-50 hover:bg-cream-100'
                    }`}
                  >
                    <p className={`text-sm font-medium ${active ? 'text-accent-700' : 'text-ink-800'}`}>{s.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{s.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {preset === 'custom' && (
            <div>
              <label className="label">Décris ton style</label>
              <textarea
                className="input min-h-[70px]"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ex : fond bleu nuit, illustrations plates, style corporate premium"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="label mb-0">Couleur dominante</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-ink-200" />
            <span className="font-mono text-xs text-ink-400">{color.toUpperCase()}</span>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={saveDefault} onChange={(e) => setSaveDefault(e.target.checked)} className="h-4 w-4 accent-[#7F56D9]" />
            Sauvegarder ces choix comme mon style par défaut
          </label>

          <div className="rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-xs text-warn-700">
            Génère une image 1536×1024 (format paysage). Coût : 3 crédits.
          </div>

          {error && (
            <p className="rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">{error}</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
          <button onClick={onClose} disabled={loading} className="btn-secondary">Annuler</button>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? (<><Loader2 size={16} className="animate-spin" />Génération…</>) : (<><Check size={16} />Générer (3 crédits)</>)}
          </button>
        </footer>
      </div>
    </div>
  )
}
