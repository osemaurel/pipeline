import { supabase } from '@/lib/supabase'
import type {
  PortfolioExperience,
  PortfolioProject,
  PortfolioService,
  PortfolioTestimonial,
} from '@/lib/portfolioData'

export type PortfolioAiSection =
  | 'headline'
  | 'bio'
  | 'services'
  | 'projects'
  | 'experiences'
  | 'testimonials'

export interface PortfolioAiResult {
  headline?: string
  bio?: string
  services?: { title: string; description?: string; price?: number | null }[]
  projects?: { title: string; description?: string }[]
  experiences?: {
    role: string
    company: string
    start_year: string
    end_year?: string | null
    description?: string
  }[]
  testimonials?: { client_name: string; content: string; rating?: number | null }[]
}

export const AI_SECTIONS: {
  value: PortfolioAiSection
  label: string
  description: string
  draft?: boolean
}[] = [
  {
    value: 'headline',
    label: 'Accroche',
    description: 'La phrase d’accroche du hero',
  },
  { value: 'bio', label: 'Bio', description: 'Ta biographie professionnelle' },
  {
    value: 'services',
    label: 'Services',
    description: '3 offres avec prix indicatif',
  },
  {
    value: 'projects',
    label: 'Projets',
    description: '3 réalisations exemples',
    draft: true,
  },
  {
    value: 'experiences',
    label: 'Expériences',
    description: '3 postes exemples',
    draft: true,
  },
  {
    value: 'testimonials',
    label: 'Témoignages',
    description: '3 avis clients exemples',
    draft: true,
  },
]

export async function generatePortfolioContent(sections: PortfolioAiSection[]) {
  const { data, error } = await supabase.functions.invoke<{
    result: PortfolioAiResult
  }>('generate-portfolio', { body: { sections } })

  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.clone().json()) as { error?: string }
        if (body?.error) message = body.error
      } catch {
        /* garde le message générique */
      }
    }
    return { data: null, error: message }
  }
  return { data: data?.result ?? null, error: null }
}

/**
 * Insère le contenu généré dans les tables (mode ajout, jamais de suppression).
 * Retourne les lignes créées pour mise à jour de l'état côté UI.
 */
export async function applyGeneratedContent(
  userId: string,
  result: PortfolioAiResult,
  counts: {
    services: number
    projects: number
    experiences: number
    testimonials: number
  },
) {
  const inserted: {
    services: PortfolioService[]
    projects: PortfolioProject[]
    experiences: PortfolioExperience[]
    testimonials: PortfolioTestimonial[]
  } = { services: [], projects: [], experiences: [], testimonials: [] }

  if (result.services?.length) {
    const rows = result.services.map((s, i) => ({
      user_id: userId,
      title: s.title,
      description: s.description ?? null,
      price: typeof s.price === 'number' ? s.price : null,
      order_index: counts.services + i,
    }))
    const { data } = await supabase
      .from('portfolio_services')
      .insert(rows)
      .select()
    inserted.services = (data as PortfolioService[]) ?? []
  }

  if (result.projects?.length) {
    const rows = result.projects.map((p, i) => ({
      user_id: userId,
      title: p.title,
      description: p.description ?? null,
      order_index: counts.projects + i,
    }))
    const { data } = await supabase
      .from('portfolio_projects')
      .insert(rows)
      .select()
    inserted.projects = (data as PortfolioProject[]) ?? []
  }

  if (result.experiences?.length) {
    const rows = result.experiences.map((x, i) => ({
      user_id: userId,
      role: x.role,
      company: x.company,
      start_year: String(x.start_year),
      end_year: x.end_year ? String(x.end_year) : null,
      description: x.description ?? null,
      order_index: counts.experiences + i,
    }))
    const { data } = await supabase
      .from('portfolio_experiences')
      .insert(rows)
      .select()
    inserted.experiences = (data as PortfolioExperience[]) ?? []
  }

  if (result.testimonials?.length) {
    const rows = result.testimonials.map((t, i) => ({
      user_id: userId,
      client_name: t.client_name,
      content: t.content,
      rating: typeof t.rating === 'number' ? t.rating : null,
      order_index: counts.testimonials + i,
    }))
    const { data } = await supabase
      .from('portfolio_testimonials')
      .insert(rows)
      .select()
    inserted.testimonials = (data as PortfolioTestimonial[]) ?? []
  }

  return inserted
}
