-- Fix "Database error saving new user" on Google OAuth signup.
-- Run in Supabase → SQL Editor if sign-in fails after redirect URL is configured.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

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
