-- Optional in-game / client username on user profiles (organizer can copy to roster).
alter table profiles
  add column if not exists online_client_username text;
