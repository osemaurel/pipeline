-- =============================================================================
-- PIPELINE — Schéma Supabase v2
-- Ajoute au schéma v1 (01-supabase-schema.sql) : portfolios, leads publics,
-- gestion du paiement/accès, et générations de contenu IA.
--
-- Si vous n'avez PAS encore exécuté le schéma v1, exécutez d'abord ce fichier
-- en entier (il inclut désormais tout, v1 + v2 fusionnés).
-- =============================================================================

-- =============================================================================
-- 1. PAIEMENT / ACCÈS — à ajouter sur la table profiles existante
-- =============================================================================

alter table public.profiles
  add column if not exists has_paid boolean default false,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists amount_paid numeric,
  add column if not exists currency text default 'XOF';

-- Historique des paiements (utile pour support / litiges / factures)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null, -- 'moneroo' | 'moneyfusion'
  provider_reference text not null,
  amount numeric not null,
  currency text default 'XOF',
  status text not null default 'pending', -- 'pending' | 'confirmed' | 'failed' | 'refunded'
  raw_webhook_payload jsonb,
  created_at timestamptz default now(),
  confirmed_at timestamptz
);

create index payments_user_id_idx on public.payments(user_id);
create unique index payments_provider_reference_idx on public.payments(provider, provider_reference);

alter table public.payments enable row level security;

-- L'utilisateur peut voir ses propres paiements, mais ne peut JAMAIS les modifier
-- directement (seule une Edge Function avec la service_role key peut écrire ici)
create policy "Users view own payments"
  on public.payments for select using (auth.uid() = user_id);

-- Pas de policy insert/update/delete pour les utilisateurs authentifiés :
-- seule la service_role key (utilisée côté Edge Function) peut écrire.


-- =============================================================================
-- 2. PORTFOLIOS
-- =============================================================================

create table public.portfolios (
  user_id uuid primary key references auth.users on delete cascade,
  slug text unique not null,
  is_published boolean default false,
  headline text,
  bio text,
  photo_url text,
  whatsapp_number text,
  theme text default 'default',
  view_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index portfolios_slug_idx on public.portfolios(slug);

alter table public.portfolios enable row level security;

-- Le propriétaire gère son portfolio
create policy "Users manage own portfolio"
  on public.portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tout le monde (y compris anonyme) peut LIRE un portfolio publié
create policy "Anyone can view published portfolios"
  on public.portfolios for select using (is_published = true);


-- Services affichés sur le portfolio
create table public.portfolio_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  price numeric,
  currency text default 'XOF',
  image_url text,
  order_index int default 0,
  created_at timestamptz default now()
);

create index portfolio_services_user_id_idx on public.portfolio_services(user_id);

alter table public.portfolio_services enable row level security;

create policy "Users manage own services"
  on public.portfolio_services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone can view services of published portfolios"
  on public.portfolio_services for select using (
    exists (
      select 1 from public.portfolios
      where portfolios.user_id = portfolio_services.user_id
      and portfolios.is_published = true
    )
  );


-- Réalisations / galerie
create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  image_url text,
  external_link text,
  order_index int default 0,
  created_at timestamptz default now()
);

create index portfolio_projects_user_id_idx on public.portfolio_projects(user_id);

alter table public.portfolio_projects enable row level security;

create policy "Users manage own projects"
  on public.portfolio_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone can view projects of published portfolios"
  on public.portfolio_projects for select using (
    exists (
      select 1 from public.portfolios
      where portfolios.user_id = portfolio_projects.user_id
      and portfolios.is_published = true
    )
  );


-- Témoignages
create table public.portfolio_testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  client_name text not null,
  content text not null,
  rating smallint,
  order_index int default 0,
  created_at timestamptz default now()
);

create index portfolio_testimonials_user_id_idx on public.portfolio_testimonials(user_id);

alter table public.portfolio_testimonials enable row level security;

create policy "Users manage own testimonials"
  on public.portfolio_testimonials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone can view testimonials of published portfolios"
  on public.portfolio_testimonials for select using (
    exists (
      select 1 from public.portfolios
      where portfolios.user_id = portfolio_testimonials.user_id
      and portfolios.is_published = true
    )
  );


-- Leads générés depuis le formulaire "Demander un devis" du portfolio public
create table public.portfolio_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  email text,
  phone text,
  message text,
  converted_to_prospect_id uuid references public.prospects on delete set null,
  created_at timestamptz default now()
);

create index portfolio_leads_user_id_idx on public.portfolio_leads(user_id);

alter table public.portfolio_leads enable row level security;

-- Le propriétaire voit ses leads
create policy "Users view own leads"
  on public.portfolio_leads for select using (auth.uid() = user_id);

-- N'IMPORTE QUI (visiteur anonyme du portfolio) peut créer un lead
-- C'est volontaire : le formulaire public doit fonctionner sans authentification
create policy "Anyone can submit a lead"
  on public.portfolio_leads for insert with check (true);


-- =============================================================================
-- 3. GÉNÉRATIONS DE CONTENU IA (historique)
-- =============================================================================

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null default 'service_description', -- extensible plus tard
  input_prompt text not null,
  generated_content text not null,
  used_in_portfolio boolean default false,
  created_at timestamptz default now()
);

create index ai_generations_user_id_idx on public.ai_generations(user_id);

alter table public.ai_generations enable row level security;

create policy "Users manage own ai_generations"
  on public.ai_generations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

create trigger set_updated_at_portfolios
  before update on public.portfolios
  for each row execute function public.update_updated_at();

-- Incrémenter le compteur de vues du portfolio (à appeler depuis une Edge Function
-- ou une RPC, pas directement depuis le client pour éviter le spam de vues)
create or replace function public.increment_portfolio_view(p_slug text)
returns void as $$
begin
  update public.portfolios
  set view_count = view_count + 1
  where slug = p_slug and is_published = true;
end;
$$ language plpgsql security definer;


-- =============================================================================
-- ✅ Terminé. Nouvelles tables : payments, portfolios, portfolio_services,
-- portfolio_projects, portfolio_testimonials, portfolio_leads, ai_generations.
-- Colonnes ajoutées sur profiles : has_paid, paid_at, payment_provider,
-- payment_reference, amount_paid, currency.
-- =============================================================================
