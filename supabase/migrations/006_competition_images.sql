-- Tournament branding: logo (square) and cover (banner) image URLs.
alter table competitions
  add column if not exists logo_url text,
  add column if not exists cover_image_url text;
