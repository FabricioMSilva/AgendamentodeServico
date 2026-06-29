-- IBeleza / Agendamento de Servico
-- Run this once in Supabase SQL Editor for a fresh project.
-- It creates the app tables, indexes, auth profile trigger, RLS policies,
-- appointment business rules, and the public logo storage bucket.

begin;

create extension if not exists "uuid-ossp";

-- Tables

create table if not exists public.super_admins (
  email text primary key
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  name text,
  phone text unique,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.establishments (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references public.profiles(id) on delete set null,
  owner_email text not null,
  slug text not null unique,
  name text not null,
  address text,
  contact text,
  logo_url text,
  business_hours jsonb not null default '{}',
  slots_per_schedule int not null default 10 check (slots_per_schedule > 0),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  price_type text not null check (price_type in ('fixed', 'variable')),
  price numeric(10, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')
  ),
  created_at timestamptz not null default now()
);

-- Indexes

create index if not exists idx_profiles_email
  on public.profiles (email);

create index if not exists idx_profiles_phone
  on public.profiles (phone);

create index if not exists idx_establishments_admin_id
  on public.establishments (admin_id);

create index if not exists idx_establishments_owner_email
  on public.establishments (owner_email);

create index if not exists idx_services_establishment_id
  on public.services (establishment_id);

create index if not exists idx_appointments_customer_status
  on public.appointments (customer_id, status);

create index if not exists idx_appointments_establishment_scheduled_at
  on public.appointments (establishment_id, scheduled_at);

create index if not exists idx_appointments_service_id
  on public.appointments (service_id);

-- RLS

alter table public.super_admins enable row level security;
alter table public.profiles enable row level security;
alter table public.establishments enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

alter table public.super_admins force row level security;
alter table public.profiles force row level security;
alter table public.establishments force row level security;
alter table public.services force row level security;
alter table public.appointments force row level security;

-- Helper functions used by RLS and appointment rules

create or replace function public.count_open_appointments(p_customer_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.appointments
  where customer_id = p_customer_id
    and status in ('pending', 'confirmed');
$$;

create or replace function public.count_no_show_appointments(p_customer_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.appointments
  where customer_id = p_customer_id
    and status = 'no_show';
$$;

create or replace function public.is_establishment_blocked(p_establishment_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_blocked from public.establishments where id = p_establishment_id),
    true
  );
$$;

-- Auth profile onboarding
-- When a Supabase Auth user is created, this creates public.profiles.
-- If the user's email matches establishments.owner_email, they become admin
-- and are linked to that establishment.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_establishment_id uuid;
  v_role text := 'customer';
begin
  select id
  into v_establishment_id
  from public.establishments
  where lower(owner_email) = lower(new.email)
  limit 1;

  if v_establishment_id is not null then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, role, name, phone, email, avatar_url)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    role = excluded.role,
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    avatar_url = excluded.avatar_url;

  if v_establishment_id is not null then
    update public.establishments
    set admin_id = new.id
    where id = v_establishment_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Appointment status rules

create or replace function public.enforce_appointment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.scheduled_at is distinct from old.scheduled_at then
    if public.is_establishment_blocked(new.establishment_id) then
      raise exception 'Cannot reschedule appointments for a blocked establishment'
        using errcode = 'P0001';
    end if;
  end if;

  if old.status in ('no_show', 'completed', 'cancelled') and new.status <> old.status then
    raise exception 'Terminal status "%" cannot be changed', old.status
      using errcode = 'P0002';
  end if;

  if old.status = 'pending'
    and new.status not in ('confirmed', 'cancelled', 'pending') then
    raise exception 'Invalid transition from pending to %', new.status
      using errcode = 'P0003';
  end if;

  if old.status = 'confirmed'
    and new.status not in ('checked_in', 'completed', 'cancelled', 'no_show', 'confirmed') then
    raise exception 'Invalid transition from confirmed to %', new.status
      using errcode = 'P0003';
  end if;

  if old.status = 'checked_in'
    and new.status not in ('completed', 'no_show', 'checked_in') then
    raise exception 'Invalid transition from checked_in to %', new.status
      using errcode = 'P0003';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_appointment_rules_trigger on public.appointments;
create trigger enforce_appointment_rules_trigger
  before update on public.appointments
  for each row execute function public.enforce_appointment_rules();

-- Policies: profiles

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin_customers" on public.profiles;
create policy "profiles_select_admin_customers"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      join public.establishments e on e.id = a.establishment_id
      where a.customer_id = profiles.id
        and e.admin_id = auth.uid()
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Policies: establishments

drop policy if exists "establishments_select_public" on public.establishments;
create policy "establishments_select_public"
  on public.establishments for select to anon, authenticated
  using (true);

drop policy if exists "establishments_update_own_admin" on public.establishments;
create policy "establishments_update_own_admin"
  on public.establishments for update to authenticated
  using (admin_id = auth.uid())
  with check (admin_id = auth.uid());

-- Policies: services

drop policy if exists "services_select_public" on public.services;
create policy "services_select_public"
  on public.services for select to anon, authenticated
  using (true);

drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin"
  on public.services for insert to authenticated
  with check (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin"
  on public.services for update to authenticated
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

drop policy if exists "services_delete_admin" on public.services;
create policy "services_delete_admin"
  on public.services for delete to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

-- Policies: appointments

drop policy if exists "appointments_select_customer" on public.appointments;
create policy "appointments_select_customer"
  on public.appointments for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists "appointments_select_admin" on public.appointments;
create policy "appointments_select_admin"
  on public.appointments for select to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "appointments_insert_customer" on public.appointments;
create policy "appointments_insert_customer"
  on public.appointments for insert to authenticated
  with check (
    auth.uid() = customer_id
    and not public.is_establishment_blocked(establishment_id)
    and public.count_no_show_appointments(auth.uid()) <= 2
    and public.count_open_appointments(auth.uid()) < 3
  );

drop policy if exists "appointments_update_customer_checkin" on public.appointments;
create policy "appointments_update_customer_checkin"
  on public.appointments for update to authenticated
  using (
    customer_id = auth.uid()
    and status in ('pending', 'confirmed')
  )
  with check (
    customer_id = auth.uid()
    and status = 'checked_in'
  );

drop policy if exists "appointments_update_admin" on public.appointments;
create policy "appointments_update_admin"
  on public.appointments for update to authenticated
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

drop policy if exists "appointments_delete_admin" on public.appointments;
create policy "appointments_delete_admin"
  on public.appointments for delete to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

-- Storage bucket and policies for establishment logos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "logos_insert_admin" on storage.objects;
create policy "logos_insert_admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "logos_select_public" on storage.objects;
create policy "logos_select_public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'logos');

drop policy if exists "logos_update_admin" on storage.objects;
create policy "logos_update_admin"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "logos_delete_admin" on storage.objects;
create policy "logos_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (
      select id::text from public.establishments where admin_id = auth.uid()
    )
  );

