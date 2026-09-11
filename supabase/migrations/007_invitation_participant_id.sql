-- Link invitations to a specific roster participant.
alter table season_invitations
  add column if not exists participant_id text references participants(id) on delete set null;
