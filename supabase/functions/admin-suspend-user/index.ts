import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Méthode non supportée" }, 405)
  const auth = req.headers.get("Authorization")
  if (!auth) return json({ error: "Non authentifié" }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: uErr } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""))
  if (uErr || !user) return json({ error: "Session invalide" }, 401)

  const { data: adminRow } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle()
  if (!adminRow) return json({ error: "Accès réservé aux administrateurs." }, 403)

  let body: { target_user_id?: string; reason?: string }
  try { body = await req.json() } catch { return json({ error: "JSON invalide" }, 400) }
  const targetId = body.target_user_id
  const reason = (body.reason ?? "").trim()
  if (!targetId) return json({ error: "Utilisateur cible manquant." }, 400)
  if (!reason) return json({ error: "La raison de suspension est obligatoire." }, 400)
  if (targetId === user.id) return json({ error: "Tu ne peux pas te suspendre toi-même." }, 400)

  await admin.from("profiles").update({
    is_suspended: true, suspended_at: new Date().toISOString(), suspended_by: user.id, suspension_reason: reason,
  }).eq("user_id", targetId)

  await admin.from("admin_action_logs").insert({
    admin_user_id: user.id, target_user_id: targetId, action_type: "suspend", details: { reason },
  })

  return json({ ok: true })
})
