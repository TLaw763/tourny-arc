-- Standalone competition app schema (aligned with competition-db for migration)

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table competitions (
  id text primary key,
  name text not null,
  description text,
  visibility text not null check (visibility in ('private', 'public')),
  status text not null check (status in ('draft', 'active', 'completed', 'archived')),
  owner_customer_account_id uuid not null references auth.users(id),
  timezone text not null,
  logo_url text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table seasons (
  id text primary key,
  competition_id text not null references competitions(id) on delete cascade,
  name text not null,
  status text not null check (status in ('draft', 'active', 'completed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rulesets (
  id text primary key,
  season_id text not null references seasons(id) on delete cascade,
  matches_per_fixture integer not null default 1,
  games_to_win_match integer not null default 2,
  match_points_win integer not null default 3,
  match_points_draw integer not null default 1,
  match_points_loss integer not null default 0,
  schedule_generation_mode text not null,
  tiebreaker_order jsonb not null default '["matchPoints","headToHead","gamesWon"]',
  rules_release_id text,
  scheduling_window_start timestamptz,
  scheduling_window_end timestamptz,
  deck_deadline timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table format_plans (
  id text primary key,
  season_id text not null references seasons(id) on delete cascade,
  template text not null,
  phases jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table participants (
  id text primary key,
  competition_id text not null references competitions(id) on delete cascade,
  display_name text not null,
  online_client_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id text primary key,
  season_id text not null references seasons(id) on delete cascade,
  participant_id text not null references participants(id) on delete cascade,
  customer_account_id uuid references auth.users(id),
  role text not null check (role in ('organizer', 'participant')),
  status text not null check (status in ('invited', 'active', 'suspended', 'withdrawn')),
  eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rounds (
  id text primary key,
  season_id text not null references seasons(id) on delete cascade,
  sequence integer not null,
  label text not null,
  scheduling_window_start timestamptz,
  scheduling_window_end timestamptz,
  publication_state text not null default 'published',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table fixtures (
  id text primary key,
  round_id text not null references rounds(id) on delete cascade,
  season_id text not null references seasons(id) on delete cascade,
  state text not null,
  participant_a_id text not null references participants(id),
  participant_b_id text not null references participants(id),
  is_bye boolean not null default false,
  confirmed_start_at timestamptz,
  matches_per_fixture integer not null default 1,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table schedule_proposals (
  id text primary key,
  fixture_id text not null references fixtures(id) on delete cascade,
  proposer_membership_id text not null references memberships(id),
  proposed_start_at timestamptz not null,
  note text,
  status text not null default 'pending',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table matches (
  id text primary key,
  fixture_id text not null references fixtures(id) on delete cascade,
  sequence integer not null,
  outcome text,
  points_player_a integer not null default 0,
  points_player_b integer not null default 0,
  finalization_version integer not null default 0
);

create table games (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  sequence integer not null,
  outcome text not null
);

create table result_submissions (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  submitter_membership_id text not null references memberships(id),
  state text not null,
  payload jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table standings (
  participant_id text not null references participants(id) on delete cascade,
  season_id text not null references seasons(id) on delete cascade,
  rank integer not null,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_drawn integer not null default 0,
  matches_lost integer not null default 0,
  games_played integer not null default 0,
  games_won integer not null default 0,
  games_drawn integer not null default 0,
  games_lost integer not null default 0,
  match_points integer not null default 0,
  tiebreaker_values jsonb not null default '{}',
  rebuilt_at timestamptz not null default now(),
  primary key (participant_id, season_id)
);

create table stream_links (
  id text primary key,
  fixture_id text not null references fixtures(id) on delete cascade,
  url text not null,
  label text,
  visibility text not null default 'public',
  approved_by_membership_id text not null references memberships(id),
  created_at timestamptz not null default now()
);

create table season_invitations (
  id text primary key,
  season_id text not null references seasons(id) on delete cascade,
  participant_id text references participants(id) on delete set null,
  email text not null,
  display_name text not null,
  role text not null default 'participant',
  online_client_username text,
  token text not null unique,
  invited_by_customer_account_id uuid not null references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table generation_previews (
  preview_token text primary key,
  season_id text not null references seasons(id) on delete cascade,
  mode text not null,
  rounds jsonb not null,
  expires_at timestamptz not null
);

create table idempotency_keys (
  key text primary key,
  season_id text not null,
  round_ids jsonb not null,
  committed_at timestamptz not null default now()
);

create table audit_events (
  id text primary key,
  actor_customer_account_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now()
);

-- Indexes
create index idx_seasons_competition on seasons(competition_id);
create index idx_memberships_season on memberships(season_id);
create index idx_memberships_customer on memberships(customer_account_id);
create index idx_fixtures_season on fixtures(season_id);
create index idx_fixtures_state on fixtures(state);
create index idx_participants_competition on participants(competition_id);

-- RLS: public read for public competitions
alter table competitions enable row level security;
alter table seasons enable row level security;
alter table fixtures enable row level security;
alter table standings enable row level security;
alter table participants enable row level security;
alter table rounds enable row level security;
alter table stream_links enable row level security;

create policy "public_competitions" on competitions for select using (visibility = 'public');
create policy "public_seasons" on seasons for select using (
  exists (select 1 from competitions c where c.id = seasons.competition_id and c.visibility = 'public')
);
create policy "public_fixtures" on fixtures for select using (
  exists (
    select 1 from seasons s
    join competitions c on c.id = s.competition_id
    where s.id = fixtures.season_id
      and c.visibility = 'public'
      and fixtures.state in (
        'generated',
        'time_proposed',
        'confirmed',
        'in_progress',
        'result_pending',
        'disputed',
        'finalized',
        'postponed'
      )
      and fixtures.is_bye = false
  )
);
create policy "public_standings" on standings for select using (
  exists (
    select 1 from seasons s
    join competitions c on c.id = s.competition_id
    where s.id = standings.season_id and c.visibility = 'public'
  )
);
create policy "public_participants" on participants for select using (
  exists (
    select 1 from competitions c
    where c.id = participants.competition_id and c.visibility = 'public'
  )
);
create policy "public_rounds" on rounds for select using (
  exists (
    select 1 from seasons s
    join competitions c on c.id = s.competition_id
    where s.id = rounds.season_id and c.visibility = 'public'
  )
);
create policy "public_streams" on stream_links for select using (
  visibility = 'public' and exists (
    select 1 from fixtures f
    join seasons s on s.id = f.season_id
    join competitions c on c.id = s.competition_id
    where f.id = stream_links.fixture_id and c.visibility = 'public'
  )
);

-- Profile trigger on signup (Google OAuth metadata + search_path for Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  user_name text;
begin
  user_email := coalesce(
    nullif(trim(new.email), ''),
    nullif(trim(new.raw_user_meta_data->>'email'), '')
  );
  user_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(split_part(coalesce(user_email, ''), '@', 1), ''),
    'User'
  );

  insert into public.profiles (id, display_name, email)
  values (new.id, user_name, coalesce(user_email, ''))
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
