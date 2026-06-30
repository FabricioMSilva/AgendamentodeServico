-- Appointment history ledger for owner dashboard analytics and audit trail.

create table if not exists public.appointment_events (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null
    check (event_type in (
      'created',
      'owner_confirmed',
      'owner_rejected',
      'customer_confirmed',
      'customer_declined',
      'completed',
      'cancelled',
      'no_show',
      'reminder_sent'
    )),
  status_from text,
  status_to text,
  amount numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointment_events_establishment_created
  on public.appointment_events (establishment_id, created_at desc);

create index if not exists idx_appointment_events_appointment_created
  on public.appointment_events (appointment_id, created_at desc);

alter table public.appointment_events enable row level security;
alter table public.appointment_events force row level security;

drop policy if exists "appointment_events_select_owner_or_customer" on public.appointment_events;
create policy "appointment_events_select_owner_or_customer"
  on public.appointment_events for select to authenticated
  using (
    actor_profile_id = auth.uid()
    or appointment_id in (
      select id from public.appointments where customer_id = auth.uid()
    )
    or establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );

drop policy if exists "appointment_events_insert_customer_or_owner" on public.appointment_events;
create policy "appointment_events_insert_customer_or_owner"
  on public.appointment_events for insert to authenticated
  with check (
    actor_profile_id = auth.uid()
    or appointment_id in (
      select id from public.appointments where customer_id = auth.uid()
    )
    or establishment_id in (
      select id from public.establishments where admin_id = auth.uid()
    )
  );
