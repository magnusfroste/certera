-- Campaign attribution for page views.
--
-- Driving traffic needs to show which channel works. Referrer hosts alone do
-- not: LinkedIn's and most mail apps strip the referrer. The beacon now sends
-- the campaign tag of the landing URL (utm_source, plus utm_campaign when
-- present, or ?ref=) on the first view of a visit. The track function keeps
-- only a short lowercase tag ([a-z0-9._-], e.g. "linkedin/launch-nov"), never
-- the query string itself, so no personal data can arrive through it.

ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS source text;