-- Saúde e beleza: detalhes de serviços, itens do agendamento,
-- dados de contato do cliente, proteção de agenda e lembretes.

alter table public.establishments
  add column if not exists whatsapp_phone text,
  add column if not exists reminder_hours_before int not null default 12
    check (reminder_hours_before between 1 and 72);

alter table public.services
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists duration_minutes int not null default 30
    check (duration_minutes between 10 and 480),
  add column if not exists category text not null default 'Saúde e beleza',
  add column if not exists is_active boolean not null default true;

alter table public.appointments
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists notes text,
  add column if not exists total_price numeric(10, 2),
  add column if not exists total_duration_minutes int not null default 30
    check (total_duration_minutes between 10 and 720),
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists confirmed_by_customer_at timestamptz;

create table if not exists public.appointment_items (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  service_name text not null,
  price_type text not null check (price_type in ('fixed', 'variable')),
  price numeric(10, 2),
  duration_minutes int not null check (duration_minutes between 10 and 480),
  created_at timestamptz not null default now()
);

create index if not exists idx_services_establishment_active_category
  on public.services (establishment_id, is_active, category, name);

create index if not exists idx_appointments_establishment_status_time
  on public.appointments (establishment_id, status, scheduled_at);

create unique index if not exists idx_appointments_unique_active_slot
  on public.appointments (establishment_id, scheduled_at)
  where status in ('pending', 'confirmed', 'checked_in');

create index if not exists idx_appointment_items_appointment_id
  on public.appointment_items (appointment_id);

alter table public.appointment_items enable row level security;
alter table public.appointment_items force row level security;

drop policy if exists "appointment_items_select_customer" on public.appointment_items;
create policy "appointment_items_select_customer"
  on public.appointment_items for select to authenticated
  using (
    appointment_id in (
      select id from public.appointments where customer_id = auth.uid()
    )
  );

drop policy if exists "appointment_items_select_admin" on public.appointment_items;
create policy "appointment_items_select_admin"
  on public.appointment_items for select to authenticated
  using (
    appointment_id in (
      select a.id
      from public.appointments a
      join public.establishments e on e.id = a.establishment_id
      where e.admin_id = auth.uid()
    )
  );

drop policy if exists "appointment_items_insert_customer" on public.appointment_items;
create policy "appointment_items_insert_customer"
  on public.appointment_items for insert to authenticated
  with check (
    appointment_id in (
      select id from public.appointments where customer_id = auth.uid()
    )
  );

drop policy if exists "appointment_items_delete_admin" on public.appointment_items;
create policy "appointment_items_delete_admin"
  on public.appointment_items for delete to authenticated
  using (
    appointment_id in (
      select a.id
      from public.appointments a
      join public.establishments e on e.id = a.establishment_id
      where e.admin_id = auth.uid()
    )
  );

commit;
