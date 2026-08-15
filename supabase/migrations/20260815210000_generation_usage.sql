-- Per-generation token accounting.
--
-- The generate-diploma function called providers without recording anything, so
-- there was no way to answer "how many tokens did we burn, on which model, and
-- what did it cost?" — the provider responses carry a usage block that was
-- simply discarded. This table captures it going forward.
--
-- One row per provider call, including calls that failed over: the fallback
-- chain can burn tokens on a provider that then errors, and that spend is real.
CREATE TABLE IF NOT EXISTS public.generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  -- 'generate' | 'iterate' | 'repair' — which stage of the request spent this.
  phase text NOT NULL DEFAULT 'generate',
  -- Whether this call came from the fallback chain rather than the configured
  -- provider, so cost caused by outages can be told apart from normal spend.
  fell_back boolean NOT NULL DEFAULT false,
  succeeded boolean NOT NULL DEFAULT true,
  -- Null for guests; generations are not attributed to an identifiable person
  -- beyond the account that made them.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest boolean NOT NULL DEFAULT false
);

-- Reporting is always "recent first, optionally per provider/model".
CREATE INDEX IF NOT EXISTS generation_usage_created_at_idx
  ON public.generation_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS generation_usage_provider_model_idx
  ON public.generation_usage (provider, model, created_at DESC);

ALTER TABLE public.generation_usage ENABLE ROW LEVEL SECURITY;

-- No RLS policies on purpose: only the service role (edge functions, and the
-- ops-mcp reporting surface) may read or write this table. It is operational
-- telemetry, not user-facing data.
