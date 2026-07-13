-- =============================================================================
-- PIPELINE — Schéma Supabase v5
-- Interface d'administration (gestion utilisateurs, crédits, activité)
-- À exécuter APRÈS 01, 04, 06 et 08
-- =============================================================================

-- =============================================================================
-- 1. RÔLES ADMIN
-- Table dédiée plutôt qu'une colonne dans profiles :
-- - Séparation nette des droits sensibles
-- - Facile de retirer/ajouter un admin sans toucher au profil utilisateur
-- - Permet plusieurs admins (toi + équipe)
-- =============================================================================

create table public.admin_users (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null default 'admin', -- 'admin' pour l'instant, extensible plus tard
  granted_by uuid references auth.users on delete set null,
  granted_at timestamptz default now(),
  notes text
);

alter table public.admin_users enable row level security;

-- Seul un admin peut voir la liste des admins
create policy "Admins view admin list"
  on public.admin_users for select
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- Personne ne peut modifier via l'API frontend : ajout/retrait d'admin se fait
-- uniquement en SQL direct (Supabase Dashboard) pour raisons de sécurité.
-- Cela évite qu'un admin compromis en promeuve d'autres depuis l'interface.

-- =============================================================================
-- 2. SUSPENSION D'UTILISATEURS
-- =============================================================================

alter table public.profiles
  add column if not exists is_suspended boolean default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users on delete set null,
  add column if not exists suspension_reason text;

-- =============================================================================
-- 3. LOG D'ACTIONS ADMIN (audit trail)
-- Traçabilité de toutes les actions sensibles effectuées depuis le back-office
-- =============================================================================

create table public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users on delete cascade,
  target_user_id uuid references auth.users on delete set null,
  action_type text not null, -- 'credit_add', 'credit_remove', 'suspend', 'unsuspend', 'delete_user', 'update_profile', etc.
  details jsonb, -- détails structurés de l'action
  created_at timestamptz default now()
);

create index admin_action_logs_admin_idx on public.admin_action_logs(admin_user_id);
create index admin_action_logs_target_idx on public.admin_action_logs(target_user_id);
create index admin_action_logs_created_at_idx on public.admin_action_logs(created_at desc);

alter table public.admin_action_logs enable row level security;

create policy "Admins view all logs"
  on public.admin_action_logs for select
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

-- Insertion via Edge Function uniquement (service_role)

-- =============================================================================
-- 4. FONCTION HELPER : is_admin()
-- Utilisée dans les policies RLS des autres tables pour donner accès admin
-- =============================================================================

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (select 1 from public.admin_users where user_id = check_user_id);
end;
$$ language plpgsql security definer stable;

-- =============================================================================
-- 5. POLICIES ADMIN — ajout d'accès admin en lecture sur toutes les tables clés
-- Un admin peut LIRE toutes les données, mais les modifications se font via
-- Edge Functions avec la service_role key pour tracer chaque action.
-- =============================================================================

-- Profiles : admin peut lire tous les profils
create policy "Admins view all profiles"
  on public.profiles for select using (public.is_admin());

-- Prospects : admin peut lire tous les prospects (pour support utilisateur)
create policy "Admins view all prospects"
  on public.prospects for select using (public.is_admin());

-- Crédits : admin peut lire tous les crédits
create policy "Admins view all credits"
  on public.search_credits for select using (public.is_admin());

-- Recherches : admin peut lire toutes les recherches
create policy "Admins view all searches"
  on public.lead_searches for select using (public.is_admin());

-- Services générés : admin peut lire tout
create policy "Admins view all generated services"
  on public.generated_services for select using (public.is_admin());

-- Portfolios : admin peut lire tout (y compris non publiés)
create policy "Admins view all portfolios"
  on public.portfolios for select using (public.is_admin());

-- Paiements : admin peut lire tous les paiements
create policy "Admins view all payments"
  on public.payments for select using (public.is_admin());

-- Leads du portfolio : admin peut lire tous les leads
create policy "Admins view all portfolio leads"
  on public.portfolio_leads for select using (public.is_admin());

-- =============================================================================
-- 6. VUE STATISTIQUES POUR LE DASHBOARD ADMIN
-- Une vue permet de récupérer les KPIs globaux en une seule requête,
-- plutôt que 10 requêtes séparées côté frontend.
-- =============================================================================

create or replace view public.admin_dashboard_stats as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where has_paid = true) as paid_users,
  (select count(*) from public.profiles where is_suspended = true) as suspended_users,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as new_users_7d,
  (select count(*) from public.profiles where created_at > now() - interval '30 days') as new_users_30d,
  (select count(*) from public.prospects) as total_prospects,
  (select count(*) from public.generated_services) as total_generated_services,
  (select count(*) from public.upwork_proposals) as total_upwork_proposals,
  (select count(*) from public.lead_searches) as total_lead_searches,
  (select coalesce(sum(credits_used_total), 0) from public.search_credits) as total_credits_consumed,
  (select coalesce(sum(amount), 0) from public.payments where status = 'confirmed') as total_revenue;

-- La vue hérite des permissions des tables sous-jacentes,
-- mais on ajoute une policy explicite pour clarifier
grant select on public.admin_dashboard_stats to authenticated;

-- =============================================================================
-- 7. INSTRUCTION POUR CRÉER LE PREMIER ADMIN
-- À exécuter manuellement dans le SQL Editor de Supabase après création
-- de ton compte utilisateur normal via l'app.
--
-- ⚠️  Remplace 'ton-email@example.com' par TON email de compte Pipeline
-- =============================================================================

-- insert into public.admin_users (user_id, role, notes)
-- select id, 'admin', 'Fondateur — premier admin'
-- from auth.users
-- where email = 'ton-email@example.com';

-- =============================================================================
-- ✅ Terminé.
-- Nouvelles tables : admin_users, admin_action_logs
-- Colonnes ajoutées sur profiles : is_suspended, suspended_at, suspended_by,
-- suspension_reason
-- Fonction : is_admin()
-- Vue : admin_dashboard_stats
-- =============================================================================
