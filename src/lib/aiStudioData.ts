import { supabase } from '@/lib/supabase'

export type Platform = 'comeup' | 'fiverr'

export interface SuggestedService {
  id: string
  user_id: string
  platform: string
  title: string
  category: string | null
  price_min: number | null
  price_max: number | null
  currency: string
  potential: 'high' | 'medium' | 'low' | string
  rationale: string | null
  is_selected: boolean
  created_at: string
}

export interface FaqItem {
  question: string
  answer: string
}
export interface PricingTier {
  tier: string
  price: number
  delivery_days: number
  features: string[]
}

export interface GeneratedService {
  id: string
  user_id: string
  suggested_service_id: string | null
  platform: string
  title: string
  description: string
  price: number | null
  currency: string
  tags: string[]
  faq: FaqItem[]
  pricing_tiers: PricingTier[]
  language: string
  thumbnail_url: string | null
  thumbnail_style_used: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface UpworkProposal {
  id: string
  user_id: string
  job_offer_text: string
  job_title: string | null
  generated_proposal: string
  language: string
  is_used: boolean
  created_at: string
}

export interface VisualStyle {
  user_id: string
  style_preset: string
  custom_style_prompt: string | null
  reference_image_url: string | null
  primary_color: string | null
  updated_at: string
}

export const STYLE_PRESETS: { value: string; label: string; desc: string }[] = [
  { value: 'modern_clean', label: 'Moderne épuré', desc: 'Minimaliste, beaucoup d’espace' },
  { value: 'bold_typo', label: 'Typo audacieuse', desc: 'Gros titres, fort contraste' },
  { value: 'photo_pro', label: 'Photo pro', desc: 'Rendu photographique studio' },
  { value: 'minimal_pastel', label: 'Pastel minimal', desc: 'Dégradés doux, élégant' },
  { value: 'tech_dark', label: 'Tech sombre', desc: 'Néon, glassmorphism, SaaS' },
  { value: 'custom', label: 'Personnalisé', desc: 'Décris ton propre style' },
]

// ---- Crédits (partagés avec le module recherche) ----
export async function fetchCredits(userId: string): Promise<number> {
  const { data } = await supabase
    .from('search_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .maybeSingle()
  return data ? (data.credits_remaining as number) : 20
}

// ---- Invocation générique avec extraction d'erreur FR ----
async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body })
  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const b = (await ctx.clone().json()) as { error?: string }
        if (b?.error) message = b.error
      } catch { /* garde le message générique */ }
    }
    return { data: null, error: message }
  }
  return { data: data ?? null, error: null }
}

// ---- Suggestions ----
export function suggestServices(platform: Platform) {
  return invoke<{ suggestions: SuggestedService[]; credits_remaining: number }>('suggest-comeup-services', { platform })
}
export async function fetchSuggestions(userId: string, platform: Platform) {
  const { data } = await supabase
    .from('suggested_services')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data as SuggestedService[]) ?? []
}

// ---- Rédaction de service ----
export function generateService(platform: Platform, suggestedServiceId: string) {
  return invoke<{ service: GeneratedService; credits_remaining: number }>('generate-comeup-service', {
    platform,
    suggested_service_id: suggestedServiceId,
  })
}
export async function fetchGeneratedServices(userId: string, platform: Platform) {
  const { data } = await supabase
    .from('generated_services')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .order('created_at', { ascending: false })
  return (data as GeneratedService[]) ?? []
}
export async function updateGeneratedService(id: string, patch: Partial<GeneratedService>) {
  const { data } = await supabase.from('generated_services').update(patch).eq('id', id).select().single()
  return (data as GeneratedService | null) ?? null
}
export async function deleteGeneratedService(id: string) {
  await supabase.from('generated_services').delete().eq('id', id)
}

// ---- Miniature ----
export function generateThumbnail(input: {
  service_id: string
  style_preset: string
  custom_style_prompt?: string
  primary_color?: string
  save_as_default?: boolean
}) {
  return invoke<{ thumbnail_url: string; credits_remaining: number }>('generate-service-thumbnail', input)
}

// ---- Style visuel ----
export async function fetchVisualStyle(userId: string): Promise<VisualStyle | null> {
  const { data } = await supabase.from('user_visual_style').select('*').eq('user_id', userId).maybeSingle()
  return (data as VisualStyle | null) ?? null
}

// ---- Upwork ----
export function generateUpworkProposal(jobOfferText: string) {
  return invoke<{ proposal: UpworkProposal; credits_remaining: number }>('generate-upwork-proposal', {
    job_offer_text: jobOfferText,
  })
}
export async function fetchUpworkProposals(userId: string) {
  const { data } = await supabase
    .from('upwork_proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return (data as UpworkProposal[]) ?? []
}
export async function markProposalUsed(id: string, used: boolean) {
  await supabase.from('upwork_proposals').update({ is_used: used }).eq('id', id)
}
