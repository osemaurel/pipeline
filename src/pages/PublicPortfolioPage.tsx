import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
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

const NAV_LINKS = [
  { href: '#outils', label: 'Outils' },
  { href: '#projets', label: 'Projets' },
  { href: '#experience', label: 'Expérience' },
  { href: '#temoignages', label: 'Témoignages' },
]

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-xl font-semibold text-ink-400">
          Pipeline
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

  const { portfolio, projects, testimonials, experiences } = bundle
  const displayName = owner
    ? `${owner.first_name} ${owner.last_name}`
    : 'Freelance'
  const whatsappLink = portfolio.whatsapp_number
    ? `https://wa.me/${portfolio.whatsapp_number.replace(/[^0-9]/g, '')}`
    : null
  const tools = (portfolio.tools ?? []).filter(findTool)
  const accent = portfolio.accent_color ?? '#7F56D9'

  return (
    <div
      className={`portfolio-accent ${dark ? 'dark' : ''}`}
      style={{ ['--accent' as string]: accent }}
    >
      <div className="min-h-screen scroll-smooth bg-white text-ink-900 transition-colors dark:bg-[#0A0D12] dark:text-white">
        {/* ------------------------------------------------ Navbar */}
        <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur-md dark:border-ink-800 dark:bg-[#0A0D12]/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
            <a href="#top" className="flex min-w-0 items-center gap-2.5">
              {portfolio.photo_url ? (
                <img
                  src={portfolio.photo_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-200 text-ink-400 dark:bg-ink-800">
                  <User size={16} />
                </span>
              )}
              <span className="truncate text-sm font-semibold">
                {displayName}
              </span>
            </a>

            <nav className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-ink-600 transition hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition hover:bg-cream-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                title={dark ? 'Mode clair' : 'Mode sombre'}
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <a
                href="#contact"
                className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 sm:inline-flex"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Me contacter
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </header>

        <main id="top" className="mx-auto max-w-6xl px-5">
          {/* ------------------------------------------------ Hero */}
          <section className="grid grid-cols-1 items-center gap-10 py-14 md:grid-cols-2 md:py-20">
            <div>
              {portfolio.is_available && (
                <span className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-cream-100 px-4 py-2 text-sm text-ink-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success-500" />
                  Disponible pour de nouveaux projets
                </span>
              )}

              <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                {owner?.job_title ?? displayName}
                <span style={{ color: 'var(--accent)' }}>.</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500 dark:text-ink-300">
                Salut, je suis {displayName}.{' '}
                {portfolio.headline ?? "Bienvenue sur mon portfolio."}
              </p>
              {portfolio.bio && (
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-400">
                  {portfolio.bio}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#projets"
                  className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:bg-cream-100 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800"
                >
                  Voir mes projets
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Me contacter
                  <ArrowRight size={15} />
                </a>
              </div>

              {tools.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-3">
                  {tools.slice(0, 5).map((slug) => (
                    <span
                      key={slug}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-cream-100 dark:border-ink-800 dark:bg-ink-900"
                      title={findTool(slug)?.name}
                    >
                      <img
                        src={toolLogoUrl(slug)}
                        alt={findTool(slug)?.name ?? slug}
                        className="h-7 w-7 object-contain"
                        loading="lazy"
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {portfolio.photo_url && (
              <div>
                <img
                  src={portfolio.photo_url}
                  alt={displayName}
                  className="aspect-[4/5] w-full rounded-3xl object-cover"
                />
              </div>
            )}
          </section>

          {/* ------------------------------------------------ Outils */}
          {tools.length > 0 && (
            <section id="outils" className="scroll-mt-24 py-16 md:py-24">
              <SectionHeading
                eyebrow="Stack"
                title="Les outils que j'utilise"
                subtitle="Une sélection d'outils sur lesquels je m'appuie au quotidien pour livrer un travail soigné"
              />
              <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
                {tools.map((slug) => {
                  const tool = findTool(slug)!
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-2.5 rounded-full border border-ink-100 bg-cream-100 py-2.5 pl-3 pr-5 text-sm font-semibold dark:border-ink-800 dark:bg-ink-900"
                    >
                      <img
                        src={toolLogoUrl(slug)}
                        alt=""
                        className="h-6 w-6 object-contain"
                        loading="lazy"
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
            <section id="projets" className="scroll-mt-24 py-16 md:py-24">
              <SectionHeading
                eyebrow="Projets"
                title="Mes réalisations"
                subtitle="Un aperçu de projets qui montrent comment je transforme des idées en résultats concrets"
              />
              <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
                {projects.map((p) => (
                  <article key={p.id} className="group">
                    {p.image_url ? (
                      <div className="overflow-hidden rounded-3xl">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-cream-100 text-ink-300 dark:bg-ink-900" />
                    )}
                    <div className="mt-5">
                      <h3 className="text-xl font-semibold">{p.title}</h3>
                      {p.description && (
                        <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
                          {p.description}
                        </p>
                      )}
                      {p.external_link && (
                        <a
                          href={p.external_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                          style={{ color: 'var(--accent)' }}
                        >
                          Voir le projet
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
            <section id="experience" className="scroll-mt-24 py-16 md:py-24">
              <SectionHeading
                eyebrow="Expérience"
                title="Mon parcours"
                subtitle="Un résumé de mon parcours professionnel et de l'impact que j'ai eu"
              />
              <div className="mx-auto mt-12 max-w-4xl space-y-5">
                {experiences.map((x) => (
                  <article
                    key={x.id}
                    className="rounded-3xl border border-ink-100 bg-cream-100/60 p-7 dark:border-ink-800 dark:bg-ink-900/60 md:p-9"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-lg font-semibold md:text-xl">
                        {x.role} — {x.company}
                      </h3>
                      <span className="font-mono text-sm text-ink-400">
                        {x.start_year} — {x.end_year || "Aujourd'hui"}
                      </span>
                    </div>
                    {x.description && (
                      <ul className="mt-4 space-y-2.5">
                        {x.description
                          .split('\n')
                          .filter(Boolean)
                          .map((line, i) => (
                            <li
                              key={i}
                              className="flex gap-3 text-sm leading-relaxed text-ink-500 dark:text-ink-300 md:text-base"
                            >
                              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300 dark:bg-ink-600" />
                              {line.replace(/^[-•]\s*/, '')}
                            </li>
                          ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>

              {portfolio.cv_url && (
                <div className="mt-10 text-center">
                  <a
                    href={portfolio.cv_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-6 py-3 text-sm font-semibold transition hover:bg-cream-100 dark:border-ink-700 dark:hover:bg-ink-800"
                  >
                    <Download size={15} />
                    Télécharger mon CV
                  </a>
                </div>
              )}
            </section>
          )}

          {/* ------------------------------------------------ Témoignages */}
          {testimonials.length > 0 && (
            <section id="temoignages" className="scroll-mt-24 py-16 md:py-24">
              <SectionHeading
                eyebrow="Témoignages"
                title="Ils me font confiance"
                subtitle="Ce que mes clients disent de notre collaboration"
              />
              <div className="mt-12 space-y-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
                <MarqueeRow items={testimonials} />
                {testimonials.length > 1 && (
                  <MarqueeRow items={[...testimonials].reverse()} reverse />
                )}
              </div>
            </section>
          )}

          {/* ------------------------------------------------ Contact */}
          <section id="contact" className="scroll-mt-24 py-16 md:py-24">
            <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-20 text-center dark:bg-ink-900 md:py-28">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    'radial-gradient(60% 80% at 50% 0%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)',
                }}
              />
              <div className="relative">
                <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Construisons quelque chose de grand
                </h2>
                <p className="mx-auto mt-4 max-w-md text-ink-300">
                  Donne vie à tes idées avec un travail soigné, pensé pour tes
                  clients
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="#devis"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-ink-100"
                  >
                    Me contacter
                    <ArrowRight size={15} />
                  </a>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-ink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
                    >
                      <MessageCircle size={15} />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div id="devis" className="mx-auto mt-12 max-w-2xl scroll-mt-24">
              <PublicLeadForm
                userId={portfolio.user_id}
                ownerFirstName={owner?.first_name}
              />
            </div>
          </section>
        </main>

        {/* ------------------------------------------------ Footer */}
        <footer className="border-t border-ink-100 py-10 dark:border-ink-800">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 md:flex-row md:justify-between">
            <p className="text-sm text-ink-400">
              © {new Date().getFullYear()} {displayName}
            </p>
            <nav className="flex flex-wrap justify-center gap-5">
              {[...NAV_LINKS, { href: '#contact', label: 'Contact' }].map(
                (l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="text-sm text-ink-500 transition hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
                  >
                    {l.label}
                  </a>
                ),
              )}
            </nav>
            <p className="text-sm text-ink-400">
              Propulsé par{' '}
              <Link
                to="/"
                className="font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white"
              >
                Pipeline
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="text-center">
      <span className="inline-flex rounded-full border border-ink-100 bg-cream-100 px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-md text-ink-500 dark:text-ink-400">
          {subtitle}
        </p>
      )}
    </div>
  )
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: PortfolioTestimonial[]
  reverse?: boolean
}) {
  // Duplique le contenu pour une boucle infinie sans couture
  const doubled = [...items, ...items, ...items, ...items].slice(
    0,
    Math.max(8, items.length * 2),
  )
  return (
    <div className="group flex overflow-hidden">
      <div
        className={`flex w-max shrink-0 gap-5 pr-5 group-hover:[animation-play-state:paused] ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        }`}
      >
        {[...doubled, ...doubled].map((t, i) => (
          <TestimonialCard key={`${t.id}-${i}`} t={t} />
        ))}
      </div>
    </div>
  )
}

function TestimonialCard({ t }: { t: PortfolioTestimonial }) {
  return (
    <figure className="w-80 shrink-0 rounded-3xl border border-ink-100 bg-cream-100/60 p-6 dark:border-ink-800 dark:bg-ink-900/60">
    <blockquote className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">
        « {t.content} »
      </blockquote>
      <figcaption className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{t.client_name}</span>
        {t.rating != null && (
          <span
            className="flex items-center gap-0.5"
            style={{ color: 'var(--accent)' }}
          >
            {Array.from({ length: t.rating }).map((_, i) => (
              <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
