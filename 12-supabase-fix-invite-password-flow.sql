-- =====================================================================
--  12-supabase-fix-invite-password-flow.sql
-- ---------------------------------------------------------------------
--  Objectif
--    Renforcer le flow d'invitation : garantir qu'un invité est bien
--    redirigé vers /set-password AVANT /onboarding, même si l'edge
--    function `send-invite` n'a pas été redéployée.
--
--  Pourquoi
--    `ProtectedRoute` s'appuyait uniquement sur
--    `auth.users.raw_user_meta_data->>'needs_password_setup'`, qui est
--    posé par l'edge function. Si celle-ci n'est pas à jour, le flag
--    manque et l'invité tombe direct sur le dashboard.
--
--  Ce que fait cette migration
--    1. Ajoute `profiles.needs_password_setup boolean not null default false`.
--    2. Met à jour `apply_invite_on_signup` pour positionner ce flag à
--       true quand un nouvel utilisateur signe via une invitation.
--    3. Backfill : passe `needs_password_setup = true` sur les profils
--       actuellement liés à une invitation `admin_invites.status = 'sent'`
--       (invité pas encore passé par /set-password).
--
--  À exécuter dans Supabase → SQL Editor.
-- =====================================================================

-- 1. Colonne sur profiles ----------------------------------------------
alter table public.profiles
  add column if not exists needs_password_setup boolean not null default false;

comment on column public.profiles.needs_password_setup is
  'true pour un invité qui n''a pas encore défini son mot de passe. '
  'Posé par apply_invite_on_signup, remis à false par /set-password.';

-- 2. Trigger : apply_invite_on_signup ----------------------------------
-- On préserve le comportement existant (link admin_invites.user_id,
-- status=accepted, has_paid=true, crédits) et on ajoute l'écriture du
-- flag needs_password_setup=true dans profiles.
create or replace function public.apply_invite_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.admin_invites%rowtype;
begin
  -- Chercher l'invitation correspondant à l'email du nouvel utilisateur
  select *
    into v_invite
    from public.admin_invites
   where lower(email) = lower(new.email)
   limit 1;

  if v_invite.id is null then
    -- Pas d'invitation : rien à faire (signup libre, si réactivé).
    return new;
  end if;

  -- Lie l'invitation à l'utilisateur, marque comme acceptée
  update public.admin_invites
     set user_id     = new.id,
         status      = 'accepted',
         accepted_at = coalesce(accepted_at, now())
   where id = v_invite.id;

  -- Débloque immédiatement l'accès payant et crédite les recherches
  update public.profiles
     set has_paid              = true,
         paid_at               = coalesce(paid_at, now()),
         payment_provider      = coalesce(payment_provider, 'invite'),
         needs_password_setup  = true  -- <<< NOUVEAU
   where user_id = new.id;

  -- Crédits de recherche : on utilise la RPC existante (idempotente)
  perform public.init_search_credits(new.id);

  -- Ajout des crédits accordés par l'admin, si > 0
  if v_invite.credits_granted is not null and v_invite.credits_granted > 0 then
    update public.profiles
       set search_credits_remaining = coalesce(search_credits_remaining, 0) + v_invite.credits_granted
     where user_id = new.id;
  end if;

  return new;
end;
$$;

-- Trigger reposé pour que la version mise à jour soit active
drop trigger if exists apply_invite_on_signup_trg on auth.users;
create trigger apply_invite_on_signup_trg
  after insert on auth.users
  for each row execute function public.apply_invite_on_signup();

-- 3. Backfill : invités déjà créés mais pas encore passés par /set-password
--    (admin_invites.status = 'sent' + user_id non null)
update public.profiles p
   set needs_password_setup = true
  from public.admin_invites i
 where i.user_id = p.user_id
   and i.status  = 'sent'
   and p.needs_password_setup = false;

-- =====================================================================
--  Après exécution
--    - Redéployer l'edge function `send-invite` (le flag user_metadata
--      reste utile en bretelles).
--    - Dans Supabase Auth → URL Configuration : vérifier que
--      SITE_URL = https://topcloz.com et que /dashboard est bien dans
--      les Redirect URLs.
-- =====================================================================
