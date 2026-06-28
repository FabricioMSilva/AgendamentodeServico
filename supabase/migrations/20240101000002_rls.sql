-- supabase/migrations/20240101000002_rls.sql
-- Task 3: RLS policies for all tables and Storage bucket setup.
-- Depends on tables from Task 2 and functions from Task 3 (20240101000001).
-- Uses DROP POLICY IF EXISTS before CREATE POLICY for idempotency.

-- ─── super_admins ─────────────────────────────────────────────────────────────
-- No user-facing policies. RLS is enabled (Task 2) with no permissive policies.
-- Effect: authenticated users see nothing. Only service_role bypasses RLS.

-- ─── profiles ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admin sees profiles of customers who booked at their establishment
DROP POLICY IF EXISTS "profiles_select_admin_customers" ON public.profiles;
CREATE POLICY "profiles_select_admin_customers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.establishments e ON e.id = a.establishment_id
      WHERE a.customer_id = profiles.id
        AND e.admin_id = auth.uid()
    )
  );

-- User can update own profile; role column cannot be escalated
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ─── establishments ──────────────────────────────────────────────────────────

-- Public read (required for /[slug] booking page and blocked-screen check)
DROP POLICY IF EXISTS "establishments_select_public" ON public.establishments;
CREATE POLICY "establishments_select_public"
  ON public.establishments FOR SELECT TO anon, authenticated
  USING (TRUE);

-- No INSERT policy: INSERT is only done by service_role via consultant Server Action.
-- No DELETE policy: only service_role.

-- Admin updates only their own establishment (IDOR prevention)
DROP POLICY IF EXISTS "establishments_update_own_admin" ON public.establishments;
CREATE POLICY "establishments_update_own_admin"
  ON public.establishments FOR UPDATE TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- ─── services ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "services_select_public" ON public.services;
CREATE POLICY "services_select_public"
  ON public.services FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "services_insert_admin" ON public.services;
CREATE POLICY "services_insert_admin"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (
    establishment_id IN (
      SELECT id FROM public.establishments WHERE admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "services_update_admin" ON public.services;
CREATE POLICY "services_update_admin"
  ON public.services FOR UPDATE TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "services_delete_admin" ON public.services;
CREATE POLICY "services_delete_admin"
  ON public.services FOR DELETE TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  );

-- ─── appointments ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "appointments_select_customer" ON public.appointments;
CREATE POLICY "appointments_select_customer"
  ON public.appointments FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "appointments_select_admin" ON public.appointments;
CREATE POLICY "appointments_select_admin"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  );

-- Customer INSERT: anti-abuse via SECURITY DEFINER functions (avoids circular RLS)
DROP POLICY IF EXISTS "appointments_insert_customer" ON public.appointments;
CREATE POLICY "appointments_insert_customer"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND NOT public.is_establishment_blocked(establishment_id)
    AND public.count_no_show_appointments(auth.uid()) <= 2   -- >2 no_shows = globally blocked
    AND public.count_open_appointments(auth.uid()) < 3        -- max 3 simultaneous open
  );

-- Customer UPDATE: USING filters to non-terminal rows (checked_in/completed/cancelled/no_show excluded)
-- WITH CHECK allows ONLY the → checked_in transition
-- The enforce_appointment_rules trigger additionally blocks terminal status revert
DROP POLICY IF EXISTS "appointments_update_customer_checkin" ON public.appointments;
CREATE POLICY "appointments_update_customer_checkin"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'checked_in'
  );

-- Admin UPDATE: full status management on their establishment's appointments.
-- Reschedule-on-blocked is enforced by trigger, not policy (policy can't compare NEW.scheduled_at vs OLD).
-- WITH CHECK prevents moving appointment to a different establishment (IDOR).
DROP POLICY IF EXISTS "appointments_update_admin" ON public.appointments;
CREATE POLICY "appointments_update_admin"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  );

DROP POLICY IF EXISTS "appointments_delete_admin" ON public.appointments;
CREATE POLICY "appointments_delete_admin"
  ON public.appointments FOR DELETE TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE admin_id = auth.uid())
  );

-- ─── Storage: logos bucket ────────────────────────────────────────────────────
-- Path: logos/{establishment_id}/{filename}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos', 'logos', TRUE,
  2097152,  -- 2MB hard limit (2 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "logos_insert_admin" ON storage.objects;
CREATE POLICY "logos_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.establishments WHERE admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "logos_select_public" ON storage.objects;
CREATE POLICY "logos_select_public"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_update_admin" ON storage.objects;
CREATE POLICY "logos_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.establishments WHERE admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "logos_delete_admin" ON storage.objects;
CREATE POLICY "logos_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.establishments WHERE admin_id = auth.uid()
    )
  );
