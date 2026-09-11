-- Allow public read of generated/time_proposed fixtures (expected matchups before scheduling).
drop policy if exists "public_fixtures" on fixtures;

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
