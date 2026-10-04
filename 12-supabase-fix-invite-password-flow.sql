-- =====================================================================
--  12-supabase-fix-invite-password-flow.sql
-- ---------------------------------------------------------------------
--  ⚠️  Déjà appliquée sur le projet pipeline (cwbvzsozyoybypgnnuds)
--      via le connecteur Supabase MCP. Conservée pour historique et
--      pour pouvoir rejouer sur une base vierge.
--
--  Objectif
--    Corriger le flow d'invitation : garantir qu'un invité :
--      1. a bien une ligne dans `profiles` (avant, le trigger faisait
--         un UPDATE sur une ligne inexistante → profil orphelin) ;
--      2. est redirigé vers /set-password avant /onboarding grâce au
--         flag `profiles.needs_password_setup`.
--
--  Contexte
--    L'edge function `send-invite` crée l'utilisateur Auth via
--    admin.auth.admin.createUser → cela déclenche le trigger
--    `apply_invite_on_signup`. L'ancien trigger faisait un UPDATE
--    sur public.profiles, mais aucune ligne n'existait encore (pas
--    de trigger `handle_new_user`), donc rien n'était écrit.
--
--  Changements
--    1. ALTER profiles ADD COLUMN needs_password_setup boolean.
--    2. CREATE OR REPLACE apply_invite_on_signup : INSERT ON CONFLICT
--       DO UPDATE au lieu de UPDATE (crée le profil si absent).
--    3. Backfill des invités déjà envoyés (status='sent') sans profil
--       + leurs crédits dans search_credits.
-- =====================================================================

-- 1. Colonne sur profiles ----------------------------------------------
alter table public.profiles
  add column if not exists needs_password_setup boolean not null default false;

comment on column public.profiles.needs_password_setup is
  'true pour un invité qui n''a pas encore défini son mot de passe. '
  'Posé par apply_invite_on_signup, remis à false par /set-password.';

-- 2. Trigger : apply_invite_on_signup ----------------------------------
create or replace function public.apply_invite_on_signup()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare inv record;
begin
  select * into inv from public.admin_invites
   where lower(email) = lower(new.email) and status in ('pending','sent') limit 1;
  if not found then return new; end if;

  update public.admin_invites
     set status = 'accepted', user_id = new.id, accepted_at = now()
   where id = inv.id;

  -- Crée le profil s'il n'existe pas (cas invité), ou pose juste les flags
  -- (cas signup normal où le frontend l'a déjà inséré).
  insert into public.profiles (user_id, first_name, last_name, email,
                               has_paid, paid_at, needs_password_setup)
  values (new.id, coalesce(inv.first_name, ''), '', new.email,
          true, now(), true)
  on conflict (user_id) do update set
      has_paid              = true,
      paid_at               = coalesce(public.profiles.paid_at, now()),
      needs_password_setup  = true;

  insert into public.search_credits (user_id, credits_remaining, credits_used_total)
  values (new.id, inv.credits_granted, 0)
  on conflict (user_id) do update set credits_remaining = excluded.credits_remaining;

  return new;
end;
$function$;

-- 3. Backfill : invités déjà créés mais sans profil --------------------
insert into public.profiles (user_id, first_name, last_name, email,
                             has_paid, paid_at, needs_password_setup)
select i.user_id, coalesce(i.first_name, ''), '', u.email,
       true, now(), true
from public.admin_invites i
join auth.users u on u.id = i.user_id
where i.status = 'sent'
  and i.user_id is not null
  and not exists (select 1 from public.profiles p where p.user_id = i.user_id)
on conflict (user_id) do update set needs_password_setup = true;

-- 4. Backfill des crédits manquants
insert into public.search_credits (user_id, credits_remaining, credits_used_total)
select i.user_id, i.credits_granted, 0
from public.admin_invites i
where i.status = 'sent'
  and i.user_id is not null
  and not exists (select 1 from public.search_credits s where s.user_id = i.user_id)
on conflict (user_id) do nothing;
