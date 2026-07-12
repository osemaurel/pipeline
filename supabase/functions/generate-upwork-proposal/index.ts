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
const line = (l: string, v: string | null | undefined) => (v && v.trim() ? `- ${l}: ${v.trim()}` : "")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY n'est pas configurée dans les Secrets Supabase." }, 500)

  const auth = req.headers.get("Authorization")
  if (!auth) return json({ error: "Non authentifié" }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: uErr } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""))
  if (uErr || !user) return json({ error: "Session invalide" }, 401)

  let body: { job_offer_text?: string }
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }
  const offer = (body.job_offer_text ?? "").trim()
  if (offer.length < 30) return json({ error: "Colle le texte complet de l'offre Upwork." }, 400)

  await admin.rpc("init_search_credits", { p_user_id: user.id })
  const { data: credit } = await admin.from("search_credits").select("credits_remaining, credits_used_total").eq("user_id", user.id).single()
  const remaining = credit?.credits_remaining ?? 0
  if (remaining < 1) return json({ error: "Crédits épuisés." }, 402)

  const { data: pData } = await admin.from("profiles").select("first_name,last_name,job_title,main_offer,pitch_solution,pitch_proposition,icp_sectors").eq("user_id", user.id).maybeSingle()
  const p = (pData ?? {}) as Record<string, string | string[] | null>

  const profileCtx = [
    line("Name", `${p.first_name ?? ""} ${p.last_name ?? ""}`),
    line("Role", p.job_title as string),
    line("Main offer", p.main_offer as string),
    line("Solution", p.pitch_solution as string),
    line("Value proposition", p.pitch_proposition as string),
    Array.isArray(p.icp_sectors) && p.icp_sectors.length ? `- Sectors: ${p.icp_sectors.join(", ")}` : "",
  ].filter(Boolean).join("\n")

  const system = "You are an elite Upwork proposal writer. You write cover letters that win interviews: specific, concise, client-focused, no fluff, no generic openers like 'I am writing to apply'. Reply with valid JSON only."

  const userPrompt = `Freelancer profile:\n${profileCtx}\n\nUpwork job offer the freelancer wants to apply to:\n"""\n${offer.slice(0, 6000)}\n"""\n\nWrite a winning Upwork cover letter in English. Return a JSON object with EXACTLY these keys:\n- "job_title": the job title inferred from the offer (short string)\n- "proposal": the full cover letter, structured as: (1) a hook that proves you read the offer, (2) demonstrated understanding of their need, (3) what you concretely bring, referencing the freelancer's experience, (4) a relevant proof point or example, (5) a clear call-to-action. 180-280 words, first person, warm but professional, no markdown.`

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
  let obj: { job_title?: string; proposal?: string }
  try { obj = JSON.parse(raw) } catch { return json({ error: "Réponse IA illisible, réessaie." }, 502) }
  if (!obj.proposal) return json({ error: "Aucune candidature générée." }, 502)

  const { data: saved } = await admin.from("upwork_proposals").insert({
    user_id: user.id, job_offer_text: offer, job_title: obj.job_title ?? null, generated_proposal: obj.proposal, language: "en",
  }).select().single()

  await admin.from("search_credits").update({
    credits_remaining: Math.max(0, remaining - 1),
    credits_used_total: (credit?.credits_used_total ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  return json({ proposal: saved, credits_remaining: Math.max(0, remaining - 1) })
})
