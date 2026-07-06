import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, MessageCircle, Star, User } from 'lucide-react'
import {
  fetchOwnerProfileForPortfolio,
  fetchPublicPortfolio,
  incrementPortfolioView,
  type PortfolioBundle,
} from '@/lib/portfolioData'
import { PublicLeadForm } from '@/components/portfolio/PublicLeadForm'

interface OwnerProfile {
  first_name: string
  last_name: string
  job_title: string | null
  company_name: string | null
}

export function PublicPortfolioPage() {
  const { slug } = useParams<{ slug: string }>()
  const [bundle, setBundle] = useState<PortfolioBundle | null>(null)
  const [owner, setOwner] = useState<OwnerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchPublicPortfolio(slug).then(async (b) => {
      setBundle(b)
      if (b?.portfolio) {
        const o = await fetchOwnerProfileForPortfolio(b.portfolio.user_id)
        setOwner(o)
        const key = `pipeline_viewed_${slug}`
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1')
          incrementPortfolioView(slug)
        }
      }
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <div className="animate-pulse text-xl font-semibold text-ink-500">
          Pipeline
        </div>
      </div>
    )
  }

  if (!bundle?.portfolio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-ink-900">
            Portfolio introuvable
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Ce lien n'existe pas ou le portfolio n'est plus publié.
          </p>
          <Link to="/" className="mt-4 inline-block text-accent-600 hover:underline">
            Retour à Pipeline
          </Link>
        </div>
      </div>
    )
  }

  const { portfolio, services, projects, testimonials } = bundle
  const displayName = owner
    ? `${owner.first_name} ${owner.last_name}`
    : 'Freelance'
  const whatsappLink = portfolio.whatsapp_number
    ? `https://wa.me/${portfolio.whatsapp_number.replace(/[^0-9]/g, '')}`
    : null

  return (
    <div className="min-h-screen bg-cream-50 pb-16">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="flex flex-col items-center gap-4 text-center">
          {portfolio.photo_url ? (
            <img
              src={portfolio.photo_url}
              alt={displayName}
              className="h-28 w-28 rounded-full border-4 border-cream-100 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-cream-100 bg-cream-200 text-ink-300 shadow-sm">
              <User size={36} />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-semibold text-ink-900">
              {displayName}
            </h1>
            {owner?.job_title && (
              <p className="mt-1 text-sm uppercase tracking-wider text-ink-400">
                {owner.job_title}
                {owner.company_name && ` · ${owner.company_name}`}
              </p>
            )}
          </div>
          {portfolio.headline && (
            <p className="max-w-xl text-xl font-medium text-ink-700">
              {portfolio.headline}
            </p>
          )}
          {portfolio.bio && (
            <p className="max-w-xl text-sm leading-relaxed text-ink-600">
              {portfolio.bio}
            </p>
          )}
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <MessageCircle size={14} />
              Discuter sur WhatsApp
            </a>
          )}
        </header>

        {services.length > 0 && (
          <section className="mt-16">
            <SectionTitle>Services</SectionTitle>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="overflow-hidden rounded-lg border border-ink-100 bg-cream-50"
                >
                  {s.image_url && (
                    <img
                      src={s.image_url}
                      alt=""
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink-900">
                        {s.title}
                      </h3>
                      {s.price != null && (
                        <span className="shrink-0 font-mono text-sm text-accent-700">
                          {s.price.toLocaleString('fr-FR')} {s.currency}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mt-16">
            <SectionTitle>Réalisations</SectionTitle>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {projects.map((p) => (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-lg border border-ink-100 bg-cream-50"
                >
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-ink-900">
                      {p.title}
                    </h3>
                    {p.description && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        {p.description}
                      </p>
                    )}
                    {p.external_link && (
                      <a
                        href={p.external_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:underline"
                      >
                        Voir le projet
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {testimonials.length > 0 && (
          <section className="mt-16">
            <SectionTitle>Ils me font confiance</SectionTitle>
            <div className="mt-6 space-y-4">
              {testimonials.map((t) => (
                <blockquote
                  key={t.id}
                  className="rounded-lg border border-ink-100 bg-cream-50 p-6"
                >
                  <p className="text-lg leading-relaxed text-ink-800">
                    « {t.content} »
                  </p>
                  <footer className="mt-3 flex items-center gap-2 text-sm text-ink-500">
                    <span className="font-medium text-ink-700">
                      — {t.client_name}
                    </span>
                    {t.rating != null && (
                      <span className="flex items-center gap-0.5 text-accent-600">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            fill="currentColor"
                            strokeWidth={0}
                          />
                        ))}
                      </span>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <section className="mt-16">
          <PublicLeadForm
            userId={portfolio.user_id}
            ownerFirstName={owner?.first_name}
          />
        </section>

        <footer className="mt-16 text-center text-xs text-ink-400">
          Portfolio propulsé par{' '}
          <Link to="/" className="font-semibold text-ink-500 hover:text-ink-800">
            Pipeline
          </Link>
        </footer>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400">
      {children}
    </h2>
  )
}
