-- Owner dashboard: social links, media gallery, service catalog suggestions,
-- and appointment reminder/confirmation metadata.

alter table public.establishments
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists youtube_url text,
  add column if not exists tiktok_url text,
  add column if not exists business_type text not null default 'salao_feminino',
  add column if not exists reminder_message text,
  add column if not exists auto_cancel_hours_before int not null default 4
    check (auto_cancel_hours_before between 1 and 72);

alter table public.appointments
  add column if not exists owner_notified_at timestamptz,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists customer_confirmation_status text not null default 'not_requested'
    check (customer_confirmation_status in ('not_requested', 'awaiting', 'confirmed', 'declined', 'expired')),
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists customer_declined_at timestamptz,
  add column if not exists reminder_due_at timestamptz;

create table if not exists public.establishment_media (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  provider text check (provider in ('upload', 'youtube', 'tiktok', 'vimeo')),
  title text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_establishment_media_establishment_order
  on public.establishment_media (establishment_id, sort_order, created_at);

create table if not exists public.service_catalog (
  id uuid primary key default uuid_generate_v4(),
  business_type text not null,
  name text not null,
  category text not null default 'Saúde e beleza',
  default_duration_minutes int not null default 45
    check (default_duration_minutes between 10 and 480),
  default_price_type text not null default 'variable'
    check (default_price_type in ('fixed', 'variable')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_type, name)
);

create index if not exists idx_service_catalog_business_active
  on public.service_catalog (business_type, is_active, category, name);

create table if not exists public.service_suggestions (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  suggested_name text not null,
  category text not null default 'Saúde e beleza',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_suggestions_status
  on public.service_suggestions (status, created_at);

insert into public.service_catalog (business_type, name, category, default_duration_minutes, default_price_type)
values
  ('salao_feminino', 'Corte feminino', 'Cabelo', 60, 'variable'),
  ('salao_feminino', 'Escova', 'Cabelo', 45, 'variable'),
  ('salao_feminino', 'Hidratação capilar', 'Cabelo', 60, 'variable'),
  ('salao_feminino', 'Coloração', 'Cabelo', 120, 'variable'),
  ('salao_feminino', 'Luzes / mechas', 'Cabelo', 180, 'variable'),
  ('salao_feminino', 'Progressiva', 'Cabelo', 180, 'variable'),
  ('salao_feminino', 'Manicure', 'Unhas', 45, 'variable'),
  ('salao_feminino', 'Pedicure', 'Unhas', 45, 'variable'),
  ('salao_feminino', 'Alongamento de unhas', 'Unhas', 120, 'variable'),
  ('salao_feminino', 'Design de sobrancelhas', 'Sobrancelhas', 30, 'variable'),
  ('salao_feminino', 'Limpeza de pele', 'Estética', 60, 'variable'),
  ('salao_feminino', 'Maquiagem', 'Maquiagem', 60, 'variable'),
  ('barbearia', 'Corte masculino', 'Barba e cabelo', 45, 'variable'),
  ('barbearia', 'Barba', 'Barba e cabelo', 30, 'variable'),
  ('barbearia', 'Corte + barba', 'Barba e cabelo', 60, 'variable'),
  ('barbearia', 'Sobrancelha', 'Barba e cabelo', 15, 'variable'),
  ('estudio', 'Avaliação', 'Atendimento', 30, 'variable')
on conflict (business_type, name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'establishment-media', 'establishment-media', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.establishment_media enable row level security;
alter table public.establishment_media force row level security;

drop policy if exists "establishment_media_select_public" on public.establishment_media;
create policy "establishment_media_select_public"
  on public.establishment_media for select to anon, authenticated
  using (true);

drop policy if exists "establishment_media_insert_admin" on public.establishment_media;
create policy "establishment_media_insert_admin"
  on public.establishment_media for insert to authenticated
  with check (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "establishment_media_update_admin" on public.establishment_media;
create policy "establishment_media_update_admin"
  on public.establishment_media for update to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  )
  with check (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "establishment_media_delete_admin" on public.establishment_media;
create policy "establishment_media_delete_admin"
  on public.establishment_media for delete to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

alter table public.service_catalog enable row level security;
alter table public.service_catalog force row level security;

drop policy if exists "service_catalog_select_all" on public.service_catalog;
create policy "service_catalog_select_all"
  on public.service_catalog for select to anon, authenticated
  using (is_active = true);

alter table public.service_suggestions enable row level security;
alter table public.service_suggestions force row level security;

drop policy if exists "service_suggestions_select_admin" on public.service_suggestions;
create policy "service_suggestions_select_admin"
  on public.service_suggestions for select to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "service_suggestions_insert_admin" on public.service_suggestions;
create policy "service_suggestions_insert_admin"
  on public.service_suggestions for insert to authenticated
  with check (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "media_insert_admin" on storage.objects;
create policy "media_insert_admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'establishment-media'
    and (storage.foldername(name))[1] in (
      select id::text from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "media_select_public" on storage.objects;
create policy "media_select_public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'establishment-media');

drop policy if exists "media_update_admin" on storage.objects;
create policy "media_update_admin"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'establishment-media'
    and (storage.foldername(name))[1] in (
      select id::text from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "media_delete_admin" on storage.objects;
create policy "media_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'establishment-media'
    and (storage.foldername(name))[1] in (
      select id::text from public.establishments where admin_id = auth.uid()
    )
  );
