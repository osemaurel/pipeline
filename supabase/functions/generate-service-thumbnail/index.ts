import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

const STYLE_PROMPTS: Record<string, string> = {
  modern_clean: "modern, clean, minimalist marketplace thumbnail, lots of whitespace, crisp sans-serif typography, subtle soft shadows, professional and trustworthy",
  bold_typo: "bold typographic poster style, oversized punchy headline text, high contrast, energetic, eye-catching marketplace thumbnail",
  photo_pro: "professional photographic style, realistic studio lighting, premium product-shot feel, shallow depth of field",
  minimal_pastel: "minimal soft pastel palette, gentle gradients, airy and elegant, rounded shapes, calm premium aesthetic",
  tech_dark: "sleek dark tech aesthetic, neon accents, futuristic, glassmorphism, gradient glow, developer / SaaS vibe",
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

  let body: {
    service_id?: string
    style_preset?: string
    custom_style_prompt?: string
    primary_color?: string
    save_as_default?: boolean
  }
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }
  if (!body.service_id) return json({ error: "service_id requis." }, 400)

  const { data: svc } = await admin.from("generated_services").select("*").eq("id", body.service_id).eq("user_id", user.id).maybeSingle()
  if (!svc) return json({ error: "Service introuvable." }, 404)

  // Crédits : miniature = 3, vérif AVANT
  await admin.rpc("init_search_credits", { p_user_id: user.id })
  const { data: credit } = await admin.from("search_credits").select("credits_remaining, credits_used_total").eq("user_id", user.id).single()
  const remaining = credit?.credits_remaining ?? 0
  if (remaining < 3) return json({ error: "Il faut 3 crédits pour générer une miniature." }, 402)

  const preset = body.style_preset ?? "modern_clean"
  const styleText = preset === "custom"
    ? (body.custom_style_prompt || "clean professional marketplace thumbnail")
    : (STYLE_PROMPTS[preset] ?? STYLE_PROMPTS.modern_clean)
  const colorText = body.primary_color ? ` Dominant brand color: ${body.primary_color}.` : ""

  const platform = svc.platform === "fiverr" ? "Fiverr" : "ComeUp"
  const prompt = `A high-converting ${platform} gig thumbnail for the service: "${svc.title}". ${String(svc.description ?? "").slice(0, 300)}. Visual style: ${styleText}.${colorText} Composition: bold, legible focal point, marketplace-ready, no watermark, no lorem ipsus, minimal real readable text only if essential. Landscape banner format.`

  const oaiRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1536x1024" }),
  })
  if (!oaiRes.ok) {
    const d = await oaiRes.text().catch(() => "")
    return json({ error: `Erreur OpenAI (${oaiRes.status}): ${d.slice(0, 250)}` }, 502)
  }
  const out = await oaiRes.json()
  const b64: string | undefined = out?.data?.[0]?.b64_json
  if (!b64) return json({ error: "Aucune image générée." }, 502)

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const path = `${user.id}/${svc.id}-${Date.now()}.png`
  const up = await admin.storage.from("service-thumbnails").upload(path, bytes, { contentType: "image/png", upsert: true })
  if (up.error) return json({ error: `Stockage: ${up.error.message}` }, 500)
  const { data: pub } = admin.storage.from("service-thumbnails").getPublicUrl(path)
  const thumbnailUrl = pub.publicUrl

  await admin.from("generated_services").update({
    thumbnail_url: thumbnailUrl,
    thumbnail_style_used: preset,
  }).eq("id", svc.id)

  // Sauvegarde du style par défaut si demandé
  if (body.save_as_default) {
    await admin.from("user_visual_style").upsert({
      user_id: user.id,
      style_preset: preset,
      custom_style_prompt: body.custom_style_prompt ?? null,
      primary_color: body.primary_color ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
  }

  await admin.from("search_credits").update({
    credits_remaining: Math.max(0, remaining - 3),
    credits_used_total: (credit?.credits_used_total ?? 0) + 3,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  return json({ thumbnail_url: thumbnailUrl, credits_remaining: Math.max(0, remaining - 3) })
})
