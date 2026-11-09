-- Issuer domain: the organisation email domain that stands behind a diploma.
--
-- Until now anyone could type any institution name when signing, and the
-- public pages said "Authentic diploma" — which proved the diploma unchanged,
-- not who issued it. hedera-sign now derives the signer's confirmed email
-- domain (null for personal providers such as gmail.com, see
-- supabase/functions/_shared/issuerDomain.ts), writes it into the Hedera
-- message and records it in hedera_signatures. Here the database copies it
-- into signed_diplomas from that server-side record, exactly as it already
-- does with the seal, so a client can never claim a domain.

ALTER TABLE public.hedera_signatures ADD COLUMN IF NOT EXISTS issuer_domain text;
ALTER TABLE public.signed_diplomas ADD COLUMN IF NOT EXISTS issuer_domain text;

CREATE OR REPLACE FUNCTION public.verify_signed_diploma()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
  recorded jsonb;
  recorded_domain text;
begin
  if current_user in ('anon', 'authenticated') then
    if new.content_hash is distinct from
       encode(sha256(convert_to(coalesce(new.diploma_html, '') || coalesce(new.diploma_css, ''), 'UTF8')), 'hex') then
      raise exception 'content_hash matchar inte diplomets innehåll';
    end if;
    select seal, issuer_domain into recorded, recorded_domain
      from public.hedera_signatures
     where diploma_id = new.blockchain_id
       and issuer_id = new.issuer_id
       and content_hash = new.content_hash;
    if recorded is null then
      raise exception 'Diplomet har inte signerats på Hedera';
    end if;
    new.diplomator_seal := recorded::text;
    -- Whatever the client sent is replaced by the server-side record.
    new.issuer_domain := recorded_domain;
  end if;
  return new;
end;
$$;

-- The public lookup gains issuer_domain. Its return type changes, so it is
-- dropped and recreated (same body, same grants, one more column).
DROP FUNCTION IF EXISTS public.get_public_diploma(text);
CREATE FUNCTION public.get_public_diploma(p_blockchain_id text)
RETURNS TABLE (
  blockchain_id text,
  recipient_name text,
  institution_name text,
  diploma_html text,
  diploma_css text,
  content_hash text,
  diplomator_seal text,
  diploma_url text,
  created_at timestamptz,
  issuer_domain text
)
LANGUAGE sql
STABLE
-- Runs as the owner so it can read past RLS, which is why it returns only one
-- row by exact id and only public columns: the function is the whole access
-- rule for anonymous readers.
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.blockchain_id, d.recipient_name, d.institution_name, d.diploma_html, d.diploma_css,
         d.content_hash, d.diplomator_seal, d.diploma_url, d.created_at, d.issuer_domain
    FROM public.signed_diplomas d
   WHERE d.blockchain_id = btrim(p_blockchain_id)
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_diploma(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_diploma(text) TO anon, authenticated, service_role;
