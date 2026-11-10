# api.certera.ink

A Cloudflare Worker that gives the certera public API (the `api` Supabase edge
function) its public address: `https://api.certera.ink/v1/…`.

It forwards requests unchanged and holds no secrets. The Supabase address keeps
working, so deploying or removing this Worker never breaks an integration that
uses the old URL.

## Deploy

**Dashboard:** Workers & Pages → Create → Worker → name it `certera-api` →
replace the code with `src/index.js` → Deploy. Then Settings → Domains &
Routes → Add → Custom Domain → `api.certera.ink`.

**CLI:** `npx wrangler deploy` in this directory (needs a Cloudflare API token
with *Workers Scripts: Edit* and, for the custom domain, *Zone: Workers Routes: Edit*).

## Check

```
curl -i https://api.certera.ink/v1/templates          # 401 with a JSON error
curl -i https://api.certera.ink/                      # 302 → /developers
```
