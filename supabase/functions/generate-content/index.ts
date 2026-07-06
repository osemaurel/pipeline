import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  first_name: string
  last_name: string
  job_title: string | null
  business_type: string | null
  main_offer: string | null
  pitch_problem: string | null
  pitch_solution: string | null
  pitch_proposition: string | null
  icp_sectors: string[]
  icp_main_problem: string | null
  icp_decision_maker_role: string | null
}

interface GenerateRequest {
  type: string
  input: string
}

// ---------------------------------------------------------------------------
// Presets — chaque type a un prompt système et un builder de prompt utilisateur
// ---------------------------------------------------------------------------

interface Preset {
  system: string
  build: (input: string, p: Profile) => string
}

const line = (label: string, value: string | null | undefined) =>
  value && value.trim() ? `- ${label}: ${value.trim()}` : ""

const buildProfileContext = (p: Profile) =>
  [
    line("Nom du freelance", `${p.first_name} ${p.last_name}`),
    line("Rôle", p.job_title),
    line("Type d'activité", p.business_type),
    line("Offre principale", p.main_offer),
    line("Problème client", p.pitch_problem),
    line("Solution", p.pitch_solution),
    line("Proposition de valeur", p.pitch_proposition),
    p.icp_sectors.length
      ? `- Secteurs cibles: ${p.icp_sectors.join(", ")}`
      : "",
    line("Problème principal du client idéal", p.icp_main_problem),
    line("Interlocuteur type", p.icp_decision_maker_role),
  ]
    .filter(Boolean)
    .join("\n")

