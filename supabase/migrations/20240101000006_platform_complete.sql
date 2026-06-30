-- Complete platform data model for owner dashboard, scheduling automation,
-- exceptions/holidays, notifications, staff calendars, and optional payments.

alter table public.appointments
  add column if not exists staff_id uuid,
  add column if not exists payment_id uuid,
  add column if not exists cancelled_reason text,
  add column if not exists owner_decision_at timestamptz,
  add column if not exists owner_decision_by uuid references public.profiles(id) on delete set null;

create table if not exists public.establishment_schedule_exceptions (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  exception_date date not null,
  is_open boolean not null default false,
  open_time time,
  close_time time,
  reason text,
  created_at timestamptz not null default now(),
  unique (establishment_id, exception_date)
);

create index if not exists idx_schedule_exceptions_establishment_date
  on public.establishment_schedule_exceptions (establishment_id, exception_date);

create table if not exists public.staff_members (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  role text,
  phone text,
  email text,
  is_active boolean not null default true,
  business_hours jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_members_establishment_active
  on public.staff_members (establishment_id, is_active, name);

create table if not exists public.staff_services (
  staff_id uuid not null references public.staff_members(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_id, service_id)
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  establishment_id uuid references public.establishments(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  channel text not null default 'panel'
    check (channel in ('panel', 'whatsapp', 'email', 'push')),
  title text not null,
  body text,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'archived')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_notifications_recipient_status
  on public.notifications (recipient_profile_id, status, created_at desc);

create index if not exists idx_notifications_establishment_created
  on public.notifications (establishment_id, created_at desc);

create table if not exists public.whatsapp_messages (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid references public.establishments(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  recipient_phone text not null,
  recipient_role text not null
    check (recipient_role in ('owner', 'customer', 'staff')),
  template_key text not null,
  message_body text not null,
  provider text,
  provider_message_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
  error_message text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_messages_status_schedule
  on public.whatsapp_messages (status, scheduled_for);

create index if not exists idx_whatsapp_messages_appointment
  on public.whatsapp_messages (appointment_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  provider text,
  method text check (method in ('pix', 'card', 'cash', 'other')),
  amount numeric(10, 2) not null default 0,
  currency text not null default 'BRL',
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled')),
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_establishment_status
  on public.payments (establishment_id, status, created_at desc);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'appointments'
      and constraint_name = 'appointments_staff_id_fkey'
  ) then
    alter table public.appointments
      add constraint appointments_staff_id_fkey
      foreign key (staff_id) references public.staff_members(id) on delete set null;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'appointments'
      and constraint_name = 'appointments_payment_id_fkey'
  ) then
    alter table public.appointments
      add constraint appointments_payment_id_fkey
      foreign key (payment_id) references public.payments(id) on delete set null;
  end if;
end $$;

alter table public.establishment_schedule_exceptions enable row level security;
alter table public.establishment_schedule_exceptions force row level security;
alter table public.staff_members enable row level security;
alter table public.staff_members force row level security;
alter table public.staff_services enable row level security;
alter table public.staff_services force row level security;
alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_messages force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;

drop policy if exists "schedule_exceptions_select_public" on public.establishment_schedule_exceptions;
create policy "schedule_exceptions_select_public"
  on public.establishment_schedule_exceptions for select to anon, authenticated
  using (true);

drop policy if exists "schedule_exceptions_admin_all" on public.establishment_schedule_exceptions;
create policy "schedule_exceptions_admin_all"
  on public.establishment_schedule_exceptions for all to authenticated
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

drop policy if exists "staff_members_select_public" on public.staff_members;
create policy "staff_members_select_public"
  on public.staff_members for select to anon, authenticated
  using (is_active = true);

drop policy if exists "staff_members_admin_all" on public.staff_members;
create policy "staff_members_admin_all"
  on public.staff_members for all to authenticated
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

drop policy if exists "staff_services_select_public" on public.staff_services;
create policy "staff_services_select_public"
  on public.staff_services for select to anon, authenticated
  using (true);

drop policy if exists "staff_services_admin_all" on public.staff_services;
create policy "staff_services_admin_all"
  on public.staff_services for all to authenticated
  using (
    staff_id in (
      select sm.id
      from public.staff_members sm
      join public.establishments e on e.id = sm.establishment_id
      where e.admin_id = auth.uid()
    )
  )
  with check (
    staff_id in (
      select sm.id
      from public.staff_members sm
      join public.establishments e on e.id = sm.establishment_id
      where e.admin_id = auth.uid()
    )
  );

drop policy if exists "notifications_select_recipient_or_owner" on public.notifications;
create policy "notifications_select_recipient_or_owner"
  on public.notifications for select to authenticated
  using (
    recipient_profile_id = auth.uid()
    or establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "notifications_update_recipient_or_owner" on public.notifications;
create policy "notifications_update_recipient_or_owner"
  on public.notifications for update to authenticated
  using (
    recipient_profile_id = auth.uid()
    or establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "whatsapp_messages_select_owner" on public.whatsapp_messages;
create policy "whatsapp_messages_select_owner"
  on public.whatsapp_messages for select to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "payments_select_owner_or_customer" on public.payments;
create policy "payments_select_owner_or_customer"
  on public.payments for select to authenticated
  using (
    customer_id = auth.uid()
    or establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "service_catalog_super_admin_all" on public.service_catalog;
create policy "service_catalog_super_admin_all"
  on public.service_catalog for all to authenticated
  using (
    exists (
      select 1
      from public.super_admins sa
      where sa.email = auth.jwt()->>'email'
    )
  )
  with check (
    exists (
      select 1
      from public.super_admins sa
      where sa.email = auth.jwt()->>'email'
    )
  );

drop policy if exists "service_suggestions_super_admin_all" on public.service_suggestions;
create policy "service_suggestions_super_admin_all"
  on public.service_suggestions for all to authenticated
  using (
    exists (
      select 1
      from public.super_admins sa
      where sa.email = auth.jwt()->>'email'
    )
  )
  with check (
    exists (
      select 1
      from public.super_admins sa
      where sa.email = auth.jwt()->>'email'
    )
  );
