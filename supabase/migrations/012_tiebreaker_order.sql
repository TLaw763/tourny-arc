-- Match points, game difference, fewer games played (2-0 > 2-1), then name.
update rulesets
set tiebreaker_order = '["matchPoints","gameDifference","gamesTotal","displayName"]'::jsonb;

alter table rulesets
  alter column tiebreaker_order
  set default '["matchPoints","gameDifference","gamesTotal","displayName"]'::jsonb;
