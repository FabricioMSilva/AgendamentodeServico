-- supabase/migrations/20240101000000_schema.sql
-- Task 2: Initial schema — tables, constraints, indexes, and RLS enablement.
-- No policies are defined here; those are added in Task 3.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.super_admins (
  email TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('admin', 'customer')) DEFAULT 'customer',
  name        TEXT,
  email       TEXT        NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.establishments (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id           UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_email        TEXT        NOT NULL,
  slug               TEXT        NOT NULL UNIQUE,
  name               TEXT        NOT NULL,
  address            TEXT,
  contact            TEXT,
  logo_url           TEXT,
  business_hours     JSONB       NOT NULL DEFAULT '{}',
  slots_per_schedule INT         NOT NULL DEFAULT 10 CHECK (slots_per_schedule > 0),
  is_blocked         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_establishments_owner_email
  ON public.establishments (owner_email);

CREATE TABLE IF NOT EXISTS public.services (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID        NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  price_type       TEXT        NOT NULL CHECK (price_type IN ('fixed', 'variable')),
  price            NUMERIC(10, 2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  establishment_id UUID        NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  service_id       UUID        NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_status
  ON public.appointments (customer_id, status);

-- ─── ENABLE RLS (Zero-Trust: deny all by default) ────────────────────────────

ALTER TABLE public.super_admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (belt-and-suspenders)
ALTER TABLE public.super_admins    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.establishments  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.services        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    FORCE ROW LEVEL SECURITY;
