alter table participants
  add column if not exists online_client_player_id text;

comment on column participants.online_client_player_id is
  'In-game client player ID (e.g. Master Duel copy ID / Konami ID) for schedule display and imports.';
