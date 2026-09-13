import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// Dernière version de GPT (via API Responses). Surchargeable via secret.
// Repli auto sur gpt-5.5 puis gpt-4o si le modèle n'est pas dispo sur le compte.
const OPENAI_TEXT_MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-5.6"
const TEXT_FALLBACKS = ["gpt-5.5", "gpt-4o"]

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

const line = (l: string, v: string | null | undefined) => (v && v.trim() ? `- ${l}: ${v.trim()}` : "")

// ---------------------------------------------------------------------------
// OpenAI Responses API — helper inline
// ---------------------------------------------------------------------------
interface CallOpts {
  instructions: string
  input: string
  json?: boolean
  reasoningEffort?: "low" | "medium" | "high"
  maxOutputTokens?: number
}
async function callResponses(o: CallOpts): Promise<
  { ok: true; text: string; modelUsed: string } | { ok: false; status: number; error: string }
> {
  const chain = [OPENAI_TEXT_MODEL, ...TEXT_FALLBACKS.filter((m) => m !== OPENAI_TEXT_MODEL)]
  let last = { status: 500, error: "no model tried" }
  for (const model of chain) {
    const isReasoning = /^(gpt-5|o\d)/i.test(model)
    const body: Record<string, unknown> = { model, instructions: o.instructions, input: o.input }
    if (isReasoning) body.reasoning = { effort: o.reasoningEffort ?? "low" }
    if (o.json) body.text = { format: { type: "json_object" } }
    if (o.maxOutputTokens) body.max_output_tokens = o.maxOutputTokens
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      const text = typeof data?.output_text === "string" && data.output_text.length > 0
        ? data.output_text
        : extractOutputText(data?.output)
      return { ok: true, text: String(text ?? ""), modelUsed: model }
    }
    const errText = await res.text().catch(() => "")
    last = { status: res.status, error: errText.slice(0, 400) }
    if (!/model|not found|does not exist|invalid_model|unsupported|does_not_exist/i.test(errText)) break
  }
  return { ok: false, ...last }
}
function extractOutputText(output: unknown): string {
  if (!Array.isArray(output)) return ""
  const parts: string[] = []
  for (const item of output) {
    const it = item as Record<string, unknown>
    if (it?.type === "message" && Array.isArray(it.content)) {
      for (const c of it.content as Array<Record<string, unknown>>) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text)
      }
    }
  }
  return parts.join("")
}

interface Profile {
  first_name: string; last_name: string; job_title: string | null
  business_type: string | null; business_description: string | null; main_offer: string | null
  pitch_problem: string | null; pitch_solution: string | null; pitch_proposition: string | null
  icp_sectors: string[]; icp_main_problem: string | null
}

