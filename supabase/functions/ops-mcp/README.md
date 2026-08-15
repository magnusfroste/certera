# ops-mcp — operating certera.ink over MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server that answers
the operator's daily questions — *is the site being used, is anyone signing up,
are diplomas being issued, what are we spending, and are we out of provider
credits?* — without opening a dashboard. Reporting is read-only; the single
exception is switching the active AI provider.

## Connecting

The endpoint speaks **Streamable HTTP** (JSON-RPC 2.0 over a single POST) and
authenticates with a bearer token, so any MCP client can use it:

```json
{
  "mcpServers": {
    "certera-ops": {
      "type": "http",
      "url": "https://jiokwdsnmgmcjoyxrwax.supabase.co/functions/v1/ops-mcp",
      "headers": { "Authorization": "Bearer <your-ops-key>" }
    }
  }
}
```

## Keys

Mint keys in the app: **/admin → Ops keys**. Give the key a name, copy it once
(it is shown exactly once), and paste it into the client config above. The list
shows each key's prefix, when it was created and when it was last used, and a
key can be revoked from there — no redeploy, no Supabase dashboard.

Only a SHA-256 hash of the key is stored, so a leaked database backup yields no
working credentials.

There is also an optional `OPS_MCP_TOKEN` Supabase secret that is accepted as
**break-glass** access, for when the database is unreachable or every key has
been revoked by mistake. Leave it unset if you do not want it, and the minted
keys are the only way in.

With neither a valid minted key nor the break-glass secret, the endpoint returns
401 — it fails closed on purpose.

## Setup

1. Run the migrations (`ops_tokens`, `generation_usage`).
2. Deploy `ops-mcp` (`supabase functions deploy ops-mcp`, or let Lovable deploy
   it), and redeploy `generate-diploma` so token accounting starts recording.
3. Mint a key in /admin.

The function also needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which
Supabase injects automatically.

`verify_jwt` is `false` for this function (see `supabase/config.toml`) because
MCP clients present their own bearer token rather than a Supabase user JWT. That
makes the key check the *only* gate — treat keys as production credentials.

## Tools

| Tool | Answers |
|---|---|
| `get_overview` | Headline health: user/session/diploma totals with 24h & 7d deltas, guest volume. Start here. |
| `get_signups` | Daily new users over N days + the most recent sign-ups. |
| `get_signins` | Daily active users by last sign-in, and how many never signed in. |
| `get_diploma_volume` | Daily sessions created vs diplomas signed, plus top institutions. |
| `list_recent_diplomas` | Most recently signed diplomas (recipient, institution, blockchain id). |
| `get_guest_usage` | Guest rate-limit state: generations in the active 24h windows, IPs at the cap. |
| `check_providers` | Live provider health — the credit alarm. See below. |
| `get_settings` | Current `app_settings` key/value configuration. |
| `get_token_usage` | Tokens and estimated cost per day and per provider/model, including spend wasted on failed calls and fallback. |
| `list_models` | Providers and models the app can use, their estimated prices, which key is configured, and what is active now. |
| `set_ai_provider` | **Write.** Switch the provider/model used for all generations. |

## What `check_providers` can and cannot tell you

Providers differ in what they expose, so the tool is explicit about which kind
of answer you are getting:

- **OpenRouter and Firecrawl publish a real balance.** These report actual
  remaining credits, and cost nothing to check.
- **Anthropic and OpenAI do not expose a balance to a normal API key.** An
  exhausted balance only appears as an error on a real call, so `deep: true`
  (the default) sends a 1-token request and classifies the response. A key-only
  check (`deep: false`) validates the key but *cannot* detect empty credits.
- Reading Anthropic spend as a number would require an organisation **admin**
  key (`sk-ant-admin…`) and the usage/cost report endpoints. That is not wired
  up; the failure-signal above is used instead.

Statuses are `ok`, `no_key`, `out_of_credits`, `rate_limited`, `auth_failed`
and `error`. Because generation falls back across providers, the report
separates *this provider is broke* from *generation is down*:
`generationHealthy` is false only when no LLM provider is usable.

## Changing provider and model

`set_ai_provider` writes `app_settings.ai_provider`, the same row the admin UI
edits and the one `generate-diploma` reads per request — so a change takes
effect on the next generation, with no redeploy.

It refuses rather than risks breaking generation:

- unknown provider → rejected;
- provider whose API key is not configured → rejected, since it could not serve
  a single request;
- by default the exact provider+model is verified with a real 1-token call
  **before** saving, so a typo'd or retired model id cannot take production
  down. Pass `verify: false` only to skip that (e.g. the provider is briefly
  unreachable but known good);
- the save is read back, because an update matching no row otherwise reports
  success and would leave you believing the switch happened.

Models outside the built-in catalogue are allowed — OpenRouter alone exposes
hundreds — but they have no price entry, so their cost is reported as 0 and
`get_token_usage` says how many calls that affected.

## Token accounting

`get_token_usage` reads `generation_usage`, written by `generate-diploma` on
every provider call. Note:

- it only covers generations made **after** that instrumentation is deployed —
  earlier spend was never recorded and cannot be reconstructed;
- failed calls are recorded too (with `succeeded: false`), because a provider
  that errors after consuming input tokens still costs money — surfaced as
  `wastedTokens`;
- calls that came from the fallback chain are flagged, so spend caused by an
  outage can be told apart from normal usage;
- **costs are estimates** from a price table in the function, not provider
  billing. Treat them as planning figures and reconcile against the provider's
  own invoice.

## Scope

Apart from `set_ai_provider`, every tool is read-only, and none of them read or
modify diploma content or user records beyond the aggregate counts shown.

Page views and traffic sources are not stored by the app; those live in
Lovable's project analytics.
