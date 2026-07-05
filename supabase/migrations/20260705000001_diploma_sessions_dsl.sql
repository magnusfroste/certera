-- Persist the structured DSL alongside the rendered HTML/CSS so that
-- iterations can modify the design via the DSL (staying inside the
-- design system) instead of free-form HTML/CSS editing.
ALTER TABLE public.diploma_sessions
  ADD COLUMN IF NOT EXISTS diploma_dsl jsonb;
