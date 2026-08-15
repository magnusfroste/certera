CREATE TABLE IF NOT EXISTS public.generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  phase text NOT NULL DEFAULT 'generate',
  fell_back boolean NOT NULL DEFAULT false,
  succeeded boolean NOT NULL DEFAULT true,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS generation_usage_created_at_idx
  ON public.generation_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS generation_usage_provider_model_idx
  ON public.generation_usage (provider, model, created_at DESC);

GRANT ALL ON public.generation_usage TO service_role;

ALTER TABLE public.generation_usage ENABLE ROW LEVEL SECURITY;

-- No RLS policies on purpose: only the service role (edge functions, and the
-- ops-mcp reporting surface) may read or write this table. It is operational
-- telemetry, not user-facing data.