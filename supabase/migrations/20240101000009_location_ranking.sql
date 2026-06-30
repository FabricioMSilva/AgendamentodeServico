-- Location fields for distance-aware search ranking.

alter table public.profiles
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

alter table public.establishments
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

create index if not exists idx_profiles_location
  on public.profiles (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists idx_establishments_location
  on public.establishments (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists idx_establishments_address_rank
  on public.establishments (state, city, neighborhood, zip_code)
  where is_blocked = false;
