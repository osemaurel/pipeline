import { supabase } from '@/lib/supabase'

export interface LeadSearch {
  id: string
  user_id: string
  city: string
  category: string
  exclude_with_website: boolean
  results_count: number
  credits_spent: number
  status: 'pending' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface LeadResult {
  id: string
  search_id: string
  user_id: string
  business_name: string
  address: string | null
  phone: string | null
  website: string | null
  owner_name: string | null
  email: string | null
  source: string
  enriched: boolean
  contacted: boolean
  contacted_at: string | null
  contact_method: string | null
  converted_to_prospect_id: string | null
  created_at: string
}

export const BUSINESS_CATEGORIES: { value: string; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'fast_food', label: 'Fast-food' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'bakery', label: 'Boulangerie' },
  { value: 'hairdresser', label: 'Coiffeur' },
  { value: 'beauty', label: 'Institut de beauté' },
  { value: 'butcher', label: 'Boucherie' },
  { value: 'florist', label: 'Fleuriste' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'optician', label: 'Opticien' },
  { value: 'clothes', label: 'Boutique de vêtements' },
  { value: 'car_repair', label: 'Garage auto' },
  { value: 'hotel', label: 'Hôtel' },
  { value: 'estate_agent', label: 'Agence immobilière' },
]

export const categoryLabel = (value: string) =>
  BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value

// ----------------------------------------------------------------------------
// Crédits
// ----------------------------------------------------------------------------

export async function fetchCredits(userId: string): Promise<number> {
  const { data } = await supabase
    .from('search_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .maybeSingle()
  // Si la ligne n'existe pas encore (jamais cherché), l'utilisateur a ses 20.
  if (!data) return 20
  return data.credits_remaining as number
}

// ----------------------------------------------------------------------------
// Recherche : appel Overpass côté client (les serveurs Overpass bloquent les
// IPs data-center type Deno Deploy / Supabase Edge → HTTP 406). Depuis le
// navigateur du user, l'IP consommateur passe. L'edge function garde le rôle
// vérif crédits + enrichissement dirigeant + persistence + débit.
// ----------------------------------------------------------------------------

export interface SearchResponse {
  search_id: string
  results: LeadResult[]
  results_count: number
  credits_spent: number
  credits_remaining: number
}

interface OverpassRawResult {
  business_name: string
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
}

// L'appel à Overpass passe par notre propre Vercel Serverless Function
// (`/api/overpass`) au lieu d'un fetch direct depuis le browser. Raison :
// Overpass API renvoie HTTP 406 sur les fetch qui portent un User-Agent
// browser (Mozilla/5.0 Chrome), qu'un fetch client ne peut pas overrider.
// Notre proxy Node envoie un User-Agent "TopCloz/…" accepté par Overpass.
async function queryOverpass(
  city: string,
  category: string,
  excludeWithWebsite: boolean,
): Promise<{ results: OverpassRawResult[] | null; error: string | null }> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 40000)
  try {
    const res = await fetch('/api/overpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, category, excludeWithWebsite }),
      signal: controller.signal,
    })
    window.clearTimeout(timeoutId)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        results: null,
        error: typeof body?.error === 'string'
          ? body.error
          : `Erreur ${res.status} sur /api/overpass`,
      }
    }
    return { results: (body?.results as OverpassRawResult[]) ?? [], error: null }
  } catch (e) {
    window.clearTimeout(timeoutId)
    const name = e instanceof Error ? e.name : 'unknown'
    if (name === 'AbortError') {
      return { results: null, error: 'La recherche a expiré. Réessaie ou choisis une ville plus précise.' }
    }
    // eslint-disable-next-line no-console
    console.error('[queryOverpass] proxy call failed:', e)
    return { results: null, error: "Le proxy /api/overpass n'a pas répondu. Réessaie dans un instant." }
  }
}

export async function runBusinessSearch(input: {
  city: string
  category: string
  exclude_with_website: boolean
}): Promise<{ data: SearchResponse | null; error: string | null }> {
  // Étape 1 : appel Overpass côté client (IP consommateur, non blacklistée)
  const { results: rawResults, error: overpassError } = await queryOverpass(
    input.city,
    input.category,
    input.exclude_with_website,
  )
  if (overpassError) return { data: null, error: overpassError }

  // Étape 2 : edge function pour vérif crédits, enrichissement, persistence, débit
  const { data, error } = await supabase.functions.invoke<SearchResponse>(
    'search-businesses',
    { body: { ...input, raw_results: rawResults ?? [] } },
  )
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
  return { data: data ?? null, error: null }
}

// ----------------------------------------------------------------------------
// Historique
// ----------------------------------------------------------------------------

export async function fetchSearchHistory(userId: string): Promise<LeadSearch[]> {
  const { data } = await supabase
    .from('lead_searches')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(30)
  return (data as LeadSearch[]) ?? []
}

export async function fetchSearchResults(
  searchId: string,
): Promise<LeadResult[]> {
  const { data } = await supabase
    .from('lead_search_results')
    .select('*')
    .eq('search_id', searchId)
    .order('created_at', { ascending: true })
  return (data as LeadResult[]) ?? []
}

// ----------------------------------------------------------------------------
// Contact + conversion en prospect
// ----------------------------------------------------------------------------

function splitOwner(ownerName: string | null, businessName: string) {
  if (ownerName && ownerName.trim()) {
    const parts = ownerName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
    }
    return { first_name: parts[0], last_name: businessName }
  }
  // Pas de dirigeant connu : placeholder éditable ensuite dans le CRM
  return { first_name: 'Contact', last_name: businessName }
}

/**
 * Crée un prospect dans le CRM à partir d'un résultat de recherche,
 * puis lie le résultat au prospect créé. Idempotent : si déjà converti,
 * renvoie l'id existant sans recréer.
 */
export async function convertResultToProspect(
  userId: string,
  result: LeadResult,
  channel: 'email' | 'whatsapp' | 'other',
): Promise<{ prospectId: string | null; error: string | null }> {
  if (result.converted_to_prospect_id) {
    return { prospectId: result.converted_to_prospect_id, error: null }
  }

  const { first_name, last_name } = splitOwner(
    result.owner_name,
    result.business_name,
  )

  const { data: prospect, error: pErr } = await supabase
    .from('prospects')
    .insert({
      user_id: userId,
      first_name,
      last_name,
      company_name: result.business_name,
      email: result.email,
      phone: result.phone,
      company_website: result.website,
      city: null,
      channel,
      status: 'new',
      source: 'lead_search',
      notes: result.address ? `Adresse : ${result.address}` : null,
    })
    .select('id')
    .single()

  if (pErr || !prospect) {
    return { prospectId: null, error: pErr?.message ?? 'Création échouée.' }
  }

  await supabase
    .from('lead_search_results')
    .update({ converted_to_prospect_id: prospect.id })
    .eq('id', result.id)

  return { prospectId: prospect.id, error: null }
}

/**
 * Marque un résultat comme contacté (email ou whatsapp) et crée le prospect lié.
 */
export async function markContacted(
  userId: string,
  result: LeadResult,
  method: 'email' | 'whatsapp',
): Promise<{ result: LeadResult | null; error: string | null }> {
  const { prospectId, error } = await convertResultToProspect(
    userId,
    result,
    method,
  )
  if (error) return { result: null, error }

  const { data } = await supabase
    .from('lead_search_results')
    .update({
      contacted: true,
      contacted_at: new Date().toISOString(),
      contact_method: method,
      converted_to_prospect_id: prospectId,
    })
    .eq('id', result.id)
    .select()
    .single()

  return { result: (data as LeadResult | null) ?? null, error: null }
}
