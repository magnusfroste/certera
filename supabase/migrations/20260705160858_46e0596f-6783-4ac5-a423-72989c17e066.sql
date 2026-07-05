CREATE TABLE IF NOT EXISTS public.guest_usage (
  ip_hash text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.guest_usage TO service_role;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.diploma_sessions
  ADD COLUMN IF NOT EXISTS diploma_dsl jsonb;