-- Public API: sign certificates from your own system with an API key.
--
-- api_keys: one row per key, storing only its SHA-256 (the key itself is shown
-- once in Profile). Users create, list and delete their own keys; the api edge
-- function looks a key up by hash with the service role.
--
-- api_idempotency: webhooks are retried and clients repeat requests; every
-- signature costs a Hedera fee and produces a real certificate, so a repeated
-- request (same Idempotency-Key, or the same webhook body) must return the
-- first certificate instead of signing a second. Only the api function
-- touches this table.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  prefix text NOT NULL CHECK (char_length(prefix) <= 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON public.api_keys (user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" ON public.api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys" ON public.api_keys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys" ON public.api_keys
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.api_keys FROM anon, authenticated;
-- Column-level: a client can never read a hash back or forge last_used_at.
GRANT SELECT (id, user_id, label, prefix, created_at, last_used_at) ON public.api_keys TO authenticated;
GRANT INSERT (user_id, label, token_hash, prefix) ON public.api_keys TO authenticated;
GRANT DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

CREATE TABLE IF NOT EXISTS public.api_idempotency (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  idem_key text NOT NULL,
  diploma_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idem_key)
);
ALTER TABLE public.api_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_idempotency FROM anon, authenticated;
GRANT ALL ON public.api_idempotency TO service_role;
