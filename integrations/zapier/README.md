# certera for Zapier

A Zapier Platform CLI app for the certera certificate API.

| | |
|---|---|
| Connection | API key (`cert_…`), tested with `GET /v1/me`; the connection is labelled with the account's email |
| Action **Issue Certificate** | Design (dropdown), Recipient Name, optional Issuer Name, optional Unique Reference (sent as `Idempotency-Key`, so a replayed Zap never issues twice) |
| Trigger **New Certificate** | Polls `GET /v1/certificates`; fires for certificates issued in the app or through the API |
| Search **Find Certificate** | By certificate id |

## Develop

```bash
npm install
npm test                                   # runs against a local stand-in for the API
npx zapier-platform-cli validate           # schema + style checks
```

`CERTERA_API_BASE` overrides the API base URL (the tests use it).

## Publish

Needs a Zapier account (free is enough).

```bash
npm install -g zapier-platform-cli
zapier login
zapier register "certera"     # once; writes .zapierapprc (git-ignored)
zapier push
```

After `zapier push` the app is private: usable in your own Zaps and by anyone
you invite (`zapier users:add you@example.com 1.0.0`, or a share link from the
developer dashboard). Listing it in Zapier's public directory is a separate
review started from the developer dashboard; Zapier asks for a logo, a
description, a test account and some live users first.
