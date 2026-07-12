-- =============================================================================
-- PIPELINE — Schéma Supabase v4
-- Module "Générateur IA services" (ComeUp / Fiverr / Upwork)
-- À exécuter APRÈS 01, 04 et 06
-- =============================================================================

-- =============================================================================
-- 1. STYLE VISUEL DE L'UTILISATEUR
-- Cohérence : le premier style choisi devient le style par défaut,
-- appliqué à toutes les miniatures suivantes sauf changement explicite.
-- =============================================================================

create table public.user_visual_style (
  user_id uuid primary key references auth.users on delete cascade,
  style_preset text default 'modern_clean', -- 'modern_clean' | 'bold_typo' | 'photo_pro' | 'minimal_pastel' | 'tech_dark' | 'custom'
  custom_style_prompt text, -- description libre si style_preset = 'custom'
  reference_image_url text, -- image de référence uploadée par l'utilisateur
  primary_color text, -- couleur dominante souhaitée (hex)
  updated_at timestamptz default now()
);

alter table public.user_visual_style enable row level security;

create policy "Users manage own visual style"
  on public.user_visual_style for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 2. SUGGESTIONS DE SERVICES (générées par l'IA)
-- =============================================================================

create table public.suggested_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null, -- 'comeup' | 'fiverr'
  title text not null,
  category text,
  price_min numeric,
  price_max numeric,
  currency text default 'EUR', -- EUR pour ComeUp, USD pour Fiverr
  potential text, -- 'high' | 'medium' | 'low'
  rationale text, -- pourquoi ce service est prometteur (explication IA)
  is_selected boolean default false,
  created_at timestamptz default now()
);

create index suggested_services_user_id_idx on public.suggested_services(user_id);
create index suggested_services_platform_idx on public.suggested_services(platform);

alter table public.suggested_services enable row level security;

create policy "Users manage own suggested services"
  on public.suggested_services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 3. SERVICES RÉDIGÉS (avec description complète et miniature)
-- =============================================================================

create table public.generated_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  suggested_service_id uuid references public.suggested_services on delete set null,
  platform text not null, -- 'comeup' | 'fiverr'
  title text not null, -- pour ComeUp commence toujours par "Je vais..."
  description text not null,
  price numeric,
  currency text default 'EUR',
  tags text[] default '{}',
  faq jsonb default '[]'::jsonb, -- pour ComeUp : [{question, answer}, ...]
  pricing_tiers jsonb default '[]'::jsonb, -- pour Fiverr : Basic/Standard/Premium
  language text default 'fr', -- 'fr' pour ComeUp, 'en' pour Fiverr
  thumbnail_url text,
  thumbnail_style_used text, -- snapshot du style utilisé au moment de la génération
  is_published boolean default false, -- l'utilisateur a marqué comme "utilisé sur la plateforme"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index generated_services_user_id_idx on public.generated_services(user_id);
create index generated_services_platform_idx on public.generated_services(platform);

alter table public.generated_services enable row level security;

create policy "Users manage own generated services"
  on public.generated_services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 4. PROPOSITIONS UPWORK
-- L'utilisateur colle une offre, l'IA génère une cover letter personnalisée
-- =============================================================================

create table public.upwork_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  job_offer_text text not null, -- l'offre collée par l'utilisateur
  job_title text, -- extrait par l'IA
  generated_proposal text not null,
  language text default 'en',
  is_used boolean default false,
  created_at timestamptz default now()
);

create index upwork_proposals_user_id_idx on public.upwork_proposals(user_id);

alter table public.upwork_proposals enable row level security;

create policy "Users manage own upwork proposals"
  on public.upwork_proposals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

create trigger set_updated_at_generated_services
  before update on public.generated_services
  for each row execute function public.update_updated_at();

-- =============================================================================
-- ✅ Terminé.
-- Nouvelles tables : user_visual_style, suggested_services, generated_services,
-- upwork_proposals.
-- =============================================================================
