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

CREATE UNIQUE INDEX IF NOT EXISTS ops_tokens_token_hash_idx ON public.ops_tokens (token_hash);

GRANT SELECT, INSERT, DELETE ON public.ops_tokens TO authenticated;
GRANT ALL ON public.ops_tokens TO service_role;

ALTER TABLE public.ops_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ops tokens"
  ON public.ops_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create ops tokens"
  ON public.ops_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke ops tokens"
  ON public.ops_tokens FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));