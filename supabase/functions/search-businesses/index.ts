import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const USER_AGENT = "Pipeline/1.0 (freelance prospecting; contact via app)"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Catégorie logique -> tag OSM
const CATEGORY_MAP: Record<string, { key: string; value: string }> = {
  restaurant: { key: "amenity", value: "restaurant" },
  fast_food: { key: "amenity", value: "fast_food" },
  cafe: { key: "amenity", value: "cafe" },
  bar: { key: "amenity", value: "bar" },
  bakery: { key: "shop", value: "bakery" },
  hairdresser: { key: "shop", value: "hairdresser" },
  beauty: { key: "shop", value: "beauty" },
  butcher: { key: "shop", value: "butcher" },
  florist: { key: "shop", value: "florist" },
  pharmacy: { key: "amenity", value: "pharmacy" },
  optician: { key: "shop", value: "optician" },
  clothes: { key: "shop", value: "clothes" },
  car_repair: { key: "shop", value: "car_repair" },
  hotel: { key: "tourism", value: "hotel" },
  estate_agent: { key: "office", value: "estate_agent" },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

interface OsmTags {
  name?: string
  website?: string
  "contact:website"?: string
  phone?: string
  "contact:phone"?: string
  email?: string
  "contact:email"?: string
  "addr:housenumber"?: string
  "addr:street"?: string
  "addr:postcode"?: string
  "addr:city"?: string
}

interface RawResult {
  business_name: string
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
}

function buildAddress(t: OsmTags): string | null {
  const parts = [
    [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
    [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" "),
  ].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

async function runOverpass(
  city: string,
  key: string,
  value: string,
): Promise<{ tags: OsmTags }[]> {
  const query = `[out:json][timeout:25];area["name"="${city.replace(/"/g, "")}"]["boundary"="administrative"]->.a;(node["${key}"="${value}"](area.a);way["${key}"="${value}"](area.a););out center tags 60;`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 28000)
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "data=" + encodeURIComponent(query),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Overpass ${res.status}`)
    }
    const data = await res.json()
    return (data.elements ?? []) as { tags: OsmTags }[]
  } finally {
    clearTimeout(timeout)
  }
}

// Enrichit un résultat avec le dirigeant via l'annuaire des entreprises.
// N'accepte le dirigeant que si la commune du résultat correspond à la ville.
async function fetchOwner(
  businessName: string,
  city: string,
): Promise<string | null> {
  try {
    const url =
      "https://recherche-entreprises.api.gouv.fr/search?per_page=1&q=" +
      encodeURIComponent(`${businessName} ${city}`)
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
    if (!res.ok) return null
    const data = await res.json()
    const r = (data.results ?? [])[0]
    if (!r) return null

    const commune: string = r?.siege?.libelle_commune ?? ""
    if (commune && normalize(commune) !== normalize(city)) {
      // Commune différente : on ne fait pas confiance à ce match
      return null
    }
    const dg = (r.dirigeants ?? [])[0]
    if (!dg) return null
    const person = [dg.prenoms, dg.nom].filter(Boolean).join(" ").trim()
    return person || dg.denomination || null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Non authentifié" }, 401)

  const jwt = authHeader.replace(/^Bearer\s+/i, "")
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(jwt)
  if (userError || !user) return json({ error: "Session invalide" }, 401)

  let body: { city?: string; category?: string; exclude_with_website?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ error: "JSON invalide" }, 400)
  }

  const city = (body.city ?? "").trim()
  const category = (body.category ?? "").trim()
  const excludeWithWebsite = body.exclude_with_website !== false
  if (!city) return json({ error: "La ville est requise." }, 400)
  const cat = CATEGORY_MAP[category]
  if (!cat) return json({ error: "Catégorie inconnue." }, 400)

  // -- Crédits : on garantit une ligne puis on VÉRIFIE AVANT de chercher --------
  await admin.rpc("init_search_credits", { p_user_id: user.id })
  const { data: creditRow } = await admin
    .from("search_credits")
    .select("credits_remaining, credits_used_total")
    .eq("user_id", user.id)
    .single()

  const remaining = creditRow?.credits_remaining ?? 0
  if (remaining < 1) {
    return json(
      {
        error:
          "Crédits de recherche épuisés. Tu as utilisé tes 20 recherches offertes.",
        credits_remaining: 0,
      },
      402,
    )
  }

  // -- Trace la recherche (pending) --------------------------------------------
  const { data: searchRow, error: searchErr } = await admin
    .from("lead_searches")
    .insert({
      user_id: user.id,
      city,
      category,
      exclude_with_website: excludeWithWebsite,
      status: "pending",
    })
    .select()
    .single()
  if (searchErr || !searchRow) {
    return json({ error: "Impossible d'enregistrer la recherche." }, 500)
  }

  // -- Overpass ----------------------------------------------------------------
  let elements: { tags: OsmTags }[]
  try {
    elements = await runOverpass(city, cat.key, cat.value)
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "La recherche a expiré (ville trop grande ou service surchargé). Réessaie ou choisis une ville plus précise."
        : "Le service de cartographie est momentanément indisponible. Réessaie dans un instant."
    await admin
      .from("lead_searches")
      .update({ status: "failed", error_message: msg })
      .eq("id", searchRow.id)
    return json({ error: msg }, 502)
  }

  // -- Filtrage ----------------------------------------------------------------
  let raw: RawResult[] = []
  for (const el of elements) {
    const t = el.tags ?? {}
    if (!t.name) continue // business_name NOT NULL
    const website = t.website || t["contact:website"] || null
    if (excludeWithWebsite && website) continue
    raw.push({
      business_name: t.name,
      address: buildAddress(t),
      phone: t.phone || t["contact:phone"] || null,
      website,
      email: t.email || t["contact:email"] || null,
    })
  }

  // Déduplication par nom + adresse
  const seen = new Set<string>()
  raw = raw.filter((r) => {
    const k = normalize(r.business_name) + "|" + normalize(r.address ?? "")
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  // -- Plafonnement par crédits : 1 crédit / 10 résultats ----------------------
  const maxByCredits = remaining * 10
  if (raw.length > maxByCredits) raw = raw.slice(0, maxByCredits)

  // -- Enrichissement dirigeant (limité pour tenir le temps d'exécution) -------
  const ENRICH_LIMIT = 20
  const enriched: (RawResult & { owner_name: string | null })[] = []
  for (let i = 0; i < raw.length; i++) {
    let owner: string | null = null
    if (i < ENRICH_LIMIT) {
      owner = await fetchOwner(raw[i].business_name, city)
    }
    enriched.push({ ...raw[i], owner_name: owner })
  }

  const creditsSpent = Math.max(0, Math.ceil(enriched.length / 10))

  // -- Persistance des résultats -----------------------------------------------
  let insertedResults: unknown[] = []
  if (enriched.length > 0) {
    const rows = enriched.map((r) => ({
      search_id: searchRow.id,
      user_id: user.id,
      business_name: r.business_name,
      address: r.address,
      phone: r.phone,
      website: r.website,
      owner_name: r.owner_name,
      email: r.email,
      source: "osm",
      enriched: r.owner_name != null,
    }))
    const { data } = await admin
      .from("lead_search_results")
      .insert(rows)
      .select()
    insertedResults = data ?? []
  }

  // -- Débit des crédits (jamais négatif) --------------------------------------
  if (creditsSpent > 0) {
    await admin
      .from("search_credits")
      .update({
        credits_remaining: Math.max(0, remaining - creditsSpent),
        credits_used_total:
          ((creditRow as { credits_used_total?: number })?.credits_used_total ??
            0) + creditsSpent,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
  }

  await admin
    .from("lead_searches")
    .update({
      status: "completed",
      results_count: enriched.length,
      credits_spent: creditsSpent,
      completed_at: new Date().toISOString(),
    })
    .eq("id", searchRow.id)

  return json({
    search_id: searchRow.id,
    results: insertedResults,
    results_count: enriched.length,
    credits_spent: creditsSpent,
    credits_remaining: Math.max(0, remaining - creditsSpent),
  })
})
