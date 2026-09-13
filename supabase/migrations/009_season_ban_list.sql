-- Per-tournament card list overlay (organizer adjustments on top of format defaults).
create table if not exists season_ban_list_entries (
  id text primary key,
  season_id text not null references seasons(id) on delete cascade,
  card_name text not null,
  category text not null check (
    category in ('forbidden', 'limited', 'semi_limited', 'unlimited')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, card_name)
);

create index if not exists season_ban_list_entries_season_id_idx
  on season_ban_list_entries (season_id);

alter table season_ban_list_entries enable row level security;

drop policy if exists "public_ban_list" on season_ban_list_entries;

create policy "public_ban_list" on season_ban_list_entries for select using (
  exists (
    select 1
    from seasons s
    join competitions c on c.id = s.competition_id
    where s.id = season_ban_list_entries.season_id
      and c.visibility = 'public'
  )
);
