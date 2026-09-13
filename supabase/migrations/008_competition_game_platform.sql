-- Game platform / ruleset the competition is played on (TCG, Genesys, Master Duel).
alter table competitions
  add column if not exists game_platform text check (
    game_platform in ('tcg', 'genesys', 'master_duel')
  );

comment on column competitions.game_platform is
  'Official play platform: tcg, genesys, or master_duel.';
