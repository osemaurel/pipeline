import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// Dernier modèle image OpenAI (gpt-image-1). Surchargeable via secret.
const IMAGE_MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") ?? "gpt-image-2"
const IMAGE_FALLBACK = "gpt-image-1"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

// Presets calibrés sur ce que font vraiment les top-1 de ComeUp/Fiverr :
// gig covers avec HEADLINE ÉNORME, portrait détouré du vendeur à droite,
// badge preuve, éléments symboliques du domaine, palette saturée haut contraste.
const STYLE_PROMPTS: Record<string, string> = {
  modern_clean: "premium marketplace gig cover, split layout with a big bold sans-serif headline occupying 60% of the left side and a photo-realistic seller portrait cut-out on the right, subtle geometric shapes in background, glossy modern professional look, sharp shadows, high production value",
  bold_typo: "top-tier marketplace gig cover in the style of high-converting ComeUp and Fiverr top-1 sellers: massive 3D lettering for the headline dominating the composition, glossy chrome-like text with strong depth, energetic diagonal composition, bold contrasts, poster feel",
  photo_pro: "premium editorial gig cover with a photo-realistic detailed portrait of the seller as the hero visual (right side), clean bold headline text (left side), studio-lit background with soft gradient, luxury magazine-cover vibe",
  minimal_pastel: "elegant premium gig cover with a large refined serif or grotesque headline (left), soft pastel gradient background, minimal geometric shapes, calm and airy composition, subtle domain icons floating, upscale boutique feel",
  tech_dark: "high-end tech gig cover, dark background with neon gradient glow, oversized futuristic sans-serif headline with light-glow effect (left/center), holographic domain symbols, SaaS/dev product-launch banner feel, sharp cinematic lighting",
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
    inspiration_image_base64?: string
    inspiration_image_mime?: string
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

  // Extraction du thumbnail_concept structuré (headline, proof_badge, symbols, palette)
  // généré par la fonction de description, avec repli sur le titre du service.
  const rawConcept = (svc.raw_generation_json && typeof svc.raw_generation_json === "object")
    ? (svc.raw_generation_json as Record<string, unknown>).thumbnail_concept
    : null
  const concept = (rawConcept && typeof rawConcept === "object" ? rawConcept : {}) as Record<string, unknown>
  const shortTitle = String(svc.title ?? "").replace(/^Je vais\s+/i, "").replace(/^I will\s+/i, "").slice(0, 60)
  const headline = String(concept.headline ?? shortTitle).toUpperCase().slice(0, 60)
  const proofBadge = concept.proof_badge && typeof concept.proof_badge === "string" ? String(concept.proof_badge).slice(0, 40) : ""
  const symbols = Array.isArray(concept.domain_symbols) ? (concept.domain_symbols as unknown[]).map(String).slice(0, 3).join(", ") : ""
  const conceptPalette = typeof concept.color_palette === "string" ? String(concept.color_palette) : ""

  const proofText = proofBadge ? ` A small proof badge at the bottom or corner reads exactly: "${proofBadge}".` : ""
  const symbolsText = symbols ? ` Include these domain elements subtly in the background: ${symbols}.` : ""
  const paletteText = body.primary_color
    ? ` Color palette: dominated by ${body.primary_color}, with 1-2 high-contrast complementary saturated colors.`
    : conceptPalette ? ` Color palette: ${conceptPalette}, saturated and high-contrast.` : ""

  // Si l'utilisateur a fourni une image d'inspiration, on la fait analyser par
  // gpt-4o (vision) pour en extraire composition, palette, style typo, ambiance.
  // La description est ensuite injectée dans le prompt de génération d'image.
  let inspirationText = ""
  if (body.inspiration_image_base64 && body.inspiration_image_mime) {
    const dataUrl = `data:${body.inspiration_image_mime};base64,${body.inspiration_image_base64}`
    try {
      const visionRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          instructions: "You analyze marketplace gig cover images. Return a compact English description that another AI can use to reproduce the same VISUAL STYLE (never copy exact text or brand). Focus on: overall composition and layout, dominant color palette (name specific colors), typography style (weight, effect, size relative to canvas), background treatment, decorative elements, lighting, mood. 4-6 short sentences maximum. Do NOT describe or transcribe any text visible in the image.",
          input: [{
            role: "user",
            content: [
              { type: "input_text", text: "Describe this gig cover's visual style so I can reproduce the same aesthetic for a different service." },
              { type: "input_image", image_url: dataUrl, detail: "low" },
            ],
          }],
          max_output_tokens: 400,
        }),
      })
      if (visionRes.ok) {
        const vd = await visionRes.json()
        const t = typeof vd?.output_text === "string" ? vd.output_text : ""
        if (t.trim()) inspirationText = ` STYLE REFERENCE (inspired by an image provided by the user, DO NOT copy its text/brand): ${t.trim().slice(0, 800)}`
      }
    } catch { /* silencieux : on continue sans l'inspiration */ }
  }

  // Prompt calibré sur les gig covers top-1 réels : GROS HEADLINE, portrait
  // vendeur détouré à droite, badge preuve, symboles domaine, palette saturée.
  const prompt = `A high-converting ${platform} marketplace gig cover thumbnail, landscape 16:9 banner. Style: ${styleText}.
Composition: massive bold display headline reading exactly "${headline}" occupying the left/center of the frame (all-caps, punchy typography, drop shadow or 3D depth). A photo-realistic detailed portrait of a confident freelancer on the right side, cleanly cut out, warm smile, business-casual outfit, looking at the camera or pointing at the headline.${proofText}${symbolsText}${paletteText}${inspirationText}
Rendering rules: sharp, crisp, professional, high production value. The headline text MUST be spelled EXACTLY "${headline}" — legible, no distortion, no misspellings, no gibberish letters, no random duplicated words. Do not invent brand logos or platform logos. No watermark. No stock-photo look — this should feel like a top-selling ComeUp gig cover from a professional freelancer.`

  const genImage = (model: string) =>
    fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, n: 1, size: "1536x1024", quality: "high" }),
    })

  let oaiRes = await genImage(IMAGE_MODEL)
  // Repli sur gpt-image-1 si le modèle configuré n'est pas reconnu par l'API
  if (!oaiRes.ok && IMAGE_MODEL !== IMAGE_FALLBACK) {
    const errText = await oaiRes.text().catch(() => "")
    if (/model|not found|does not exist|invalid|unsupported/i.test(errText)) {
      oaiRes = await genImage(IMAGE_FALLBACK)
    } else {
      return json({ error: `Erreur OpenAI (${oaiRes.status}): ${errText.slice(0, 250)}` }, 502)
    }
  }
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
