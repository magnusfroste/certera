-- Operator-mintable API keys for the ops-mcp endpoint.
--
-- ops-mcp originally authenticated against a single OPS_MCP_TOKEN secret, which
-- meant creating or rotating a key required Supabase dashboard access, there was
-- no way to hand out more than one, and revoking one meant changing the secret
-- for everybody. These rows let an admin mint, name and revoke keys from /admin.
--
-- Only the SHA-256 hash is stored: a leaked database backup must not yield
-- working credentials. The plaintext is shown once, at creation, and never
-- again. `prefix` keeps the first few characters so a key can be recognised in
-- the list without being reconstructable.
CREATE TABLE IF NOT EXISTS public.ops_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Every request looks a key up by hash, so that lookup must be indexed.
CREATE UNIQUE INDEX IF NOT EXISTS ops_tokens_token_hash_idx ON public.ops_tokens (token_hash);

ALTER TABLE public.ops_tokens ENABLE ROW LEVEL SECURITY;

-- Admins manage keys from the app. The edge function uses the service role,
-- which bypasses RLS, so no policy is needed for verification itself.
--
-- Note the deliberate absence of an UPDATE policy: a key's hash and label are
-- immutable once minted, and revoking is a delete. That keeps "an admin edited
-- a key" out of the threat model entirely.
CREATE POLICY "Admins can view ops tokens"
  ON public.ops_tokens FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create ops tokens"
  ON public.ops_tokens FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke ops tokens"
  ON public.ops_tokens FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