const PRESETS: Record<string, Preset> = {
  service_description: {
    system:
      "Tu es un copywriter senior spécialisé pour freelances francophones en Afrique de l'Ouest. Tu écris des descriptions de services concrètes, orientées bénéfices, sans jargon SaaS générique. Ton chaleureux et pro.",
    build: (input, p) => `Contexte du freelance:
${buildProfileContext(p)}

Service à décrire: ${input}

Écris une description de service de 4 à 6 phrases, en texte fluide (pas de bullet points), structurée ainsi:
1) Ce que le service est concrètement
2) Pour qui il est fait
3) Le bénéfice mesurable ou le résultat attendu
4) Une invitation douce à échanger

Langue: français. Pas d'emoji. Pas d'exclamations excessives.`,
  },

  linkedin_post: {
    system:
      "Tu es un copywriter LinkedIn pour freelances francophones. Style personnel, direct, avec des retours à la ligne fréquents pour la lisibilité mobile. Pas de hashtags à la fin.",
    build: (input, p) => `Contexte du freelance:
${buildProfileContext(p)}

Thème du post: ${input}

Écris un post LinkedIn:
- Une accroche forte en 1re ligne (une pensée provocante, un chiffre, une histoire)
- 4 à 6 paragraphes très courts (1 à 3 lignes chacun)
- Une question ou une invitation douce en fin (jamais "n'hésitez pas à commenter")
- Aucun hashtag
- Langue: français. Ton chaleureux, pas commercial.`,
  },

  follow_up_email: {
    system:
      "Tu écris des emails de relance courts et efficaces. Jamais culpabilisants. Toujours orientés valeur ajoutée pour le destinataire.",
    build: (input, p) => `Émetteur: ${p.first_name} ${p.last_name}${p.job_title ? `, ${p.job_title}` : ""}
Offre: ${p.main_offer ?? "—"}

Contexte de la relance: ${input}

Rédige un email de relance en français:
- Objet court et curieux (≤ 6 mots)
- 100 à 150 mots
- Rappel bref du contexte
- Une nouvelle raison de rouvrir la discussion (insight, ressource, question)
- Un CTA clair et unique (proposer un créneau, poser une question précise)
- Signature: prénom uniquement

Retourne au format:
Objet: <objet>

<corps>`,
  },

  pitch_elevator: {
    system:
      "Tu formules des pitchs elevator courts, clairs et mémorables. Une idée par phrase. Concret plutôt qu'abstrait.",
    build: (input, p) => `Pitch existant du freelance:
- Problème: ${p.pitch_problem ?? "—"}
- Solution: ${p.pitch_solution ?? "—"}
- Proposition de valeur: ${p.pitch_proposition ?? "—"}

Ajustement / contexte demandé: ${input}

Reformule en un pitch elevator de 30 secondes en français:
- 3 phrases maximum, en un seul paragraphe
- Structure implicite: pour qui / quel problème / quel résultat
- Concret (chiffres, images, exemples). Pas de superlatifs vides.`,
  },

  whatsapp_prospection: {
    system:
      "Tu écris des messages WhatsApp de premier contact: courts, humains, jamais commerciaux. Comme quelqu'un qui écrit à un futur collègue, pas à un lead.",
    build: (input, p) => `Émetteur: ${p.first_name}${p.job_title ? `, ${p.job_title}` : ""}
Offre: ${p.main_offer ?? "—"}
Cible: ${p.icp_decision_maker_role ?? "décideur"} dans ${p.icp_sectors[0] ?? "un secteur B2B"}

Accroche / contexte: ${input}

Écris un message WhatsApp de premier contact en français:
- 3 à 4 courts paragraphes séparés par des sauts de ligne (WhatsApp ne supporte pas le markdown)
- Se présenter en une phrase (nom + ce qu'on fait)
- Faire un lien personnel avec le destinataire (référence, contexte)
- Une seule question ouverte à la fin
- Ton amical, direct, pas de vouvoiement lourd. Pas d'emoji obligatoire, un seul max si vraiment utile.`,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ error: "Méthode non supportée" }, 405)
  }

  if (!OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY n'est pas configurée. Ajoute-la dans les Secrets de la fonction sur Supabase.",
      },
      500,
    )
  }

  // -- Auth ------------------------------------------------------------------
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Non authentifié" }, 401)

  const jwt = authHeader.replace(/^Bearer\s+/i, "")
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(jwt)
  if (userError || !user) return json({ error: "Session invalide" }, 401)

  // -- Body ------------------------------------------------------------------
  let body: GenerateRequest
  try {
    body = await req.json()
  } catch {
    return json({ error: "JSON invalide" }, 400)
  }
  const { type, input } = body ?? {}
  if (!type || typeof type !== "string") {
    return json({ error: "Champ 'type' requis" }, 400)
  }
  if (!input || typeof input !== "string" || !input.trim()) {
    return json({ error: "Champ 'input' requis" }, 400)
  }

  const preset = PRESETS[type]
  if (!preset) {
    return json({ error: `Type inconnu: ${type}` }, 400)
  }

  // -- Profile ---------------------------------------------------------------
  const { data: profileData, error: profileError } = await admin
    .from("profiles")
    .select(
      "first_name,last_name,job_title,business_type,main_offer,pitch_problem,pitch_solution,pitch_proposition,icp_sectors,icp_main_problem,icp_decision_maker_role",
    )
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError || !profileData) {
    return json(
      { error: "Profil introuvable — complète d'abord ton onboarding." },
      404,
    )
  }

  const profile = profileData as Profile

  // -- OpenAI ----------------------------------------------------------------
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: preset.system },
        { role: "user", content: preset.build(input.trim(), profile) },
      ],
      temperature: 0.75,
      max_tokens: 900,
    }),
  })

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => "")
    return json(
      { error: `Erreur OpenAI (${openaiRes.status}): ${detail.slice(0, 300)}` },
      502,
    )
  }

  const completion = await openaiRes.json()
  const content: string =
    completion?.choices?.[0]?.message?.content?.trim() ?? ""
  if (!content) {
    return json({ error: "Aucun contenu généré" }, 502)
  }

  // -- Save ------------------------------------------------------------------
  const { data: saved } = await admin
    .from("ai_generations")
    .insert({
      user_id: user.id,
      type,
      input_prompt: input.trim(),
      generated_content: content,
    })
    .select()
    .single()

  return json({
    content,
    generation: saved,
  })
})
