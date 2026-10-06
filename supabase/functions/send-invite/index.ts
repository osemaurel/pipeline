import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM_EMAIL = Deno.env.get("INVITE_FROM_EMAIL") ?? "hello@topcloz.com"
const FROM_NAME = Deno.env.get("INVITE_FROM_NAME") ?? "TopCloz"
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://topcloz.com"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

interface InviteBody {
  email?: string
  first_name?: string
  credits_granted?: number
  notes?: string
  resend?: boolean
}

// Génère un mot de passe temporaire lisible (sans caractères ambigus 0/O/1/l/I)
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  let out = ""
  for (const b of bytes) out += chars[b % chars.length]
  // Format en 3 blocs lisibles : "AbCdEf-GhJkMn-pQ23"
  return `${out.slice(0, 6)}-${out.slice(6, 12)}-${out.slice(12, 14)}23`
}

function buildEmailHtml(opts: {
  firstName: string | null
  loginUrl: string
  email: string
  tempPassword: string
  credits: number
}): string {
  const greeting = opts.firstName ? `Salut ${opts.firstName},` : "Bonjour,"
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenue sur TopCloz</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #ececec;">
              <div style="font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">TopCloz</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;line-height:1.3;color:#1a1a1a;">
                Ton accès à TopCloz est prêt 🎉
              </h1>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#333;">${greeting}</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#333;">
                Tu fais partie des premiers freelances à qui je donne accès à <strong>TopCloz</strong>, la plateforme qui regroupe en un seul endroit :
              </p>
              <ul style="margin:0 0 22px 0;padding:0 0 0 18px;font-size:15px;line-height:1.8;color:#333;">
                <li>Un <strong>portfolio public</strong> partageable en un lien</li>
                <li>Un <strong>CRM</strong> pour suivre tes prospects</li>
                <li>Un <strong>générateur IA</strong> pour tes services ComeUp / Fiverr / Upwork</li>
                <li>Une <strong>recherche de prospects</strong> ciblée par ville + secteur</li>
              </ul>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#333;">
                J'ai pré-chargé ton compte avec <strong style="color:#E87A34;">${opts.credits} crédits</strong> pour que tu puisses tester les générations IA et la recherche de prospects sans attendre.
              </p>

              <!-- Identifiants -->
              <div style="margin:20px 0;padding:18px 20px;background:#fafafa;border:1px solid #ececec;border-radius:10px;">
                <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#1a1a1a;letter-spacing:0.3px;text-transform:uppercase;">Tes identifiants</p>
                <p style="margin:0 0 8px 0;font-size:14px;color:#333;">
                  <span style="color:#888;display:inline-block;width:90px;">Email :</span>
                  <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#1a1a1a;">${opts.email}</strong>
                </p>
                <p style="margin:0;font-size:14px;color:#333;">
                  <span style="color:#888;display:inline-block;width:90px;">Mot de passe :</span>
                  <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#E87A34;letter-spacing:0.5px;">${opts.tempPassword}</strong>
                </p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 12px 0;">
                <tr>
                  <td style="border-radius:8px;background:#E87A34;">
                    <a href="${opts.loginUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Me connecter à TopCloz →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#666;">
                Dès ta première connexion, on te demandera de choisir ton propre mot de passe.
              </p>

              <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#444;">
                Dis-moi ce que tu en penses, j'écoute tous les retours.
              </p>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#444;">— Maurel</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #ececec;font-size:12px;color:#999;line-height:1.5;">
              TopCloz — plateforme pour freelances d'Afrique de l'Ouest.<br>
              Tu reçois cet email parce que tu as été invité en tant qu'early user.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY n'est pas configurée." }, 500)

  const auth = req.headers.get("Authorization")
  if (!auth) return json({ error: "Non authentifié" }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: authErr } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""))
  if (authErr || !user) return json({ error: "Session invalide" }, 401)

  // Vérifie que l'appelant est admin (via la fonction is_admin SECURITY DEFINER)
  const { data: isAdminRes } = await admin.rpc("is_admin")
  if (isAdminRes !== true) {
    const { data: adminRow } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle()
    if (!adminRow) return json({ error: "Accès réservé aux administrateurs." }, 403)
  }

  let body: InviteBody
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }

  const email = String(body.email ?? "").trim().toLowerCase()
  const firstName = body.first_name ? String(body.first_name).trim() : null
  const credits = Math.max(1, Math.min(500, Number(body.credits_granted ?? 20)))
  const notes = body.notes ? String(body.notes).trim() : null
  const isResend = body.resend === true

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Email invalide." }, 400)
  }

  // 1. Upsert dans admin_invites
  let invite: Record<string, unknown> & { id: string; user_id: string | null; sent_at: string | null; last_resent_at: string | null; first_name: string | null; notes: string | null }
  {
    const { data: existing } = await admin
      .from("admin_invites")
      .select("*")
      .eq("email", email)
      .maybeSingle()

    if (existing) {
      if (existing.status === "accepted" && !isResend) {
        return json({ error: "Cet email a déjà accepté l'invitation." }, 400)
      }
      const { data, error } = await admin
        .from("admin_invites")
        .update({
          first_name: firstName ?? existing.first_name,
          credits_granted: credits,
          notes: notes ?? existing.notes,
          last_resent_at: isResend ? new Date().toISOString() : existing.last_resent_at,
        })
        .eq("id", existing.id)
        .select()
        .single()
      if (error || !data) return json({ error: `DB update: ${error?.message}` }, 500)
      invite = data as never
    } else {
      const { data, error } = await admin
        .from("admin_invites")
        .insert({
          email, first_name: firstName, credits_granted: credits, notes,
          created_by: user.id, status: "pending",
        })
        .select()
        .single()
      if (error || !data) return json({ error: `DB insert: ${error?.message}` }, 500)
      invite = data as never
    }
  }

  // 2. Crée OU récupère l'user Auth, puis (re)pose un mot de passe temporaire.
  // Changement d'approche : plus de magic link à usage unique (expire à 1h,
  // consommé par les prefetch Gmail → beaucoup d'échecs). On envoie un mot
  // de passe temporaire que l'invité devra changer à sa 1re connexion.
  const tempPassword = generateTempPassword()
  let userId: string | null = invite.user_id ?? null

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: tempPassword,
      user_metadata: {
        needs_password_setup: true,
        ...(firstName ? { first_name: firstName } : {}),
      },
    })
    if (createErr) {
      const { data: all } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const found = all.users.find((u) => u.email?.toLowerCase() === email)
      if (!found) return json({ error: `Auth: ${createErr.message}` }, 500)
      userId = found.id
    } else {
      userId = created.user?.id ?? null
    }
  }

  // Pour un renvoi (ou si le user existait déjà), on repose le mot de passe
  // temporaire pour qu'il corresponde à celui qu'on va envoyer dans l'email.
  if (userId) {
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      user_metadata: {
        needs_password_setup: true,
        ...(firstName ? { first_name: firstName } : {}),
      },
    })
    if (updErr) return json({ error: `Auth update: ${updErr.message}` }, 500)
  }

  // 3. Envoi via Resend (mot de passe temporaire + lien vers /login)
  const loginUrl = `${SITE_URL}/login`
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: isResend ? "Rappel — ton accès TopCloz est prêt" : "Ton accès à TopCloz est prêt 🎉",
      html: buildEmailHtml({ firstName, loginUrl, email, tempPassword, credits }),
      reply_to: FROM_EMAIL,
    }),
  })
  if (!resendRes.ok) {
    const detail = await resendRes.text().catch(() => "")
    return json({ error: `Resend ${resendRes.status}: ${detail.slice(0, 200)}` }, 502)
  }
  const resendBody = await resendRes.json().catch(() => ({}))

  // 5. Marque l'invitation comme envoyée
  const { data: updated } = await admin
    .from("admin_invites")
    .update({
      status: "sent",
      sent_at: invite.sent_at ?? new Date().toISOString(),
      last_resent_at: isResend ? new Date().toISOString() : invite.last_resent_at,
      user_id: userId,
    })
    .eq("id", invite.id)
    .select()
    .single()

  return json({ invite: updated ?? invite, resend_id: resendBody?.id ?? null })
})
