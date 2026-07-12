import { useState } from 'react'
import { Check, Loader2, Sparkles, TriangleAlert, X } from 'lucide-react'
import {
  AI_SECTIONS,
  applyGeneratedContent,
  generatePortfolioContent,
  type PortfolioAiResult,
  type PortfolioAiSection,
} from '@/lib/portfolioAi'
import type {
  PortfolioExperience,
  PortfolioProject,
  PortfolioService,
  PortfolioTestimonial,
} from '@/lib/portfolioData'

interface Props {
  userId: string
  counts: {
    services: number
    projects: number
    experiences: number
    testimonials: number
  }
  onClose: () => void
  onApplied: (payload: {
    headline?: string
    bio?: string
    services: PortfolioService[]
    projects: PortfolioProject[]
    experiences: PortfolioExperience[]
    testimonials: PortfolioTestimonial[]
  }) => void
}

export function AiPortfolioModal({ userId, counts, onClose, onApplied }: Props) {
  const [selected, setSelected] = useState<Set<PortfolioAiSection>>(
    new Set(['headline', 'bio', 'services']),
  )
  const [status, setStatus] = useState<'idle' | 'generating'>('idle')
  const [error, setError] = useState<string | null>(null)

  const toggle = (s: PortfolioAiSection) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const allSelected = selected.size === AI_SECTIONS.length
  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(AI_SECTIONS.map((s) => s.value)),
    )

  const hasDraft = AI_SECTIONS.some((s) => s.draft && selected.has(s.value))

  const run = async () => {
    if (selected.size === 0) return
    setStatus('generating')
    setError(null)
    const { data, error } = await generatePortfolioContent([...selected])
    if (error || !data) {
      setStatus('idle')
      setError(error ?? 'Aucun contenu généré.')
      return
    }
    const result: PortfolioAiResult = data
    const inserted = await applyGeneratedContent(userId, result, counts)
    onApplied({
      headline: result.headline,
      bio: result.bio,
      services: inserted.services,
      projects: inserted.projects,
      experiences: inserted.experiences,
      testimonials: inserted.testimonials,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 backdrop-blur-sm sm:p-6">
      <div className="mt-6 w-full max-w-lg rounded-lg border border-ink-100 bg-cream-50 shadow-lg">
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                Générer avec l'IA
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Choisis les sections à rédiger à partir de ton profil.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'generating'}
            className="text-ink-400 transition hover:text-ink-800"
          >
            <X size={20} />
          </button>
        </header>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Sections
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-accent-600 hover:underline"
            >
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AI_SECTIONS.map((s) => {
              const active = selected.has(s.value)
              return (
                <button
                  key={s.value}
                  onClick={() => toggle(s.value)}
                  disabled={status === 'generating'}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${
                    active
                      ? 'border-accent-500 bg-accent-500/5'
                      : 'border-ink-100 bg-cream-50 hover:bg-cream-100'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      active
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-ink-300 bg-cream-50'
                    }`}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-ink-800">
                        {s.label}
                      </span>
                      {s.draft && (
                        <span className="rounded bg-warn-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn-700">
                          Brouillon
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {s.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {hasDraft && (
            <div className="mt-4 flex gap-2.5 rounded-lg border border-warn-200 bg-warn-50 p-3">
              <TriangleAlert
                size={16}
                className="mt-0.5 shrink-0 text-warn-600"
              />
              <p className="text-xs leading-relaxed text-warn-700">
                Les projets, expériences et témoignages générés sont des{' '}
                <strong>exemples fictifs</strong> à personnaliser avec tes vraies
                références. Remplace-les avant de publier ton portfolio.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-ink-400">
            Le contenu généré s'ajoute à l'existant — rien n'est supprimé. Tu
            pourras tout éditer ensuite.
          </p>

          {error && (
            <p className="mt-4 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 p-5">
          <button
            onClick={onClose}
            disabled={status === 'generating'}
            className="btn-secondary"
          >
            Annuler
          </button>
          <button
            onClick={run}
            disabled={selected.size === 0 || status === 'generating'}
            className="btn-primary"
          >
            {status === 'generating' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Génération…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Générer ({selected.size})
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
