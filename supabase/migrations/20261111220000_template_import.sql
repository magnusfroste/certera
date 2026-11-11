-- Templates brought in through the API have no DSL to read the issuer's name
-- from, so a design can carry it itself.
ALTER TABLE public.diploma_sessions ADD COLUMN IF NOT EXISTS institution_name text;
