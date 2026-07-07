import { supabase } from '@/lib/supabase'

export interface Portfolio {
  user_id: string
  slug: string
  is_published: boolean
  headline: string | null
  bio: string | null
  photo_url: string | null
  whatsapp_number: string | null
  theme: string
  view_count: number
  is_available: boolean
  cv_url: string | null
  tools: string[]
  created_at: string
  updated_at: string
}

export interface PortfolioExperience {
  id: string
  user_id: string
  role: string
  company: string
  start_year: string
  end_year: string | null
  description: string | null
  order_index: number
  created_at: string
}

export interface PortfolioService {
  id: string
  user_id: string
  title: string
  description: string | null
  price: number | null
  currency: string
  image_url: string | null
  order_index: number
  created_at: string
}

export interface PortfolioProject {
  id: string
  user_id: string
  title: string
  description: string | null
  image_url: string | null
  external_link: string | null
  order_index: number
  created_at: string
}

export interface PortfolioTestimonial {
  id: string
  user_id: string
  client_name: string
  content: string
  rating: number | null
  order_index: number
  created_at: string
}

export interface PortfolioBundle {
  portfolio: Portfolio | null
  services: PortfolioService[]
  projects: PortfolioProject[]
  testimonials: PortfolioTestimonial[]
  experiences: PortfolioExperience[]
}

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

export function suggestSlug(firstName: string, lastName: string) {
  const base = slugify(`${firstName}-${lastName}`)
  return base || `pipeline-${Math.random().toString(36).slice(2, 8)}`
}

export async function isSlugAvailable(slug: string, currentUserId: string) {
  const { data } = await supabase
    .from('portfolios')
    .select('user_id')
    .eq('slug', slug)
    .maybeSingle()
  return !data || data.user_id === currentUserId
}

export async function fetchPortfolioBundle(userId: string): Promise<PortfolioBundle> {
  const [pRes, sRes, jRes, tRes, eRes] = await Promise.all([
    supabase.from('portfolios').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('portfolio_services')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
    supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
    supabase
      .from('portfolio_testimonials')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
    supabase
      .from('portfolio_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
  ])
  return {
    portfolio: (pRes.data as Portfolio | null) ?? null,
    services: (sRes.data as PortfolioService[]) ?? [],
    projects: (jRes.data as PortfolioProject[]) ?? [],
    testimonials: (tRes.data as PortfolioTestimonial[]) ?? [],
    experiences: (eRes.data as PortfolioExperience[]) ?? [],
  }
}

export async function upsertPortfolio(
  userId: string,
  patch: Partial<Portfolio>,
): Promise<{ data: Portfolio | null; error: string | null }> {
  const { data, error } = await supabase
    .from('portfolios')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select()
    .single()
  return {
    data: (data as Portfolio | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function fetchPublicPortfolio(slug: string): Promise<PortfolioBundle | null> {
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (!portfolio) return null

  const userId = (portfolio as Portfolio).user_id
  const [sRes, jRes, tRes, eRes] = await Promise.all([
    supabase
      .from('portfolio_services')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
    supabase
      .from('portfolio_projects')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
    supabase
      .from('portfolio_testimonials')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
    supabase
      .from('portfolio_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('order_index'),
  ])

  return {
    portfolio: portfolio as Portfolio,
    services: (sRes.data as PortfolioService[]) ?? [],
    projects: (jRes.data as PortfolioProject[]) ?? [],
    testimonials: (tRes.data as PortfolioTestimonial[]) ?? [],
    experiences: (eRes.data as PortfolioExperience[]) ?? [],
  }
}

// ----------------------------------------------------------------------------
// Expériences
// ----------------------------------------------------------------------------

export async function saveExperience(
  input: Partial<PortfolioExperience> & {
    user_id: string
    role: string
    company: string
    start_year: string
  },
) {
  if (input.id) {
    const { id, ...patch } = input
    const { data, error } = await supabase
      .from('portfolio_experiences')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    return {
      data: (data as PortfolioExperience | null) ?? null,
      error: error?.message ?? null,
    }
  }
  const { data, error } = await supabase
    .from('portfolio_experiences')
    .insert(input)
    .select()
    .single()
  return {
    data: (data as PortfolioExperience | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function deleteExperience(id: string) {
  await supabase.from('portfolio_experiences').delete().eq('id', id)
}

export async function incrementPortfolioView(slug: string) {
  await supabase.rpc('increment_portfolio_view', { p_slug: slug })
}

export async function submitLead(input: {
  user_id: string
  name: string
  email?: string
  phone?: string
  message?: string
}) {
  const { error } = await supabase.from('portfolio_leads').insert(input)
  return { error: error?.message ?? null }
}

export async function fetchOwnerProfileForPortfolio(slug: string) {
  // RPC security definer : lisible sans être connecté, n'expose que les
  // champs publics et seulement si le portfolio est publié.
  const { data } = await supabase.rpc('get_portfolio_owner', { p_slug: slug })
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as {
    first_name: string
    last_name: string
    job_title: string | null
    company_name: string | null
  } | null
}
