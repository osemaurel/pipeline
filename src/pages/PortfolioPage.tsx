import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Eye, EyeOff, Link2, QrCode } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchPortfolioBundle,
  isSlugAvailable,
  suggestSlug,
  upsertPortfolio,
  type Portfolio,
  type PortfolioBundle,
} from '@/lib/portfolioData'
import { HeaderSection } from '@/components/portfolio/HeaderSection'
import { AppearanceSection } from '@/components/portfolio/AppearanceSection'
import { ServicesSection } from '@/components/portfolio/ServicesSection'
import { ProjectsSection } from '@/components/portfolio/ProjectsSection'
import { TestimonialsSection } from '@/components/portfolio/TestimonialsSection'
import { ToolsSection } from '@/components/portfolio/ToolsSection'
import { ExperiencesSection } from '@/components/portfolio/ExperiencesSection'
import { QRCodeCard } from '@/components/portfolio/QRCodeCard'

export function PortfolioPage() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const [bundle, setBundle] = useState<PortfolioBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [publishing, setPublishing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetchPortfolioBundle(user.id).then((b) => {
      setBundle(b)
      const initialSlug =
        b.portfolio?.slug ??
        suggestSlug(profile?.first_name ?? 'freelance', profile?.last_name ?? '')
      setSlugDraft(initialSlug)
      setLoading(false)
    })
  }, [user, profile])

  useEffect(() => {
    if (!slugTouched || !user) return
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      const ok = await isSlugAvailable(slugDraft, user.id)
      setSlugStatus(ok ? 'ok' : 'taken')
    }, 400)
    return () => clearTimeout(t)
  }, [slugDraft, slugTouched, user])

  const publicUrl = bundle?.portfolio?.slug
    ? `${window.location.origin}/p/${bundle.portfolio.slug}`
    : null

  const patchPortfolio = async (patch: Partial<Portfolio>) => {
    if (!user) return
    setError(null)
    const merged = {
      slug: bundle?.portfolio?.slug ?? slugDraft,
      ...patch,
    }
    const { data, error } = await upsertPortfolio(user.id, merged)
    if (error) {
      setError(error)
      return
    }
    if (data) setBundle((b) => (b ? { ...b, portfolio: data } : b))
  }

  const savePortfolio = async () => {
    if (!user) return
    setPublishing(true)
    setError(null)
    if (!bundle?.portfolio) {
      const ok = await isSlugAvailable(slugDraft, user.id)
      if (!ok) {
        setError('Ce lien est déjà pris. Choisis-en un autre.')
        setPublishing(false)
        return
      }
    }
    const { data, error } = await upsertPortfolio(user.id, {
      slug: bundle?.portfolio?.slug ?? slugDraft,
    })
    if (error) {
      setError(error)
      setPublishing(false)
      return
    }
    if (data) setBundle((b) => (b ? { ...b, portfolio: data } : { ...b!, portfolio: data }))
    setPublishing(false)
  }

  const togglePublish = async () => {
    if (!bundle?.portfolio) return
    setPublishing(true)
    const { data, error } = await upsertPortfolio(user!.id, {
      slug: bundle.portfolio.slug,
      is_published: !bundle.portfolio.is_published,
    })
    setPublishing(false)
    if (error) return setError(error)
    if (data) setBundle({ ...bundle, portfolio: data })
  }

  const copyLink = async () => {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopyOk(true)
    setTimeout(() => setCopyOk(false), 1500)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-32 animate-pulse rounded-lg bg-cream-100" />
      </div>
    )
  }

  const portfolio = bundle?.portfolio

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Portfolio</h1>
          <p className="mt-1 text-sm text-ink-500">
            Compose la page que tu partageras à tes prospects.
          </p>
        </div>
      </header>

      <section className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <Link2 size={16} className="text-ink-400" />
              <span className="text-ink-500">Ton lien public</span>
            </div>
            {portfolio ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1 rounded border border-ink-100 bg-cream-100 px-3 py-2 font-mono text-sm text-ink-700">
                  <span className="truncate">{publicUrl}</span>
                </div>
                <button
                  onClick={copyLink}
                  className="btn-secondary shrink-0"
                  title="Copier"
                >
                  {copyOk ? <Check size={14} /> : <Copy size={14} />}
                  {copyOk ? 'Copié' : 'Copier'}
                </button>
                {portfolio.is_published && publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary shrink-0"
                    title="Ouvrir"
                  >
                    <ExternalLink size={14} />
                    Ouvrir
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-1 rounded border border-ink-200 bg-cream-50 px-3 py-2 font-mono text-sm text-ink-500 focus-within:border-accent-500">
                  <span>{window.location.origin}/p/</span>
                  <input
                    value={slugDraft}
                    onChange={(e) => {
                      setSlugDraft(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      )
                      setSlugTouched(true)
                    }}
                    className="flex-1 border-0 bg-transparent p-0 text-ink-800 focus:outline-none focus:ring-0"
                  />
                  {slugStatus === 'checking' && (
                    <span className="text-xs text-ink-300">Vérification…</span>
                  )}
                  {slugStatus === 'ok' && (
                    <span className="text-xs text-success-500">Disponible</span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="text-xs text-danger-500">Déjà pris</span>
                  )}
                </div>
                <button
                  onClick={savePortfolio}
                  disabled={publishing || slugStatus === 'taken' || !slugDraft}
                  className="btn-primary"
                >
                  {publishing ? 'Création…' : 'Créer mon portfolio'}
                </button>
              </div>
            )}
          </div>
          {portfolio && (
            <div className="flex shrink-0 flex-col gap-2">
              <button
                onClick={togglePublish}
                disabled={publishing}
                className={
                  portfolio.is_published ? 'btn-secondary' : 'btn-primary'
                }
              >
                {portfolio.is_published ? (
                  <>
                    <EyeOff size={14} />
                    Dépublier
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    Publier
                  </>
                )}
              </button>
              <button
                onClick={() => setShowQR((v) => !v)}
                className="btn-secondary"
              >
                <QrCode size={14} />
                {showQR ? 'Cacher le QR' : 'Voir le QR code'}
              </button>
            </div>
          )}
        </div>
        {portfolio && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                portfolio.is_published ? 'bg-success-500' : 'bg-ink-300'
              }`}
            />
            <span className="text-ink-500">
              {portfolio.is_published ? 'En ligne' : 'Brouillon — invisible du public'}
            </span>
            <span className="ml-auto font-mono text-xs text-ink-400">
              {portfolio.view_count} vue{portfolio.view_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
        {showQR && publicUrl && (
          <div className="mt-4 border-t border-ink-100 pt-4">
            <QRCodeCard url={publicUrl} />
          </div>
        )}
        {error && (
          <p className="mt-3 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}
      </section>

      {portfolio && user && (
        <>
          <HeaderSection
            userId={user.id}
            portfolio={portfolio}
            onChange={(patch) => patchPortfolio(patch)}
          />
          <AppearanceSection
            accentColor={portfolio.accent_color}
            onChange={(accent_color) => patchPortfolio({ accent_color })}
          />
          <ToolsSection
            selected={portfolio.tools ?? []}
            onChange={(tools) => patchPortfolio({ tools })}
          />
          <ProjectsSection
            userId={user.id}
            projects={bundle!.projects}
            onChange={(projects) =>
              setBundle((b) => (b ? { ...b, projects } : b))
            }
          />
          <ExperiencesSection
            userId={user.id}
            experiences={bundle!.experiences}
            onChange={(experiences) =>
              setBundle((b) => (b ? { ...b, experiences } : b))
            }
          />
          <ServicesSection
            userId={user.id}
            services={bundle!.services}
            onChange={(services) =>
              setBundle((b) => (b ? { ...b, services } : b))
            }
          />
          <TestimonialsSection
            userId={user.id}
            testimonials={bundle!.testimonials}
            onChange={(testimonials) =>
              setBundle((b) => (b ? { ...b, testimonials } : b))
            }
          />
        </>
      )}
    </div>
  )
}
