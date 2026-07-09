CREATE TABLE IF NOT EXISTS public.login_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_codes_phone_idx
  ON public.login_codes (phone);

CREATE INDEX IF NOT EXISTS login_codes_expires_at_idx
  ON public.login_codes (expires_at);

ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;
