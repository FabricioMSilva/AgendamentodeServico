-- Performance tuning for owner dashboard, booking availability, RLS lookups,
-- foreign keys, and automation queues.

-- Fast owner lookup used on every admin dashboard/action.
create index if not exists idx_establishments_admin_id
  on public.establishments (admin_id)
  where admin_id is not null;

-- Booking pages and agenda boards mostly need open/future appointments.
create index if not exists idx_appointments_open_establishment_time
  on public.appointments (establishment_id, scheduled_at)
  where status in ('pending', 'confirmed', 'checked_in');

-- Owner history/revenue dashboard filters completed appointments by period.
create index if not exists idx_appointments_completed_establishment_time
  on public.appointments (establishment_id, scheduled_at desc)
  where status = 'completed';

-- Customer guard functions only need open/no-show counts.
create index if not exists idx_appointments_customer_open
  on public.appointments (customer_id)
  where status in ('pending', 'confirmed');

create index if not exists idx_appointments_customer_no_show
  on public.appointments (customer_id)
  where status = 'no_show';

-- Foreign key lookup/cascade support that Postgres does not create automatically.
create index if not exists idx_appointments_service_id
  on public.appointments (service_id);

create index if not exists idx_appointments_staff_id
  on public.appointments (staff_id)
  where staff_id is not null;

create index if not exists idx_appointments_payment_id
  on public.appointments (payment_id)
  where payment_id is not null;

create index if not exists idx_appointments_owner_decision_by
  on public.appointments (owner_decision_by)
  where owner_decision_by is not null;

create index if not exists idx_appointment_items_service_id
  on public.appointment_items (service_id);

create index if not exists idx_staff_members_profile_id
  on public.staff_members (profile_id)
  where profile_id is not null;

create index if not exists idx_staff_services_service_id
  on public.staff_services (service_id);

create index if not exists idx_service_suggestions_establishment_created
  on public.service_suggestions (establishment_id, created_at desc);

create index if not exists idx_notifications_appointment_id
  on public.notifications (appointment_id)
  where appointment_id is not null;

create index if not exists idx_whatsapp_messages_establishment_created
  on public.whatsapp_messages (establishment_id, created_at desc)
  where establishment_id is not null;

create index if not exists idx_payments_appointment_id
  on public.payments (appointment_id)
  where appointment_id is not null;

create index if not exists idx_payments_customer_created
  on public.payments (customer_id, created_at desc)
  where customer_id is not null;

create index if not exists idx_appointment_events_actor_created
  on public.appointment_events (actor_profile_id, created_at desc)
  where actor_profile_id is not null;

-- These guards only compare against small limits, so stop scanning as soon as
-- the threshold can be decided.
create or replace function public.count_open_appointments(p_customer_id uuid)
returns int
language sql security definer stable
set search_path = public
as $$
  select count(*)::int
  from (
    select 1
    from public.appointments
    where customer_id = p_customer_id
      and status in ('pending', 'confirmed')
    limit 3
  ) open_appointments;
$$;

create or replace function public.count_no_show_appointments(p_customer_id uuid)
returns int
language sql security definer stable
set search_path = public
as $$
  select count(*)::int
  from (
    select 1
    from public.appointments
    where customer_id = p_customer_id
      and status = 'no_show'
    limit 3
  ) no_show_appointments;
$$;

-- High-traffic RLS policies: wrap auth.uid() so Postgres evaluates it once
-- per statement instead of per row.
drop policy if exists "appointments_select_customer" on public.appointments;
create policy "appointments_select_customer"
  on public.appointments for select to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists "appointments_insert_customer" on public.appointments;
create policy "appointments_insert_customer"
  on public.appointments for insert to authenticated
  with check (
    (select auth.uid()) = customer_id
    and not public.is_establishment_blocked(establishment_id)
    and public.count_no_show_appointments((select auth.uid())) <= 2
    and public.count_open_appointments((select auth.uid())) < 3
  );

drop policy if exists "appointments_update_customer_checkin" on public.appointments;
create policy "appointments_update_customer_checkin"
  on public.appointments for update to authenticated
  using (
    customer_id = (select auth.uid())
    and status in ('pending', 'confirmed')
  )
  with check (
    customer_id = (select auth.uid())
    and status = 'checked_in'
  );

drop policy if exists "appointments_select_admin" on public.appointments;
create policy "appointments_select_admin"
  on public.appointments for select to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = (select auth.uid())
    )
  );

drop policy if exists "appointments_update_admin" on public.appointments;
create policy "appointments_update_admin"
  on public.appointments for update to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = (select auth.uid())
    )
  )
  with check (
    establishment_id in (
      select id from public.establishments where admin_id = (select auth.uid())
    )
  );

drop policy if exists "appointments_delete_admin" on public.appointments;
create policy "appointments_delete_admin"
  on public.appointments for delete to authenticated
  using (
    establishment_id in (
      select id from public.establishments where admin_id = (select auth.uid())
    )
  );

drop policy if exists "appointment_events_select_owner_or_customer" on public.appointment_events;
create policy "appointment_events_select_owner_or_customer"
  on public.appointment_events for select to authenticated
  using (
    actor_profile_id = (select auth.uid())
    or appointment_id in (
      select id from public.appointments where customer_id = (select auth.uid())
    )
    or establishment_id in (
      select id from public.establishments where admin_id = (select auth.uid())
    )
  );

drop policy if exists "appointment_events_insert_customer_or_owner" on public.appointment_events;
create policy "appointment_events_insert_customer_or_owner"
  on public.appointment_events for insert to authenticated
  with check (
    actor_profile_id = (select auth.uid())
    or appointment_id in (
      select id from public.appointments where customer_id = (select auth.uid())
    )
    or establishment_id in (
      select id from public.establishments where admin_id = (select auth.uid())
    )
  );
