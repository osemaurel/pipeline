import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUpRight,
  Download,
  MessageCircle,
  Moon,
  Star,
  Sun,
  User,
} from 'lucide-react'
import {
  fetchOwnerProfileForPortfolio,
  fetchPublicPortfolio,
  incrementPortfolioView,
  type PortfolioBundle,
  type PortfolioTestimonial,
} from '@/lib/portfolioData'
import { findTool, toolLogoUrl } from '@/lib/toolsCatalog'
import { PublicLeadForm } from '@/components/portfolio/PublicLeadForm'

interface OwnerProfile {
  first_name: string
  last_name: string
  job_title: string | null
  company_name: string | null
}

const THEME_KEY = 'pipeline_portfolio_theme'

export function PublicPortfolioPage() {
  const { slug } = useParams<{ slug: string }>()
  const [bundle, setBundle] = useState<PortfolioBundle | null>(null)
  const [owner, setOwner] = useState<OwnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(
    () => localStorage.getItem(THEME_KEY) === 'dark',
  )

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetchPublicPortfolio(slug).then(async (b) => {
      setBundle(b)
      if (b?.portfolio) {
        const o = await fetchOwnerProfileForPortfolio(slug)
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

  const toggleTheme = () => {
    setDark((d) => {
      const next = !d
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      return next
    })
  }

  if (loading) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-ink-950">
          <div className="animate-pulse text-xl font-semibold text-ink-400">
            Pipeline
          </div>
        </div>
      </div>
    )
  }

  if (!bundle?.portfolio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-ink-900">
            Portfolio introuvable
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Ce lien n'existe pas ou le portfolio n'est plus publié.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block text-accent-600 hover:underline"
          >
            Retour à Pipeline
          </Link>
        </div>
      </div>
    )
  }

  const { portfolio, projects, testimonials, experiences, services } = bundle
  const displayName = owner
    ? `${owner.first_name} ${owner.last_name}`
    : 'Freelance'
  const heading =
    owner?.job_title || portfolio.headline || displayName
  const whatsappLink = portfolio.whatsapp_number
    ? `https://wa.me/${portfolio.whatsapp_number.replace(/[^0-9]/g, '')}`
    : null

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-white text-ink-900 transition-colors dark:bg-ink-950 dark:text-white">
        {/* Barre haute : logo discret + toggle thème */}
        <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-6 pt-4">
          <div className="flex w-full max-w-2xl items-center justify-between rounded-full border border-ink-100 bg-white/80 px-4 py-2 shadow-xs backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
            <span className="text-sm font-bold tracking-tight">
              {displayName}
            </span>
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition hover:bg-cream-200 dark:text-ink-300 dark:hover:bg-ink-800"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-6 pb-20 pt-28">
          {/* ------------------------------------------------ Hero */}
          <header className="flex flex-col items-start gap-6">
            {portfolio.is_available && (
              <span className="inline-flex items-center gap-2 rounded-full border border-success-200 bg-success-50 px-3 py-1 text-xs font-medium text-success-700 dark:border-success-700/40 dark:bg-success-700/10 dark:text-success-500">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success-500" />
                Disponible pour de nouveaux projets
              </span>
            )}

            {portfolio.photo_url ? (
              <img
                src={portfolio.photo_url}
                alt={displayName}
                className="h-24 w-24 rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-cream-200 text-ink-300 dark:bg-ink-800">
                <User size={36} />
              </div>
            )}

            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                {heading}
                <span className="text-accent-500">.</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
                Je suis <span className="font-semibold text-ink-900 dark:text-white">{displayName}</span>
                {portfolio.headline && heading !== portfolio.headline
                  ? ` — ${portfolio.headline.replace(/\.$/, '')}.`
                  : '.'}
              </p>
              {portfolio.bio && (
                <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                  {portfolio.bio}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {projects.length > 0 && (
                <a href="#projets" className="btn-primary">
                  Voir mes projets
                  <ArrowDown size={14} />
                </a>
              )}
              <a href="#contact" className="btn-secondary dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:hover:bg-ink-700">
                Me contacter
              </a>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:hover:bg-ink-700"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              )}
            </div>
          </header>

          {/* ------------------------------------------------ Outils */}
          {portfolio.tools.length > 0 && (
            <section id="outils" className="mt-20">
              <SectionTitle>Les outils que j'utilise</SectionTitle>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {portfolio.tools.map((slug) => {
                  const tool = findTool(slug)
                  if (!tool) return null
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-cream-100 px-3.5 py-2 text-sm font-medium text-ink-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200"
                    >
                      <img
                        src={toolLogoUrl(slug)}
                        alt=""
                        loading="lazy"
                        className="h-[18px] w-[18px] object-contain dark:rounded-full dark:bg-white dark:p-[2px]"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      {tool.name}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* ------------------------------------------------ Projets */}
          {projects.length > 0 && (
            <section id="projets" className="mt-20">
              <SectionTitle>Projets</SectionTitle>
              <div className="mt-6 space-y-6">
                {projects.map((p) => (
                  <article
                    key={p.id}
                    className="overflow-hidden rounded-2xl border border-ink-100 bg-cream-100 transition hover:border-ink-200 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700"
                  >
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-56 w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      {p.description && (
                        <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                          {p.description}
                        </p>
                      )}
                      {p.external_link && (
                        <a
                          href={p.external_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-500 hover:underline dark:text-accent-400"
                        >
                          Voir le site
                          <ArrowUpRight size={14} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------------------ Expérience */}
          {experiences.length > 0 && (
            <section id="experience" className="mt-20">
              <SectionTitle>Expérience</SectionTitle>
              <div className="mt-6 space-y-8">
                {experiences.map((x) => (
                  <div
                    key={x.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr] sm:gap-6"
                  >
                    <p className="font-mono text-sm text-ink-400 dark:text-ink-500">
                      {x.start_year} — {x.end_year || "Aujourd'hui"}
                    </p>
                    <div>
                      <h3 className="text-base font-semibold">
                        {x.role}
                        <span className="font-normal text-ink-500 dark:text-ink-400">
                          {' '}
                          · {x.company}
                        </span>
                      </h3>
                      {x.description && (
                        <ul className="mt-2 space-y-1.5">
                          {x.description
                            .split('\n')
                            .filter(Boolean)
                            .map((line, i) => (
                              <li
                                key={i}
                                className="flex gap-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300"
                              >
                                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-500" />
                                {line.replace(/^[-•]\s*/, '')}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {portfolio.cv_url && (
                <a
                  href={portfolio.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary mt-8"
                >
                  <Download size={14} />
                  Télécharger mon CV
                </a>
              )}
            </section>
          )}

          {/* ------------------------------------------------ Services */}
          {services.length > 0 && (
            <section id="services" className="mt-20">
              <SectionTitle>Services</SectionTitle>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-ink-100 bg-cream-100 p-5 dark:border-ink-800 dark:bg-ink-900"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base font-semibold">{s.title}</h3>
                      {s.price != null && (
                        <span className="shrink-0 font-mono text-sm text-accent-500 dark:text-accent-400">
                          {s.price.toLocaleString('fr-FR')} {s.currency}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                        {s.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------------------ Témoignages */}
          {testimonials.length > 0 && (
            <section id="temoignages" className="mt-20">
              <SectionTitle>Témoignages</SectionTitle>
            </section>
          )}
        </div>

        {/* Marquee pleine largeur (hors du conteneur étroit) */}
        {testimonials.length > 0 && (
          <TestimonialsMarquee testimonials={testimonials} />
        )}

        <div className="mx-auto max-w-2xl px-6 pb-16">
          {/* ------------------------------------------------ Contact */}
          <section id="contact" className="mt-20">
            <SectionTitle>Contact</SectionTitle>
            <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-100 dark:border-ink-800 dark:bg-ink-900 [&>form]:border-0 [&>form]:bg-transparent">
              <PublicLeadForm
                userId={portfolio.user_id}
                ownerFirstName={owner?.first_name}
              />
            </div>
          </section>

          {/* ------------------------------------------------ Footer */}
          <footer className="mt-20 border-t border-ink-100 pt-8 dark:border-ink-800">
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500 dark:text-ink-400">
              {portfolio.tools.length > 0 && (
                <a href="#outils" className="hover:text-ink-900 dark:hover:text-white">
                  Outils
                </a>
              )}
              {projects.length > 0 && (
                <a href="#projets" className="hover:text-ink-900 dark:hover:text-white">
                  Projets
                </a>
              )}
              {experiences.length > 0 && (
                <a href="#experience" className="hover:text-ink-900 dark:hover:text-white">
                  Expérience
                </a>
              )}
              {testimonials.length > 0 && (
                <a href="#temoignages" className="hover:text-ink-900 dark:hover:text-white">
                  Témoignages
                </a>
              )}
              <a href="#contact" className="hover:text-ink-900 dark:hover:text-white">
                Contact
              </a>
            </nav>
            <p className="mt-6 text-xs text-ink-400 dark:text-ink-500">
              © {new Date().getFullYear()} {displayName} — Portfolio propulsé par{' '}
              <Link
                to="/"
                className="font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
              >
                Pipeline
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
      {children}
    </h2>
  )
}

function TestimonialsMarquee({
  testimonials,
}: {
  testimonials: PortfolioTestimonial[]
}) {
  const { rowA, rowB } = useMemo(() => {
    if (testimonials.length < 4) {
      return { rowA: testimonials, rowB: [] as PortfolioTestimonial[] }
    }
    const half = Math.ceil(testimonials.length / 2)
    return { rowA: testimonials.slice(0, half), rowB: testimonials.slice(half) }
  }, [testimonials])

  return (
    <div className="mt-6 space-y-4 overflow-hidden">
      <MarqueeRow items={rowA} reverse={false} />
      {rowB.length > 0 && <MarqueeRow items={rowB} reverse />}
    </div>
  )
}

function MarqueeRow({
  items,
  reverse,
}: {
  items: PortfolioTestimonial[]
  reverse: boolean
}) {
  // Contenu dupliqué pour un défilement continu sans couture
  const doubled = [...items, ...items]
  const animate = items.length > 1

  return (
    <div className="relative">
      <div
        className={`flex w-max gap-4 ${
          animate
            ? reverse
              ? 'animate-marquee-reverse hover:[animation-play-state:paused]'
              : 'animate-marquee hover:[animation-play-state:paused]'
            : 'mx-auto'
        }`}
      >
        {(animate ? doubled : items).map((t, i) => (
          <blockquote
            key={`${t.id}-${i}`}
            className="w-80 shrink-0 rounded-2xl border border-ink-100 bg-cream-100 p-5 dark:border-ink-800 dark:bg-ink-900"
          >
            <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">
              « {t.content} »
            </p>
            <footer className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900 dark:text-white">
                {t.client_name}
              </span>
              {t.rating != null && (
                <span className="flex items-center gap-0.5 text-accent-500">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={11} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
              )}
            </footer>
          </blockquote>
        ))}
      </div>
    </div>
  )
}
