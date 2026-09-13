import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// Dernière version de GPT (via API Responses, recommandée pour gpt-5.6).
// Repli auto sur gpt-5.5 puis gpt-4o si le modèle n'est pas activé sur le compte.
const COMEUP_MODEL = Deno.env.get("OPENAI_COMEUP_MODEL") ?? Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-5.6"
const FIVERR_MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-5.6"
const TEXT_FALLBACKS = ["gpt-5.5", "gpt-4o"]

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

// ---------------------------------------------------------------------------
// OpenAI Responses API — helper inline avec chaîne de repli
// ---------------------------------------------------------------------------
interface CallOpts {
  model: string
  instructions: string
  input: string
  json?: boolean
  reasoningEffort?: "low" | "medium" | "high"
  maxOutputTokens?: number
}
async function callResponses(o: CallOpts): Promise<
  { ok: true; text: string; modelUsed: string } | { ok: false; status: number; error: string }
> {
  const chain = [o.model, ...TEXT_FALLBACKS.filter((m) => m !== o.model)]
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

const COMEUP_SYSTEM = `Tu es un consultant SEO ComeUp et copywriter senior. Tu as étudié les fiches des TOP-1 de chaque catégorie (SEO, montage vidéo, design, ads, dev). Tu sais EXACTEMENT à quoi ressemble une fiche qui vend, parce que tu en as décortiqué des dizaines.

CE QUE FONT LES TOP-1 DE COMEUP (à imiter, jamais à réinventer)

Titre
Formule : « Je vais » + verbe d'action + livrable + mot-clé principal (dans les 5 premiers mots) + bénéfice/cible optionnel.
Le titre parle du PROBLÈME du client, pas du process du vendeur. Jamais de sur-promesse ("garanti", "en 1h", "à vie").

Structure de description (900-1200 mots)
Les tops N'utilisent PAS de titres numérotés type "1) Accroche 2) Agitation". Ils utilisent des TITRES-EMOJI narratifs, un par grande étape logique de lecture. Exemples réels :
« 🚀 Votre site n'apparaît pas sur Google malgré tous vos efforts ? »
« 🔍 [Le sujet] expliqué simplement »
« ⚠️ Pourquoi certaines [tentatives / campagnes / prestas] n'apportent aucun résultat ? »
« 📦 Les packs disponibles » ou « 🎁 Ce que vous obtenez »
« 💡 Comment choisir le bon pack ? »
« 📋 Ce que vous devrez me fournir »
« ⚙️ Les options pour aller plus loin »
« 🤝 Une question avant de commander ? »
« 🙋 FAQ - Questions fréquentes »

Le corps suit toujours cette LOGIQUE (pas cette liste — la logique) :

a) OUVERTURE : 1 seule question crochet (avec emoji), suivie d'1 phrase qui reformule le contexte du client, puis d'1 phrase de recadrage pédagogique ("dans de nombreux cas, le problème vient de X, pas de Y"). PAS de "yes-set" à 4 questions. PAS de framework PAS martelé.
b) PÉDAGOGIE : une section qui EXPLIQUE le domaine avec métaphore ou analogie concrète ("Imaginez que votre site soit un restaurant…"). Cette pédagogie établit l'expertise du vendeur sans crier "je suis expert".
c) MISE EN GARDE / ERREURS FRÉQUENTES : "Beaucoup de gens font X sans obtenir de résultats parce que…" — liste de 4-5 erreurs, puis "c'est pour éviter ces erreurs que j'ai structuré ce service". Démontre l'expertise, différencie subtilement.
d) OFFRE : présente les packs avec des noms MARKETÉS et pertinents au domaine (jamais "Base/Intermédiaire/Premium"). Exemples de nommages réels : "MINIBOOST / ESSENTIEL / AVANCÉ / PREMIUM / MOON" pour du SEO ; "STARTER / GROWTH / SCALE" pour de l'acquisition ; "SILVER / GOLD / DIAMOND" pour du design ; "BASIC / PRO / SIGNATURE" pour du montage. Prix croissants, avec une offre du milieu clairement la meilleure affaire (effet de leurre).
e) AIDE AU CHOIX : matrice ou tableau qui rassure le client sur le pack à prendre selon son profil / situation ("Si votre DA est entre X et Y, prenez le pack Z").
f) BRIEF ATTENDU : "Ce que vous devrez me fournir" — 3 à 5 éléments courts + un mini-exemple concret de brief.
g) UPSELL DÉTAILLÉ : chaque option payante a son propre sous-titre avec argumentation ("Je vous recommande vivement cette option parce que…"). L'upsell est un CONSEIL, pas une pression.
h) RÉASSURANCE FINALE : rappelle les chiffres de crédibilité en 1 phrase, mentionne disponibilité ("Disponible 7j/7"), invite à envoyer un message avant commande si doute.
i) FAQ RICHE : entre 10 et 20 questions au format "Question : … / Réponse : …". Les tops en ont ~20. Réponses détaillées et pédagogiques (2-4 phrases chacune). Elles COUVRENT toutes les objections + toutes les questions techniques + les petits doutes ("est-ce que je risque une pénalité ?", "les liens seront-ils indexés ?", "puis-je vous proposer plusieurs sites ?"). C'est probablement le bloc le plus long de la fiche.

TON
Pédagogique, calme, expert qui RASSURE. Jamais de ton alarmiste ("attention !!!", "ne perdez plus une seconde"). Jamais de vocabulaire de bonimenteur ("incroyable", "extraordinaire", "révolutionnaire"). Utilise "vous" en direct. Phrases courtes ou moyennes. Emojis en début de titre + parfois en début de phrase-clé (💡 👉 ⚠️ 🚀).

CE QU'IL NE FAUT JAMAIS FAIRE
- Titres numérotés "1) ... 2) ... 3) ..." — INTERDIT. Les tops ne font pas ça.
- Enchaîner 4 questions "Vous… ? Vous… ? Vous… ? Vous… ?" à l'ouverture — INTERDIT.
- Phrase "Si vous avez répondu OUI à l'une de ces questions" — INTERDIT (formule datée).
- Nommer les packs "Base / Intermédiaire / Premium" — INTERDIT. Trouve des noms qui font sens dans le domaine.
- Cri à la peur ("chaque jour sans agir vous coûte…", "vous êtes en train de perdre…") — INTERDIT.
- Blabla type "je suis passionné", "avec amour", "j'ai à cœur de" — INTERDIT.
- Promettre "24h/24" ou "réponse instantanée" — INTERDIT.
- Inventer un chiffre, un nombre de clients, un CA, un résultat client. Si le vendeur ne l'a pas fourni, mets [entre crochets] pour qu'il complète.

SEO INTERNE COMEUP
Le classement dépend du score de vente 6 mois glissants + de la conversion. Titre et description sont les principaux leviers SEO. Trois niveaux de mots-clés :
- primary : la requête transactionnelle générique (dans le titre).
- secondary : technos, synonymes, bénéfices (dans titre + description).
- long_tail : les SYMPTÔMES que tape un non-expert ("mon site est lent", "ma vidéo ne convertit pas"). À disséminer dans la description sans forcer.

FORMAT DE RÉPONSE — JSON UNIQUEMENT

{
  "analysis": {
    "positioning_angle": "angle de positionnement recommandé, 1-2 phrases",
    "top_objections": ["3 objections principales du client"],
    "top_motivations": ["3 motivations d'achat"]
  },
  "keywords": {
    "primary": "le mot-clé principal transactionnel",
    "secondary": ["5 à 8 mots-clés secondaires"],
    "long_tail": ["8 à 10 expressions de longue traîne / symptômes"]
  },
  "titles": {
    "options": ["10 propositions de titres"],
    "recommended": "le titre recommandé, un seul",
    "recommended_rationale": "2 lignes justifiant pourquoi ce titre"
  },
  "pricing": {
    "base_price": nombre_entier,
    "base_currency": "EUR",
    "packs": [
      {"name": "NOM_MARKETÉ_PACK_1", "price": entier, "delivery_days": entier, "features": ["2-4 features courtes"]},
      {"name": "NOM_MARKETÉ_PACK_2", "price": entier, "delivery_days": entier, "features": ["...", "..."]},
      {"name": "NOM_MARKETÉ_PACK_3", "price": entier, "delivery_days": entier, "features": ["...", "..."]}
    ],
    "options": [
      {"name": "nom de l'option", "price_addon": entier, "description": "1 ligne"}
    ],
    "strategy_note": "1 ligne expliquant la logique panier moyen + effet de leurre"
  },
  "brief_expected": ["3 à 5 items courts que le vendeur va demander au client (ex: 'URL du site', 'thématique', 'mots-clés cibles')"],
  "thumbnail_concept": {
    "headline": "3 à 5 mots MAX du bénéfice principal, en MAJUSCULES (ex: 'BOOSTEZ VOTRE SEO', 'SITE WORDPRESS EN 48H')",
    "proof_badge": "chiffre-preuve court optionnel (ex: '+10 000 CLIENTS', 'TOP #1', '5,8K AVIS 5★') ou null si le vendeur n'a pas de preuve chiffrée",
    "domain_symbols": ["2 à 3 éléments symboliques du domaine (ex: 'fusée', 'logo Google stylisé', 'micro de podcast', 'caméra vidéo', 'clavier néon')"],
    "color_palette": "2-3 couleurs saturées adaptées au domaine (ex: 'rouge feu + blanc + jaune', 'or + noir', 'violet néon + noir')"
  }
}

RÈGLES FINALES

- N'invente aucun chiffre, nom de client, résultat. Placeholders [entre crochets] si le vendeur ne les a pas fournis.
- Aucune promesse intenable.
- Réponds UNIQUEMENT avec le JSON, sans texte avant ni après.`

interface Profile {
  first_name: string | null; last_name: string | null; job_title: string | null
  business_type: string | null; business_description: string | null; main_offer: string | null
  pitch_problem: string | null; pitch_solution: string | null; pitch_proposition: string | null
  icp_sectors: string[] | null; icp_main_problem: string | null; icp_decision_maker_role: string | null
  icp_budget_range: string | null
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

  let body: { platform?: string; suggested_service_id?: string; title?: string; custom_instructions?: string }
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }
  const platform = body.platform === "fiverr" ? "fiverr" : "comeup"
  const cost = platform === "comeup" ? 2 : 1

  let baseTitle = body.title ?? ""
  let category: string | null = null
  let suggPriceMin: number | null = null
  if (body.suggested_service_id) {
    const { data: sg } = await admin.from("suggested_services").select("*").eq("id", body.suggested_service_id).eq("user_id", user.id).maybeSingle()
    if (sg) { baseTitle = String(sg.title); category = sg.category ? String(sg.category) : null; suggPriceMin = typeof sg.price_min === "number" ? sg.price_min : null }
  }
  if (!baseTitle.trim()) return json({ error: "Titre du service manquant." }, 400)

  await admin.rpc("init_search_credits", { p_user_id: user.id })
  const { data: credit } = await admin.from("search_credits").select("credits_remaining, credits_used_total").eq("user_id", user.id).single()
  const remaining = credit?.credits_remaining ?? 0
  if (remaining < cost) return json({ error: `Il faut ${cost} crédit${cost > 1 ? "s" : ""} pour rédiger un service.` }, 402)

  const { data: pData } = await admin.from("profiles").select("first_name,last_name,job_title,business_type,business_description,main_offer,pitch_problem,pitch_solution,pitch_proposition,icp_sectors,icp_main_problem,icp_decision_maker_role,icp_budget_range").eq("user_id", user.id).maybeSingle()
  const p = (pData ?? {}) as Profile

  // ==========================================================================
  // FIVERR
  // ==========================================================================
  if (platform === "fiverr") {
    const instructions = "You are an expert Fiverr copywriter and pricing strategist. Write compelling, structured gig content that converts. Reply with valid JSON only."
    const ctx = `Freelance: ${p.first_name ?? ""} ${p.last_name ?? ""} — ${p.job_title ?? ""}. Offre: ${p.main_offer ?? ""}. Valeur: ${p.pitch_proposition ?? ""}.`
    const userPrompt = `${ctx}\nGig to write (title starts with "I will"): "${baseTitle}"${category ? ` (category: ${category})` : ""}.\n\nReturn a JSON object with EXACTLY these keys:\n- "title": final gig title, MUST start with "I will", polished\n- "description": full English gig description, structured (hook -> what you get -> process -> why me), 150-300 words, no markdown headers\n- "tags": array of 5-8 relevant search tags (lowercase strings)\n- "faq": array of 3-5 objects {"question","answer"}\n- "pricing_tiers": array of exactly 3 objects {"tier":"basic"|"standard"|"premium","price": integer USD,"delivery_days": integer,"features": array of 2-4 short strings}`

    const r = await callResponses({ model: FIVERR_MODEL, instructions, input: userPrompt, json: true, reasoningEffort: "low", maxOutputTokens: 2500 })
    if (!r.ok) return json({ error: `Erreur OpenAI (${r.status}): ${r.error.slice(0, 300)}` }, 502)
    let obj: Record<string, unknown>
    try { obj = JSON.parse(r.text) } catch { return json({ error: "Réponse IA illisible, réessaie." }, 502) }

    const { data: saved } = await admin.from("generated_services").insert({
      user_id: user.id, suggested_service_id: body.suggested_service_id ?? null, platform: "fiverr",
      title: String(obj.title ?? baseTitle).slice(0, 300),
      description: String(obj.description ?? ""),
      price: null, currency: "USD",
      tags: Array.isArray(obj.tags) ? (obj.tags as unknown[]).map(String).slice(0, 10) : [],
      faq: Array.isArray(obj.faq) ? obj.faq : [],
      pricing_tiers: Array.isArray(obj.pricing_tiers) ? obj.pricing_tiers : [],
      language: "en",
    }).select().single()
    if (body.suggested_service_id) await admin.from("suggested_services").update({ is_selected: true }).eq("id", body.suggested_service_id)
    await admin.from("search_credits").update({ credits_remaining: Math.max(0, remaining - cost), credits_used_total: (credit?.credits_used_total ?? 0) + cost, updated_at: new Date().toISOString() }).eq("user_id", user.id)
    return json({ service: saved, credits_remaining: Math.max(0, remaining - cost), model_used: r.modelUsed })
  }

  // ==========================================================================
  // COMEUP — 2 appels : struct JSON + description longue markdown
  // ==========================================================================
  const experience = [p.job_title, p.business_type, p.business_description].filter(Boolean).join(" — ")
  const cible = [p.icp_decision_maker_role, Array.isArray(p.icp_sectors) ? p.icp_sectors.join(", ") : "", p.icp_main_problem].filter(Boolean).join(" | ")

  const userMessage = {
    service_sujet: baseTitle,
    categorie_comeup: category ?? "",
    description_prestation: [p.main_offer, p.pitch_solution].filter(Boolean).join(". "),
    experience_vendeur: experience,
    cible,
    prix_depart: suggPriceMin ?? "",
    atouts: p.pitch_proposition ?? "",
    preuves: "",
  }

  // Consignes personnalisées du vendeur, si présentes — elles ont priorité sur
  // les défauts du prompt (packs, angle, ton, tarifs demandés spécifiquement).
  const rawCustom = String(body.custom_instructions ?? "").trim().slice(0, 1500)
  const customCtx = rawCustom
    ? `\n\nCONSIGNES PERSONNALISÉES DU VENDEUR (à respecter en priorité, elles remplacent les défauts en cas de conflit) :\n"""\n${rawCustom}\n"""`
    : ""

  // -- Appel 1 : struct JSON (SANS la description longue) --------------------
  const structPrompt = `${JSON.stringify(userMessage)}${customCtx}\n\nGénère TOUT SAUF la description longue. Renvoie un JSON avec ces clés uniquement : analysis, keywords, titles (10 options + recommended + recommended_rationale), pricing (base_price, base_currency:"EUR", packs[], options[], strategy_note), brief_expected, thumbnail_concept. NE mets PAS de clé description_markdown ici. NE mets PAS de clé faq ici (la FAQ sera dans la description).`
  const r1 = await callResponses({ model: COMEUP_MODEL, instructions: COMEUP_SYSTEM, input: structPrompt, json: true, reasoningEffort: "low", maxOutputTokens: 4000 })
  if (!r1.ok) return json({ error: `Erreur OpenAI (${r1.status}): ${r1.error.slice(0, 300)}` }, 502)
  let g: Record<string, any>
  try { g = JSON.parse(r1.text) } catch { return json({ error: "Réponse IA illisible, réessaie." }, 502) }
  const titleRec = String(g?.titles?.recommended ?? baseTitle).slice(0, 300)

  // -- Appel 2 : description longue markdown --------------------------------
  const packsCtx = Array.isArray(g?.pricing?.packs) && g.pricing.packs.length
    ? `Packs à présenter dans un tableau markdown (utiliser EXACTEMENT ces noms/prix/features) : ${JSON.stringify(g.pricing.packs)}.`
    : ""
  const optionsCtx = Array.isArray(g?.pricing?.options) && g.pricing.options.length
    ? `Options payantes à détailler chacune dans un sous-titre argumenté (upsell-conseil) : ${JSON.stringify(g.pricing.options)}.`
    : ""
  const briefCtx = Array.isArray(g?.brief_expected) && g.brief_expected.length
    ? `Éléments que le vendeur va demander au client (à intégrer dans le bloc "Ce que vous devrez me fournir" + un mini-exemple concret) : ${JSON.stringify(g.brief_expected)}.`
    : ""
  const descInstr = `Tu écris une fiche ComeUp longue, dans le style exact des top-1 de la plateforme (GuillaumeTBC en SEO, POV en UGC, CharlesEdward en montage). Ton pédagogique et rassurant, PAS de ton alarmiste ni de vocabulaire de bonimenteur. Réponds UNIQUEMENT avec le markdown de la description, sans préambule, sans JSON, sans balise de code.`
  const descInput = `Rédige la DESCRIPTION MARKDOWN COMPLÈTE pour ce service ComeUp intitulé « ${titleRec} ».\n\nContexte vendeur : ${JSON.stringify(userMessage)}\n${packsCtx}\n${optionsCtx}\n${briefCtx}${customCtx}\n\nRÈGLES DE FORMAT :\n- LONGUEUR : entre 1100 et 1500 mots. La fiche doit être RICHE, avec une FAQ longue.\n- Chaque grande étape a un TITRE avec un EMOJI en tête (##). Exemples de titres à utiliser TELS QUELS ou à adapter : « 🚀 [question crochet] », « 🔍 [Sujet] expliqué simplement », « ⚠️ Pourquoi certaines [tentatives] n'apportent aucun résultat ? », « 📦 Les packs disponibles », « 💡 Comment choisir le bon pack ? », « 📋 Ce que vous devrez me fournir », « ⚙️ Les options pour aller plus loin », « 🤝 Une question avant de commander ? », « 🙋 FAQ - Questions fréquentes ».\n- INTERDICTIONS ABSOLUES : jamais de titre "1) Accroche", "Bloc 1", "Étape 1"... — utilise UNIQUEMENT des titres emoji narratifs. Jamais de "Vous ? Vous ? Vous ? Vous ?" à l'ouverture. Jamais de "Si vous avez répondu OUI à l'une de ces questions". Jamais de "Base / Intermédiaire / Premium" comme nom de pack (utilise les noms fournis dans les packs ci-dessus, ou invente des noms marketés pertinents au domaine).\n\nSTRUCTURE OBLIGATOIRE (dans cet ordre) :\n1. Ouverture : 1 titre-question avec 🚀, puis 1 phrase de reformulation empathique du contexte client, puis 1 phrase de recadrage pédagogique ("dans de nombreux cas, le problème vient de X, pas de Y"). Termine par la présentation du vendeur en 1 phrase avec 1-2 chiffres précis (utilise [placeholder] si le vendeur ne les a pas donnés) puis "Le rôle de ce service est simple : ...".\n2. Section pédagogique : "🔍 [Sujet] expliqué simplement" avec une métaphore concrète ("Imaginez que...") + liste à puces de 3 bénéfices concrets.\n3. Section "⚠️ Pourquoi certaines [tentatives] n'apportent aucun résultat ?" avec 4-5 erreurs fréquentes en liste, puis "C'est pour éviter ces erreurs que j'ai structuré ce service...".\n4. Section "📦 Les packs disponibles" avec un tableau markdown des packs (utilise EXACTEMENT les données packs fournies ci-dessus si présentes).\n5. Section "💡 Comment choisir le bon pack ?" avec un tableau ou une matrice de correspondance (profil client → pack conseillé).\n6. Section "📋 Ce que vous devrez me fournir" : liste des éléments demandés + un mini-bloc "Exemple de brief" concret.\n7. Section "⚙️ Les options pour aller plus loin" avec un sous-titre ### par option et 2-3 phrases d'argumentation "conseil".\n8. Section "🤝 Une question avant de commander ?" avec un rappel de crédibilité (1-2 chiffres, [placeholder] si non fourni) + mention "Disponible 7j/7" + invitation à envoyer un message.\n9. Section "🙋 FAQ - Questions fréquentes" : ENTRE 10 ET 15 questions au format "**Question : ...** / Réponse : ...". Réponses de 2-4 phrases, pédagogiques, couvrant délais, garanties, technique, risques, révisions, formats, cas particuliers. C'est le bloc le plus long.\n\nRÈGLES DE FOND :\n- N'invente aucun chiffre, nom de client, résultat. [Placeholders entre crochets] si le vendeur ne les a pas fournis.\n- Aucune promesse intenable ("garanti", "24h/24").\n- Vouvoiement systématique. Phrases courtes/moyennes.\n- Emojis en début de titre et parfois en début de phrase-clé (💡 👉 ⚠️ 🚀).\n- Réponds UNIQUEMENT le markdown.`
  const r2 = await callResponses({ model: COMEUP_MODEL, instructions: descInstr, input: descInput, reasoningEffort: "low", maxOutputTokens: 8000 })
  if (!r2.ok) return json({ error: `Erreur OpenAI (${r2.status}): ${r2.error.slice(0, 300)}` }, 502)
  let descMd = r2.text.trim().replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "").trim()
  g.description_markdown = descMd
  if (descMd.length < 200) return json({ error: "Génération trop courte, réessaie." }, 502)

  const basePrice = typeof g?.pricing?.base_price === "number" ? g.pricing.base_price : (suggPriceMin ?? null)
  const secondary: string[] = Array.isArray(g?.keywords?.secondary) ? g.keywords.secondary.map(String).slice(0, 10) : []
  const packs = Array.isArray(g?.pricing?.packs) ? g.pricing.packs : []

  const { data: saved } = await admin.from("generated_services").insert({
    user_id: user.id,
    suggested_service_id: body.suggested_service_id ?? null,
    platform: "comeup",
    title: titleRec,
    description: descMd,
    price: basePrice,
    currency: "EUR",
    tags: secondary,
    faq: [],
    pricing_tiers: packs,
    language: "fr",
    raw_generation_json: g,
  }).select().single()

  if (body.suggested_service_id) await admin.from("suggested_services").update({ is_selected: true }).eq("id", body.suggested_service_id)

  await admin.from("search_credits").update({
    credits_remaining: Math.max(0, remaining - cost),
    credits_used_total: (credit?.credits_used_total ?? 0) + cost,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  return json({ service: saved, credits_remaining: Math.max(0, remaining - cost), model_used: r1.modelUsed })
})
