# certera for Make

Definition files for a Make custom app. Make has no upload for a whole app, so
each file is pasted into the matching tab of the app editor
(Make → **Custom apps** → **Create a new app**).

| File | Where it goes |
|---|---|
| `base.json` | App → **Base** |
| `connection/communication.json`, `connection/parameters.json` | Connections → new connection of type **API key** → **Communication** / **Parameters** |
| `rpcs/listTemplates.json` | Remote procedures → new RPC named `listTemplates` → **Communication** |
| `modules/issueCertificate/*` | Modules → new **Action** `issueCertificate` ("Issue a Certificate") |
| `modules/getCertificate/*` | Modules → new **Action** `getCertificate` ("Get a Certificate") |
| `modules/listCertificates/*` | Modules → new **Search** `listCertificates` ("List Certificates") |
| `modules/watchCertificates/*` | Modules → new **Trigger (polling)** `watchCertificates` ("Watch Certificates") |
| `interface.json`, `samples.json` | The **Interface** and **Samples** tabs of every module (they all return a certificate) |

Each module uses the connection above. Inside a module folder,
`communication.json` goes in **Communication**, `mappable-parameters.json` in
**Mappable parameters** and `static-parameters.json` in **Static parameters**.

Notes:

- **Unique reference** on "Issue a Certificate" is sent as `Idempotency-Key`:
  the same reference returns the same certificate, so re-running a scenario is safe.
- An empty **Issuer name** means "use the name in the design".
- The files were written from Make's custom-app documentation and have not been
  run inside Make yet. Create the connection first and run each module once
  before sharing the app.

A custom app is private to your Make organisation until you share its invite
link (app → **Publish**). Listing it for everyone is a review by Make.
