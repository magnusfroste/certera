-- Server-side guest rate limiting for the generate-diploma edge function.
-- Guests were previously only limited by a localStorage counter in the client,
-- which is trivially bypassed.
CREATE TABLE IF NOT EXISTS public.guest_usage (
  ip_hash text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;

-- No RLS policies on purpose: only the service role (used by edge functions)
-- may read or write this table.
