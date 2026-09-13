-- YGOProDeck reference lists (site admin) + richer tournament entries.
alter table season_ban_list_entries
  add column if not exists card_id integer,
  add column if not exists genesys_points integer;

create table if not exists reference_banlist_meta (
  format text primary key check (format in ('tcg', 'master_duel', 'genesys')),
  synced_at timestamptz not null default now(),
  entry_count integer not null default 0,
  source_note text not null default ''
);

create table if not exists reference_banlist_entries (
  id text primary key,
  format text not null check (format in ('tcg', 'master_duel', 'genesys')),
  card_id integer not null,
  card_name text not null,
  category text check (category in ('forbidden', 'limited', 'semi_limited', 'unlimited')),
  genesys_points integer,
  synced_at timestamptz not null default now(),
  unique (format, card_id)
);

create index if not exists reference_banlist_entries_format_idx
  on reference_banlist_entries (format);

alter table reference_banlist_entries enable row level security;

drop policy if exists "public_reference_banlist" on reference_banlist_entries;

create policy "public_reference_banlist" on reference_banlist_entries for select using (true);
