-- DNS-verified issuer domains.
--
-- The issuer stamp so far came only from a confirmed work email. Many
-- issuers — a founder on Gmail who owns certera.ink, a school that signs from
-- a personal account — control a domain but have no mailbox there. They can
-- now prove control by publishing a TXT record:
--   _certera.<domain>  TXT  "certera-verify=<token>"
-- The issuer-domain edge function issues the token and checks the record over
-- DNS-over-HTTPS; hedera-sign then signs with that domain (see
-- supabase/functions/_shared/issuerDomain.ts).
--
-- One domain per account. Users may read their own row; every write goes
-- through the edge function (service role), so verified_at can only be set by
-- a successful DNS check.

CREATE TABLE IF NOT EXISTS public.issuer_domains (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  domain text NOT NULL,
  token text NOT NULL,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issuer_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own issuer domain" ON public.issuer_domains;
CREATE POLICY "Users can view their own issuer domain"
  ON public.issuer_domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.issuer_domains TO authenticated;
GRANT ALL ON public.issuer_domains TO service_role;
