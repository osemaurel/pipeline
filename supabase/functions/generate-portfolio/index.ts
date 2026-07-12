import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

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

interface Profile {
  first_name: string
  last_name: string
  job_title: string | null
  company_name: string | null
  business_type: string | null
  business_description: string | null
  main_offer: string | null
  pitch_problem: string | null
  pitch_solution: string | null
  pitch_proposition: string | null
  icp_sectors: string[]
  icp_main_problem: string | null
  icp_decision_maker_role: string | null
  icp_budget_range: string | null
}

// Sections que l'IA peut produire
const VALID_SECTIONS = [
  "headline",
  "bio",
  "services",
  "projects",
  "experiences",
  "testimonials",
] as const
type Section = (typeof VALID_SECTIONS)[number]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

const line = (label: string, value: string | null | undefined) =>
  value && value.trim() ? `- ${label}: ${value.trim()}` : ""

function profileContext(p: Profile): string {
  return [
    line("Nom", `${p.first_name} ${p.last_name}`),
    line("Rôle / métier", p.job_title),
    line("Entreprise / studio", p.company_name),
    line("Type d'activité", p.business_type),
    line("Description de l'activité", p.business_description),
    line("Offre principale", p.main_offer),
    line("Problème résolu (pitch)", p.pitch_problem),
    line("Solution (pitch)", p.pitch_solution),
    line("Proposition de valeur (pitch)", p.pitch_proposition),
    p.icp_sectors?.length
      ? `- Secteurs cibles: ${p.icp_sectors.join(", ")}`
      : "",
    line("Problème principal du client idéal", p.icp_main_problem),
    line("Interlocuteur type", p.icp_decision_maker_role),
    line("Budget type du client", p.icp_budget_range),
  ]
    .filter(Boolean)
    .join("\n")
}

// Décrit à l'IA le schéma exact attendu pour chaque section demandée
function schemaInstructions(sections: Section[]): string {
  const parts: string[] = []
  if (sections.includes("headline")) {
    parts.push(
      `"headline": une accroche percutante d'une seule phrase (max 120 caractères), à la première personne, qui résume la valeur apportée.`,
    )
  }
  if (sections.includes("bio")) {
    parts.push(
      `"bio": une biographie professionnelle de 2 à 4 phrases, à la première personne, chaleureuse et concrète.`,
    )
  }
  if (sections.includes("services")) {
    parts.push(
      `"services": un tableau de 3 objets {"title": string court, "description": 2 phrases orientées bénéfices, "price": un nombre entier en FCFA cohérent avec le budget type (ou null si incertain)}.`,
    )
  }
  if (sections.includes("projects")) {
    parts.push(
      `"projects": un tableau de 3 objets {"title": nom de projet plausible, "description": 2 phrases décrivant le contexte, le rôle et le résultat}. Ce sont des EXEMPLES réalistes à personnaliser.`,
    )
  }
  if (sections.includes("experiences")) {
    parts.push(
      `"experiences": un tableau de 3 objets {"role": intitulé de poste, "company": nom d'entreprise/client plausible, "start_year": "AAAA", "end_year": "AAAA" ou null pour en cours, "description": 2 à 3 réalisations séparées par des retours à la ligne \\n}. Ce sont des EXEMPLES réalistes à personnaliser.`,
    )
  }
  if (sections.includes("testimonials")) {
    parts.push(
      `"testimonials": un tableau de 3 objets {"client_name": "Prénom Nom, Rôle chez Entreprise", "content": témoignage crédible de 1 à 2 phrases, "rating": nombre entre 4 et 5}. Ce sont des EXEMPLES réalistes à personnaliser.`,
    )
  }
  return parts.join("\n")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)

  if (!OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY n'est pas configurée. Ajoute-la dans les Secrets de la fonction sur Supabase.",
      },
      500,
    )
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Non authentifié" }, 401)

  const jwt = authHeader.replace(/^Bearer\s+/i, "")
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(jwt)
  if (userError || !user) return json({ error: "Session invalide" }, 401)

  let body: { sections?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: "JSON invalide" }, 400)
  }

  const requested = Array.isArray(body.sections) ? body.sections : []
  const sections = requested.filter((s): s is Section =>
    (VALID_SECTIONS as readonly string[]).includes(s),
  )
  if (sections.length === 0) {
    return json({ error: "Sélectionne au moins une section à générer." }, 400)
  }

  const { data: profileData, error: profileError } = await admin
    .from("profiles")
    .select(
      "first_name,last_name,job_title,company_name,business_type,business_description,main_offer,pitch_problem,pitch_solution,pitch_proposition,icp_sectors,icp_main_problem,icp_decision_maker_role,icp_budget_range",
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

  const systemPrompt =
    "Tu es un rédacteur expert en personal branding pour freelances francophones d'Afrique de l'Ouest. Tu écris un français naturel, chaleureux et professionnel, orienté bénéfices client, sans jargon SaaS générique ni superlatifs vides. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour."

  const userPrompt = `Voici le profil du freelance :
${profileContext(profile)}

Génère le contenu pour son portfolio public. Retourne un objet JSON contenant EXACTEMENT ces clés (et aucune autre) :
${schemaInstructions(sections)}

Contraintes : français, ton à la première personne, cohérent avec le profil ci-dessus. Les prix en FCFA (XOF). Ne mets aucun commentaire, aucune clé supplémentaire.`

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1600,
      response_format: { type: "json_object" },
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
  const raw: string = completion?.choices?.[0]?.message?.content ?? ""
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    return json({ error: "Réponse IA illisible, réessaie." }, 502)
  }

  // Ne garde que les sections demandées, ignore le reste
  const result: Record<string, unknown> = {}
  for (const s of sections) {
    if (parsed[s] !== undefined) result[s] = parsed[s]
  }

  // Historique (best-effort)
  await admin.from("ai_generations").insert({
    user_id: user.id,
    type: "portfolio",
    input_prompt: `Sections: ${sections.join(", ")}`,
    generated_content: JSON.stringify(result),
  })

  return json({ result })
})
