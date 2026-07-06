-- =============================================================================
-- PIPELINE — Schéma complet Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase (SQL Editor → New query)
-- Il crée toutes les tables, les index, les politiques de sécurité (RLS)
-- =============================================================================

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- Profil utilisateur (extension de auth.users)
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  avatar_url text,
  company_name text,
  job_title text,
  business_type text,
  business_description text,
  main_offer text,
  pitch_problem text,
  pitch_solution text,
  pitch_proposition text,
  icp_sectors text[] default '{}',
  icp_company_size text,
  icp_regions text[] default '{}',
  icp_decision_maker_role text,
  icp_main_problem text,
  icp_budget_range text,
  active_channels text[] default '{}',
  timezone text default 'Europe/Paris',
  theme text default 'light',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prospects
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  linkedin_url text,
  company_name text not null,
  company_website text,
  company_size text,
  sector text,
  position text,
  country text default 'France',
  city text,
  status text not null default 'new',
  channel text not null default 'linkedin',
  priority smallint default 3,
  is_favorite boolean default false,
  is_reachable text default 'to_confirm',
  source text,
  notes text,
  estimated_deal_value numeric,
  tags text[] default '{}',
  engagement_score smallint default 0,
  last_interaction_at timestamptz,
  next_action_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index prospects_user_id_idx on public.prospects(user_id);
create index prospects_status_idx on public.prospects(status);

-- Interactions (historique des échanges)
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  type text not null,
  title text not null,
  content text,
  sentiment text default 'neutral',
  occurred_at timestamptz not null,
  created_at timestamptz default now()
);

create index interactions_prospect_id_idx on public.interactions(prospect_id);
create index interactions_user_id_idx on public.interactions(user_id);

-- Actions à faire
create table public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  prospect_id uuid references public.prospects on delete cascade,
  type text not null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index actions_user_id_idx on public.actions(user_id);
create index actions_scheduled_at_idx on public.actions(scheduled_at);

-- Rendez-vous
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int default 30,
  platform text default 'Google Meet',
  meeting_link text,
  preparation_notes text,
  preparation_questions text[] default '{}',
  notes_rapport text,
  notes_problems text,
  notes_solution text,
  notes_closing text,
  outcome text,
  price_announced numeric,
  objections text,
  follow_up_date timestamptz,
  status text default 'scheduled',
  created_at timestamptz default now()
);

create index meetings_user_id_idx on public.meetings(user_id);

-- Objectifs
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  period text not null,
  title text not null,
  category text not null,
  target_value int not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index goals_user_id_idx on public.goals(user_id);

-- Progression d'objectifs
create table public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  period_start_date date not null,
  current_value int default 0,
  is_completed boolean default false,
  updated_at timestamptz default now(),
  unique (goal_id, period_start_date)
);

create index goal_progress_user_id_idx on public.goal_progress(user_id);

-- Routine quotidienne
create table public.daily_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  linkedin_post_done boolean default false,
  linkedin_post_content text,
  linkedin_connections_count int default 0,
  emails_sent_count int default 0,
  conversations_count int default 0,
  calls_made_count int default 0,
  notes text,
  closed_at timestamptz,
  unique (user_id, date)
);

create index daily_routines_user_id_idx on public.daily_routines(user_id);

-- Templates d'emails et messages
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category text not null,
  title text not null,
  subject text,
  content text not null,
  channel text default 'email',
  is_default boolean default false,
  created_at timestamptz default now()
);

create index templates_user_id_idx on public.templates(user_id);

-- Questions de découverte
create table public.discovery_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  question text not null,
  order_index int default 0,
  is_active boolean default true
);

create index discovery_questions_user_id_idx on public.discovery_questions(user_id);

-- Objections et réponses
create table public.objection_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  objection text not null,
  response text not null
);

create index objection_responses_user_id_idx on public.objection_responses(user_id);


-- =============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- Chaque utilisateur ne voit et ne modifie QUE ses propres données.
-- =============================================================================

-- Activer RLS sur toutes les tables
alter table public.profiles enable row level security;
alter table public.prospects enable row level security;
alter table public.interactions enable row level security;
alter table public.actions enable row level security;
alter table public.meetings enable row level security;
alter table public.goals enable row level security;
alter table public.goal_progress enable row level security;
alter table public.daily_routines enable row level security;
alter table public.templates enable row level security;
alter table public.discovery_questions enable row level security;
alter table public.objection_responses enable row level security;

-- Profiles (clé = user_id)
create policy "Users see own profile"
  on public.profiles for select using (auth.uid() = user_id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = user_id);
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

-- Politique standard : same user_id = même utilisateur authentifié
create policy "Users manage own prospects"
  on public.prospects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own interactions"
  on public.interactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own actions"
  on public.actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own meetings"
  on public.meetings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own goals"
  on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own goal_progress"
  on public.goal_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own daily_routines"
  on public.daily_routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own templates"
  on public.templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own discovery_questions"
  on public.discovery_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own objection_responses"
  on public.objection_responses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- =============================================================================
-- 3. TRIGGER pour mettre à jour updated_at automatiquement
-- =============================================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_updated_at_prospects
  before update on public.prospects
  for each row execute function public.update_updated_at();

-- =============================================================================
-- ✅ Terminé. Vérifiez dans "Table Editor" que toutes les tables sont créées.
-- =============================================================================
