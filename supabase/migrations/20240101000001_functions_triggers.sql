-- supabase/migrations/20240101000001_functions_triggers.sql
-- Task 3: SECURITY DEFINER helper functions and triggers.
-- Depends on tables created in Task 2 (20240101000000_schema.sql).

-- ─── SECURITY DEFINER HELPERS ────────────────────────────────────────────────
-- These bypass RLS to avoid circular references in appointment INSERT policies.

CREATE OR REPLACE FUNCTION public.count_open_appointments(p_customer_id UUID)
RETURNS INT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.appointments
  WHERE customer_id = p_customer_id
    AND status IN ('pending', 'confirmed');
$$;

CREATE OR REPLACE FUNCTION public.count_no_show_appointments(p_customer_id UUID)
RETURNS INT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.appointments
  WHERE customer_id = p_customer_id
    AND status = 'no_show';
$$;

CREATE OR REPLACE FUNCTION public.is_establishment_blocked(p_establishment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_blocked FROM public.establishments WHERE id = p_establishment_id),
    TRUE  -- treat unknown establishment as blocked (fail-safe)
  );
$$;

-- ─── ONBOARDING TRIGGER ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_establishment_id UUID;
  v_role             TEXT := 'customer';
BEGIN
  SELECT id INTO v_establishment_id
  FROM public.establishments
  WHERE owner_email = NEW.email
  LIMIT 1;

  IF v_establishment_id IS NOT NULL THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, role, name, phone, email, avatar_url)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF v_establishment_id IS NOT NULL THEN
    UPDATE public.establishments
    SET admin_id = NEW.id
    WHERE id = v_establishment_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── APPOINTMENT ENFORCEMENT TRIGGER ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_appointment_rules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent rescheduling when establishment is blocked
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    IF public.is_establishment_blocked(NEW.establishment_id) THEN
      RAISE EXCEPTION 'Cannot reschedule appointments for a blocked establishment'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Prevent reverting ANY terminal status (no_show, completed, cancelled)
  IF OLD.status IN ('no_show', 'completed', 'cancelled') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Terminal status "%" cannot be changed', OLD.status
      USING ERRCODE = 'P0002';
  END IF;

  -- Enforce valid status transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled', 'pending') THEN
    RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status
      USING ERRCODE = 'P0003';
  END IF;
  IF OLD.status = 'confirmed' AND NEW.status NOT IN ('checked_in', 'completed', 'cancelled', 'no_show', 'confirmed') THEN
    RAISE EXCEPTION 'Invalid transition from confirmed to %', NEW.status
      USING ERRCODE = 'P0003';
  END IF;
  IF OLD.status = 'checked_in' AND NEW.status NOT IN ('completed', 'no_show', 'checked_in') THEN
    RAISE EXCEPTION 'Invalid transition from checked_in to %', NEW.status
      USING ERRCODE = 'P0003';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER enforce_appointment_rules_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE PROCEDURE public.enforce_appointment_rules();
