-- supabase/migrations/20240101000003_salon_features.sql
-- Salon-specific fields: service menu details, bundled appointment items,
-- customer contact data, availability protection, and reminder tracking.

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS reminder_hours_before INT NOT NULL DEFAULT 12
    CHECK (reminder_hours_before BETWEEN 1 AND 72);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 30
    CHECK (duration_minutes BETWEEN 10 AND 480),
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Saúde e beleza',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_duration_minutes INT NOT NULL DEFAULT 30
    CHECK (total_duration_minutes BETWEEN 10 AND 720),
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_customer_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.appointment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name TEXT NOT NULL,
  price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'variable')),
  price NUMERIC(10, 2),
  duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 10 AND 480),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_establishment_active_category
  ON public.services (establishment_id, is_active, category, name);

CREATE INDEX IF NOT EXISTS idx_appointments_establishment_status_time
  ON public.appointments (establishment_id, status, scheduled_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active_slot
  ON public.appointments (establishment_id, scheduled_at)
  WHERE status IN ('pending', 'confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_appointment_items_appointment_id
  ON public.appointment_items (appointment_id);

ALTER TABLE public.appointment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_items_select_customer" ON public.appointment_items;
CREATE POLICY "appointment_items_select_customer"
  ON public.appointment_items FOR SELECT TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "appointment_items_select_admin" ON public.appointment_items;
CREATE POLICY "appointment_items_select_admin"
  ON public.appointment_items FOR SELECT TO authenticated
  USING (
    appointment_id IN (
      SELECT a.id
      FROM public.appointments a
      JOIN public.establishments e ON e.id = a.establishment_id
      WHERE e.admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "appointment_items_insert_customer" ON public.appointment_items;
CREATE POLICY "appointment_items_insert_customer"
  ON public.appointment_items FOR INSERT TO authenticated
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "appointment_items_delete_admin" ON public.appointment_items;
CREATE POLICY "appointment_items_delete_admin"
  ON public.appointment_items FOR DELETE TO authenticated
  USING (
    appointment_id IN (
      SELECT a.id
      FROM public.appointments a
      JOIN public.establishments e ON e.id = a.establishment_id
      WHERE e.admin_id = auth.uid()
    )
  );
