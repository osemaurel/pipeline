import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-4o"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY n'est pas configurée dans les Secrets Supabase." }, 500)

  const auth = req.headers.get("Authorization")
  if (!auth) return json({ error: "Non authentifié" }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: uErr } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""))
  if (uErr || !user) return json({ error: "Session invalide" }, 401)

  let body: { platform?: string; suggested_service_id?: string; title?: string }
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }
  const platform = body.platform === "fiverr" ? "fiverr" : "comeup"
  const lang = platform === "fiverr" ? "en" : "fr"
  const currency = platform === "fiverr" ? "USD" : "EUR"

  let baseTitle = body.title ?? ""
  let category: string | null = null
  if (body.suggested_service_id) {
    const { data: sg } = await admin.from("suggested_services").select("*").eq("id", body.suggested_service_id).eq("user_id", user.id).maybeSingle()
    if (sg) { baseTitle = String(sg.title); category = sg.category ? String(sg.category) : null }
  }
  if (!baseTitle.trim()) return json({ error: "Titre du service manquant." }, 400)

  await admin.rpc("init_search_credits", { p_user_id: user.id })
  const { data: credit } = await admin.from("search_credits").select("credits_remaining, credits_used_total").eq("user_id", user.id).single()
  const remaining = credit?.credits_remaining ?? 0
  if (remaining < 1) return json({ error: "Crédits épuisés." }, 402)

  const { data: pData } = await admin.from("profiles").select("first_name,last_name,job_title,main_offer,pitch_solution,pitch_proposition,icp_main_problem,icp_budget_range").eq("user_id", user.id).maybeSingle()
  const p = (pData ?? {}) as Record<string, string | null>

  const system = platform === "fiverr"
    ? "You are an expert Fiverr copywriter and pricing strategist. Write compelling, structured gig content that converts. Reply with valid JSON only."
    : "Tu es un copywriter expert de ComeUp. Tu rédiges des fiches de service structurées et convaincantes qui vendent. Réponds uniquement en JSON valide."

  const ctx = `Freelance: ${p.first_name ?? ""} ${p.last_name ?? ""} — ${p.job_title ?? ""}. Offre: ${p.main_offer ?? ""}. Valeur: ${p.pitch_proposition ?? ""}.`

  const userPrompt = platform === "fiverr"
    ? `${ctx}\nGig to write (title starts with "I will"): "${baseTitle}"${category ? ` (category: ${category})` : ""}.\n\nReturn a JSON object with EXACTLY these keys:\n- "title": final gig title, MUST start with "I will", polished\n- "description": full English gig description, structured (hook -> what you get -> process -> why me), 150-300 words, no markdown headers\n- "tags": array of 5-8 relevant search tags (lowercase strings)\n- "faq": array of 3-5 objects {"question","answer"}\n- "pricing_tiers": array of exactly 3 objects {"tier":"basic"|"standard"|"premium","price": integer USD,"delivery_days": integer,"features": array of 2-4 short strings}`
    : `${ctx}\nService à rédiger (titre commence par "Je vais") : "${baseTitle}"${category ? ` (catégorie : ${category})` : ""}.\n\nRenvoie un objet JSON avec EXACTEMENT ces clés :\n- "title": titre final du service, DOIT commencer par "Je vais", peaufiné\n- "description": description complète en français, structurée (accroche -> ce que vous obtenez -> processus -> pourquoi moi), 150 à 300 mots, sans titres markdown\n- "price": prix conseillé en euros (nombre entier)\n- "tags": tableau de 5 à 10 tags pertinents (chaînes en minuscules)\n- "faq": tableau de 3 à 5 objets {"question","answer"}`

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }], response_format: { type: "json_object" } }),
  })
  if (!aiRes.ok) {
    const d = await aiRes.text().catch(() => "")
    return json({ error: `Erreur OpenAI (${aiRes.status}): ${d.slice(0, 250)}` }, 502)
  }
  const completion = await aiRes.json()
  const raw: string = completion?.choices?.[0]?.message?.content ?? ""
  let obj: Record<string, unknown>
  try { obj = JSON.parse(raw) } catch { return json({ error: "Réponse IA illisible, réessaie." }, 502) }

  const row = {
    user_id: user.id,
    suggested_service_id: body.suggested_service_id ?? null,
    platform,
    title: String(obj.title ?? baseTitle).slice(0, 300),
    description: String(obj.description ?? ""),
    price: typeof obj.price === "number" ? obj.price : null,
    currency,
    tags: Array.isArray(obj.tags) ? (obj.tags as unknown[]).map(String).slice(0, 10) : [],
    faq: Array.isArray(obj.faq) ? obj.faq : [],
    pricing_tiers: Array.isArray(obj.pricing_tiers) ? obj.pricing_tiers : [],
    language: lang,
  }
  const { data: saved } = await admin.from("generated_services").insert(row).select().single()
  if (body.suggested_service_id) await admin.from("suggested_services").update({ is_selected: true }).eq("id", body.suggested_service_id)

  await admin.from("search_credits").update({
    credits_remaining: Math.max(0, remaining - 1),
    credits_used_total: (credit?.credits_used_total ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  return json({ service: saved, credits_remaining: Math.max(0, remaining - 1) })
})
