# Integrations

Ready-made apps that put certera's certificate API (`https://api.certera.ink`,
documented at https://www.certera.ink/developers) inside automation tools.

- [`zapier/`](zapier/) — the Zapier app (Zapier Platform CLI project).
- [`make/`](make/) — the Make (Integromat) custom app, as definition files.

Both use the same four things: connect with an API key (checked against
`GET /v1/me`), **Issue Certificate** (`POST /v1/certificates`, with a dropdown
of the account's designs from `GET /v1/templates`), **New Certificate**
(polls `GET /v1/certificates`) and a lookup by id.

Neither is needed to use certera from those tools today: "Webhooks by Zapier"
and Make's "HTTP" module can call the API directly.