function profileCtx(p: Profile) {
  return [
    line("Nom", `${p.first_name} ${p.last_name}`),
    line("Métier / rôle", p.job_title),
    line("Type d'activité", p.business_type),
    line("Description", p.business_description),
    line("Offre principale", p.main_offer),
    line("Problème résolu", p.pitch_problem),
    line("Solution", p.pitch_solution),
    line("Proposition de valeur", p.pitch_proposition),
    p.icp_sectors?.length ? `- Secteurs cibles: ${p.icp_sectors.join(", ")}` : "",
    line("Problème du client idéal", p.icp_main_problem),
  ].filter(Boolean).join("\n")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY n'est pas configurée dans les Secrets Supabase." }, 500)

  const auth = req.headers.get("Authorization")
  if (!auth) return json({ error: "Non authentifié" }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: uErr } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""))
  if (uErr || !user) return json({ error: "Session invalide" }, 401)

  let body: { platform?: string }
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }
  const platform = body.platform === "fiverr" ? "fiverr" : "comeup"
  const currency = platform === "fiverr" ? "USD" : "EUR"
  const prefix = platform === "fiverr" ? "I will" : "Je vais"

  await admin.rpc("init_search_credits", { p_user_id: user.id })
  const { data: credit } = await admin.from("search_credits").select("credits_remaining, credits_used_total").eq("user_id", user.id).single()
  const remaining = credit?.credits_remaining ?? 0
  if (remaining < 1) return json({ error: "Crédits épuisés." }, 402)

  const { data: pData } = await admin.from("profiles").select("first_name,last_name,job_title,business_type,business_description,main_offer,pitch_problem,pitch_solution,pitch_proposition,icp_sectors,icp_main_problem").eq("user_id", user.id).maybeSingle()
  if (!pData) return json({ error: "Profil introuvable — complète ton onboarding." }, 404)
  const profile = pData as Profile

  const instructions = platform === "fiverr"
    ? "You are a Fiverr top-seller strategist. You know Fiverr's marketplace, gig conventions, buyer psychology, and pricing extremely well. Reply with valid JSON only."
    : "Tu es un expert de la marketplace ComeUp (ex-5euros.com). Tu connais parfaitement ses catégories, conventions de titres, la psychologie des acheteurs et les prix pratiqués. Réponds uniquement en JSON valide."

  const input = platform === "fiverr"
    ? `Freelance profile:\n${profileCtx(profile)}\n\nSuggest 8 to 10 winning gig ideas to sell on Fiverr, tailored to this profile. Return a JSON object with a "services" key whose value is an array of objects with EXACTLY these keys:\n- "title": gig title, MUST start with "${prefix}..." (Fiverr convention)\n- "category": Fiverr category (e.g. "Programming & Tech", "Graphics & Design", "Writing & Translation", "Digital Marketing", "Video & Animation", "Music & Audio")\n- "price_min": suggested minimum price in USD (integer)\n- "price_max": suggested maximum price in USD (integer)\n- "potential": "high" | "medium" | "low"\n- "rationale": 1-2 sentences on why this gig sells well on Fiverr`
    : `Profil du freelance:\n${profileCtx(profile)}\n\nPropose 8 à 10 idées de services gagnants pour vendre sur ComeUp, adaptés à ce profil. Renvoie un objet JSON avec une clé "services" contenant un tableau d'objets avec EXACTEMENT ces clés :\n- "title": titre du service, DOIT commencer par "${prefix}..." (convention ComeUp stricte)\n- "category": catégorie ComeUp (ex: "Programmation & Tech", "Design", "Rédaction & Traduction", "Marketing digital", "Vidéo & Animation", "Musique & Audio")\n- "price_min": prix minimum conseillé en euros (nombre entier)\n- "price_max": prix maximum conseillé en euros (nombre entier)\n- "potential": "high" | "medium" | "low"\n- "rationale": 1 à 2 phrases expliquant pourquoi ce service marche bien sur ComeUp`

  const result = await callResponses({ instructions, input, json: true, reasoningEffort: "low", maxOutputTokens: 3000 })
  if (!result.ok) return json({ error: `Erreur OpenAI (${result.status}): ${result.error.slice(0, 300)}` }, 502)

  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(result.text) } catch { return json({ error: "Réponse IA illisible, réessaie." }, 502) }
  const arr = Array.isArray(parsed.services) ? parsed.services
    : Array.isArray(parsed) ? parsed
    : (Object.values(parsed).find((v) => Array.isArray(v)) as unknown[] | undefined) ?? []

  const rows = (arr as Record<string, unknown>[]).slice(0, 10).map((s) => ({
    user_id: user.id, platform,
    title: String(s.title ?? "").slice(0, 300),
    category: s.category ? String(s.category) : null,
    price_min: typeof s.price_min === "number" ? s.price_min : null,
    price_max: typeof s.price_max === "number" ? s.price_max : null,
    currency,
    potential: ["high", "medium", "low"].includes(String(s.potential)) ? String(s.potential) : "medium",
    rationale: s.rationale ? String(s.rationale) : null,
  })).filter((r) => r.title)

  if (rows.length === 0) return json({ error: "Aucune suggestion générée, réessaie." }, 502)

  const { data: inserted } = await admin.from("suggested_services").insert(rows).select()
  await admin.from("search_credits").update({
    credits_remaining: Math.max(0, remaining - 1),
    credits_used_total: (credit?.credits_used_total ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  return json({ suggestions: inserted ?? [], credits_remaining: Math.max(0, remaining - 1), model_used: result.modelUsed })
})
