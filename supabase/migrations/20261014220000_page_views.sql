-- First-party, cookieless traffic measurement for the ops-mcp get_traffic tool.
--
-- Visitor numbers previously existed only inside Lovable's hosted analytics,
-- which is readable solely through Lovable's OAuth-gated API — out of reach for
-- an edge function, and so for any agent operating the site through ops-mcp.
--
-- Privacy model (same idea as Plausible): no IP address and no cookie is ever
-- stored. A visitor is identified only by
--   sha256(daily_salt || ip || user_agent), truncated
-- where daily_salt is random, lives in traffic_salts, and is deleted once its
-- day is over. After that the hash cannot be recomputed or linked back to a
-- person, which also means visitors are only countable within a single day.

CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  -- Hostname of the referring site only (never the full URL); null for direct
  -- visits and for internal navigation.
  referrer_host text,
  device text NOT NULL DEFAULT 'desktop',  -- 'desktop' | 'mobile' | 'tablet'
  -- Populated only when the edge runtime supplies a country header.
  country text,
  visitor_hash text NOT NULL,
  -- Crawlers are recorded rather than dropped, so their volume stays visible,
  -- but get_traffic excludes them by default.
  is_bot boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);

CREATE TABLE IF NOT EXISTS public.traffic_salts (
  day date PRIMARY KEY,
  salt text NOT NULL
);

GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.traffic_salts TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_salts ENABLE ROW LEVEL SECURITY;

-- No RLS policies on purpose: only the service role (the track and ops-mcp edge
-- functions) may touch either table. Browsers never write here directly — the
-- public track function does, so it can hash and classify server-side and the
-- salt is never exposed.
