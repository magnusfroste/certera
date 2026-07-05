# certera.ink 🎓

AI-generated diplomas and certificates with blockchain-backed verification. Describe what you want in a chat, and certera.ink designs a professional diploma from a curated design system, then lets you sign it to the Hedera network for instant, tamper-evident verification that employers can trust.

> The repo/package is named `diplomator`; the product is **certera.ink**.

## Features

- **AI diploma generation** — create a diploma from a text prompt, a reference image, or a website URL (brand colors/fonts are scraped and matched).
- **Design-system-driven output** — the AI picks from curated palettes, typography pairs, compositions, borders, seals and signatures (a DSL), so results stay on-template. Server-side guardrails validate contrast and content fit.
- **Conversational iteration** — refine the design in chat ("make it blue", "add a botanical border"); changes stay inside the design system.
- **Undo & inline editing** — step back through design changes, or hand-edit the HTML/CSS in a built-in Monaco editor and edit text directly in the preview.
- **Blockchain signing** — sign a diploma to the Hedera Consensus Service; the content hash and metadata are recorded on-chain.
- **Verification** — anyone can verify a diploma by its ID and recipient name against the on-chain record.
- **Sharing** — public diploma page, PDF export (with QR + verification badge), embeddable iframe, social share, and QR codes.
- **Guest mode** — try generation without an account (rate-limited).
- **Admin dashboard** — choose the active AI provider/model, test integrations, and manage branding.

## Tech Stack

- **React 18** + **TypeScript** + **Vite** — SPA frontend
- **Tailwind CSS** + **shadcn/ui** — styling and components
- **React Router**, **TanStack Query**, **React Hook Form** + **Zod**
- **Supabase** — Postgres, Auth, and Edge Functions (backend)
- **Multi-provider AI** — Anthropic (default), OpenAI, Google Gemini, or OpenRouter, plus Firecrawl for URL scraping
- **Hedera** (`@hashgraph/sdk`) — on-chain diploma verification

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm (or bun — a `bun.lockb` is included)
- A Supabase project (for self-hosting)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` (or `.env.local`) with your Supabase project's values:

```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon/publishable-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

> Note: the client uses `VITE_SUPABASE_PUBLISHABLE_KEY` (the project's anon/publishable key) — not `VITE_SUPABASE_ANON_KEY`.

### Run Locally

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview   # preview the production build
```

### Lint

```bash
npm run lint
```

## Self-Hosted Setup

The AI generation and blockchain signing run in **Supabase Edge Functions**, so self-hosting needs more than the frontend env vars above.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) and grab its URL, anon/publishable key, and project ID for the frontend `.env`.

2. **Run the database migrations** (RLS policies, `signed_diplomas`, `diploma_sessions`, `guest_usage`, roles, etc.):

   ```bash
   npx supabase db push
   ```

3. **Deploy the edge functions:**

   ```bash
   npx supabase functions deploy generate-diploma
   npx supabase functions deploy hedera-sign
   npx supabase functions deploy test-integration
   ```

4. **Set the edge-function secrets** (only the providers you use are required; `generate-diploma` falls back across any providers whose key is set):

   ```bash
   # AI providers (at least one; Anthropic is the default)
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase secrets set OPENAI_API_KEY=sk-...
   npx supabase secrets set GEMINI_API_KEY=...
   npx supabase secrets set OPENROUTER_API_KEY=sk-or-...

   # Optional: better URL brand scraping (falls back to a plain fetch if unset)
   npx supabase secrets set FIRECRAWL_API_KEY=fc-...

   # Blockchain signing (Hedera testnet)
   npx supabase secrets set HEDERA_ACCOUNT_ID=0.0.xxxxx
   npx supabase secrets set HEDERA_PRIVATE_KEY=...
   # Optional: reuse an existing HCS topic instead of creating one
   npx supabase secrets set HEDERA_TOPIC_ID=0.0.xxxxx
   ```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to edge functions automatically by Supabase.

5. **Run the app:**

   ```bash
   npm run dev
   ```

## License

MIT
