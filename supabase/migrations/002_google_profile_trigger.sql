-- Run if 001 was already applied before Google-only auth
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;
