-- Stop signed_diplomas from being readable in bulk.
--
-- The policy "Anyone can verify diplomas" was `FOR SELECT USING (true)`, so
-- anyone holding the public anon key could list every signed diploma —
-- recipients' names, institutions, the issuing user's id — with one request.
-- It also leaked in the app: the signed-in "my diplomas" list (/signed) read
-- the table without filtering on the owner, so every user saw everyone's.
--
-- What the public pages actually need is to look up ONE diploma whose id they
-- already hold (/diploma/:id, /embed/:id, /verify/:id). That is what
-- get_public_diploma provides: exactly one row, by id, and only the columns
-- those pages render — not issuer_id, signature, id or verification_url.
-- Verification works exactly as before; enumerating the registry does not.

DROP POLICY IF EXISTS "Anyone can verify diplomas" ON public.signed_diplomas;

-- The admin dashboard lists every diploma. It only worked through the policy
-- removed above, so it gets its own.
DROP POLICY IF EXISTS "Admins can view all diplomas" ON public.signed_diplomas;
CREATE POLICY "Admins can view all diplomas"
  ON public.signed_diplomas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Unchanged and still in place: "Users can view their own diplomas" (SELECT,
-- auth.uid() = issuer_id) and "Users can create diplomas" (INSERT).

CREATE OR REPLACE FUNCTION public.get_public_diploma(p_blockchain_id text)
RETURNS TABLE (
  blockchain_id text,
  recipient_name text,
  institution_name text,
  diploma_html text,
  diploma_css text,
  content_hash text,
  diplomator_seal text,
  diploma_url text,
  created_at timestamptz
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
         d.content_hash, d.diplomator_seal, d.diploma_url, d.created_at
    FROM public.signed_diplomas d
   WHERE d.blockchain_id = btrim(p_blockchain_id)
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_diploma(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_diploma(text) TO anon, authenticated, service_role;
