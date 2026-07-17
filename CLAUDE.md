# CLAUDE.md

Guidance for working in this repo. Read before making changes.

## What this is

**certera.ink** (repo/package name: `diplomator`) — an AI diploma/certificate
generator with Hedera blockchain verification. Vite + React 18 + TypeScript SPA,
Tailwind + shadcn/ui, Supabase (Postgres + Auth + Edge Functions) backend.
Hosted on Lovable; the product URL is https://www.certera.ink.

## Commands

```bash
npm install
npm run dev       # Vite dev server (config binds host "::" / port 8080;
                  # this sandbox is IPv4-only, so launch with
                  # `npx vite --host 127.0.0.1 --port 5199 --strictPort`)
npm run build     # typecheck edge functions + vite build
npm run lint      # eslint — keep this at 0 errors
npm run preview   # preview a production build
npm run typecheck:functions  # tsc over supabase/functions/ (also part of build)
```

The functions typecheck exists because esbuild/vite leave unbound identifiers
as runtime globals — a missing import in an edge function once shipped as a
production `ReferenceError`. `tsconfig.functions.json` + the
`supabase/functions/deno-shim.d.ts` ambient shim (Deno global, `https:`/`npm:`
imports) let plain `tsc` catch that class of bug pre-merge.

There is **no test suite**. Verify changes by building, linting, and driving the
running app (see "Verifying" below). Keep `npm run build` and `npm run lint`
green before committing.

## Architecture

- `src/pages/` — routed pages (13 routes in `src/App.tsx`; lazy-loaded with a
  retry wrapper). Public pages: `/`, `/diploma/:id`, `/embed/:id`, `/verify/:id`.
  App pages gated by Supabase auth.
- `src/contexts/DiplomaContext.tsx` — the core state: current diploma
  `{html, css, dsl}`, chat messages, session persistence, and the undo history
  stack (`commitDesign`/`undoDesign`). Async work reads from refs to avoid stale
  closures — follow that pattern when adding state used in callbacks.
- `src/hooks/useGeneration.ts` — orchestrates generation; calls the edge function
  via `src/services/anthropicService.ts`.
- `supabase/functions/generate-diploma/` — the real generation logic. Renders a
  curated **DSL** (palettes, typography, compositions, seals…) to HTML/CSS
  server-side; iterations re-emit the DSL so designs stay on-template. Contains
  output escaping, contrast/length guardrails, and a multi-provider fallback
  chain. This file is large — read the section banners before editing.
- `supabase/functions/hedera-sign/` — signs to Hedera; requires auth.
- `src/integrations/supabase/` — generated client + types (`Tables<'…'>`).

Path alias: `@/` → `src/` (see `components.json` / `tsconfig`).

## Security invariants — do not regress

- **Never render stored/generated diploma HTML with `dangerouslySetInnerHTML`.**
  Use the sandboxed `DiplomaFrame` component (or a `sandbox` iframe). Stored
  diploma HTML is attacker-controllable.
- **Escape** all model/user text when building HTML in `generate-diploma`
  (`esc()`); validate colors as hex.
- **Trust the JWT, not the request body**, for auth in edge functions
  (guests are derived from token absence; guest rate limit is server-side).

## Deploy workflow (IMPORTANT — learned the hard way)

Lovable is connected to GitHub. After a PR merges to `main`:

- **Code sync + preview rebuild happen automatically** — Lovable's
  `latest_commit_sha` follows `main` and the `id-preview-…lovable.app` rebuilds.
- **Production is NOT published automatically.** `www.certera.ink` keeps serving
  the old bundle until you explicitly publish. Trigger the Lovable
  `deploy_project` tool (MCP) to publish, then confirm the served
  `assets/index-*.js` hash changed.
- **Edge functions and DB migrations only need action when the diff touched
  `supabase/functions/` or `supabase/migrations/`.** A frontend/docs-only PR
  needs only the `deploy_project` publish — no function redeploy, no migrations.
  When functions/migrations *did* change, deploy them (Lovable can run the
  migration + `supabase functions deploy`) before/with the frontend publish,
  since the client and backend must be compatible.

## Verifying (no test suite)

Drive the running app. Chromium is preinstalled at `/opt/pw-browsers/chromium`.
The sandbox's egress proxy (`$HTTPS_PROXY`) must relay Supabase calls: launch
Chromium normally and use Playwright `page.route('https://*.supabase.co/**', …)`
to proxy those requests through `undici`'s `ProxyAgent` with
`NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. Generation hits the **live**
deployed edge function, so it works end-to-end from a dev server.

## Env / secrets

- Frontend `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  (NOT `…ANON_KEY`), `VITE_SUPABASE_PROJECT_ID`.
- Edge-function secrets: `ANTHROPIC_API_KEY` (default provider) + optional
  `OPENAI_/GEMINI_/OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY` (URL scraping),
  `HEDERA_ACCOUNT_ID` / `HEDERA_PRIVATE_KEY` / `HEDERA_TOPIC_ID`.

## Conventions

- UI strings are English; keep dark-mode-safe colors (use theme tokens or
  `dark:` variants, not hardcoded `bg-white`/`text-blue-600`).
- Give icon-only buttons `aria-label`s.
- `src/components/ui/` is generated shadcn — don't hand-edit for features.
