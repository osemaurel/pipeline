-- =============================================================================
-- PIPELINE — Schéma Supabase v3
-- Module "Recherche de prospects ciblée" (V2 produit)
-- À exécuter APRÈS 01-supabase-schema.sql et 04-supabase-schema-v2.sql
-- =============================================================================

-- =============================================================================
-- 1. CRÉDITS DE RECHERCHE
-- Chaque recherche/enrichissement consomme des crédits pour maîtriser les coûts
-- d'API (Overpass est gratuit mais l'enrichissement dirigeant + email a un coût
-- de traitement à contrôler malgré tout).
-- =============================================================================

create table public.search_credits (
  user_id uuid primary key references auth.users on delete cascade,
  credits_remaining int not null default 20,
  credits_used_total int not null default 0,
  updated_at timestamptz default now()
);

alter table public.search_credits enable row level security;

create policy "Users view own credits"
  on public.search_credits for select using (auth.uid() = user_id);

-- Pas de policy insert/update pour l'utilisateur : seule une Edge Function
-- avec la service_role key peut décrémenter les crédits (évite la triche côté client)

-- =============================================================================
-- 2. RECHERCHES EFFECTUÉES (historique)
-- =============================================================================

create table public.lead_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  city text not null,
  category text not null,
  exclude_with_website boolean default true,
  results_count int default 0,
  credits_spent int default 0,
  status text not null default 'pending', -- 'pending' | 'completed' | 'failed'
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index lead_searches_user_id_idx on public.lead_searches(user_id);

alter table public.lead_searches enable row level security;

create policy "Users manage own searches"
  on public.lead_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 3. RÉSULTATS DE RECHERCHE (les entreprises trouvées)
-- =============================================================================

create table public.lead_search_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.lead_searches on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  business_name text not null,
  address text,
  phone text,
  website text, -- normalement vide si exclude_with_website = true
  owner_name text, -- récupéré via annuaire-entreprises.data.gouv.fr si dispo
  email text, -- déduit ou trouvé via enrichissement
  source text default 'osm', -- 'osm' | 'google_places' | autre
  enriched boolean default false,
  contacted boolean default false,
  contacted_at timestamptz,
  contact_method text, -- 'email' | 'whatsapp'
  converted_to_prospect_id uuid references public.prospects on delete set null,
  created_at timestamptz default now()
);

create index lead_search_results_search_id_idx on public.lead_search_results(search_id);
create index lead_search_results_user_id_idx on public.lead_search_results(user_id);

alter table public.lead_search_results enable row level security;

create policy "Users manage own lead results"
  on public.lead_search_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 4. FONCTION D'INITIALISATION DES CRÉDITS À LA CRÉATION DE COMPTE
-- (à appeler depuis le même trigger/flow que la création du profil)
-- =============================================================================

create or replace function public.init_search_credits(p_user_id uuid)
returns void as $$
begin
  insert into public.search_credits (user_id, credits_remaining, credits_used_total)
  values (p_user_id, 20, 0)
  on conflict (user_id) do nothing;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- ✅ Terminé. Nouvelles tables : search_credits, lead_searches, lead_search_results.
-- =============================================================================
