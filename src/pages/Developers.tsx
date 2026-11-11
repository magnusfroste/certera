import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, BadgeCheck, Check, Copy, KeyRound, PenLine, Repeat, Webhook, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// The API as deployed (supabase/functions/api, behind api.certera.ink). Everything shown on this page
// is what the function does today — keep the two in step.
// Served by the Cloudflare Worker in cloudflare/api-worker, which forwards to the
// api edge function (the Supabase address keeps working too).
const API_BASE = 'https://api.certera.ink';
const SIGN_UP = "/auth?mode=signup&next=%2Fprofile";

const CURL = `curl -X POST ${API_BASE}/v1/certificates \\
  -H "Authorization: Bearer cert_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "YOUR_TEMPLATE_ID",
    "recipient_name": "Ada Lovelace"
  }'`;

const RESPONSE = `{
  "id": "DIP_mw9vi4i5_1j2a5j4s4",
  "url": "https://www.certera.ink/diploma/DIP_mw9vi4i5_1j2a5j4s4",
  "verify_url": "https://www.certera.ink/verify/DIP_mw9vi4i5_1j2a5j4s4",
  "recipient_name": "Ada Lovelace",
  "institution_name": "Nordlys Consulting AB",
  "issuer_domain": "nordlys.se",
  "verified_issuer": true,
  "hedera": {
    "topic_id": "0.0.11387245",
    "sequence_number": "1",
    "transaction_id": "0.0.7898466@1794265612.123456789",
    "explorer_url": "https://hashscan.io/…"
  },
  "created_at": "2026-11-09T23:06:52Z"
}`;

const NODE = `const res = await fetch("${API_BASE}/v1/certificates", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CERTERA_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": enrollment.id, // safe to retry
  },
  body: JSON.stringify({
    template_id: process.env.CERTERA_TEMPLATE,
    recipient_name: student.fullName,
  }),
});
const { url } = await res.json(); // send this link to the learner`;

const WEBHOOK = `${API_BASE}/v1/hooks/YOUR_TEMPLATE_ID?key=cert_YOUR_KEY`;

const steps = [
  { icon: PenLine, title: "Design once", text: "Describe your certificate in the studio and the AI designs it. Every saved design is a template." },
  { icon: KeyRound, title: "Create a key", text: "Profile → API gives you a key and a ready-to-run example with your template filled in." },
  { icon: Zap, title: "Issue with one request", text: "Send a name, get back a link to a signed, verifiable certificate. Or let a webhook do it." },
];

const features = [
  { icon: Repeat, title: "Safe to retry", text: "Send an Idempotency-Key and a repeated request returns the same certificate. Webhook retries never issue twice." },
  { icon: BadgeCheck, title: "Verified issuer", text: "Verify your domain with one DNS record and every certificate shows “Verified issuer · yourdomain.com”." },
  { icon: Check, title: "Proof anyone can check", text: "Each certificate's fingerprint is recorded on Hedera. The link you get back verifies it — no account needed." },
];

const endpoints: [string, string, string][] = [
  ["GET", "/v1/templates", "Your saved designs, with the ids to issue from."],
  ["POST", "/v1/templates", "Bring your own design: title, html, optional css, institution_name, format. Returns the template id."],
  ["POST", "/v1/certificates", "Issue one certificate: template_id, recipient_name, optional institution_name."],
  ["GET", "/v1/certificates", "Your certificates, newest first. ?limit=1–100 (default 25)."],
  ["GET", "/v1/certificates/:id", "One of your certificates."],
  ["POST", "/v1/hooks/:template_id", "“Course completed” webhook. The learner's name is read from the payload."],
  ["GET", "/v1/me", "The account a key belongs to, and its verified issuer domain."],
];

const MCP_URL = "https://jiokwdsnmgmcjoyxrwax.supabase.co/functions/v1/mcp";

const errors: [string, string, string][] = [
  ["401", "unauthorized", "Missing or unknown API key."],
  ["400", "active_content", "An imported design contains scripts, forms or event handlers."],
  ["400", "invalid_recipient", "recipient_name is missing or longer than 120 characters."],
  ["404", "template_not_found", "No design with that id in your account."],
  ["409", "in_progress", "The same Idempotency-Key is still being processed. Retry shortly."],
  ["422", "name_not_found", "The webhook payload has no recognisable name — add ?name_field=path.to.name."],
  ["429", "daily_limit", "200 certificates per account per day (resets 00:00 UTC)."],
];

const Code = ({ code, label }: { code: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <figure className="rounded-lg border border-border bg-card overflow-hidden text-left">
      <figcaption className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{label}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {})}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre className="overflow-x-auto p-3 sm:p-4 text-xs sm:text-[13px] leading-relaxed"><code>{code}</code></pre>
    </figure>
  );
};

const Developers = () => (
  <div className="min-h-screen bg-background text-foreground">
    <nav aria-label="Main navigation" className="border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-8 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <Award className="size-5 text-primary" />certera.ink
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="sm" asChild><Link to="/demo">Studio</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/auth">Sign in</Link></Button>
        </div>
      </div>
    </nav>

    <main>
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-10 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 lg:gap-12 items-center">
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-4">THE CERTIFICATE API</p>
          <h1 className="text-3xl sm:text-5xl font-semibold leading-tight">Certificates in one API call.</h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
            You run the course. certera designs, signs and hosts the certificate — and gives every learner a link anyone
            can verify. Connect your platform in minutes, free.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild><Link to={SIGN_UP}>Get your API key <ArrowRight className="size-4 ml-2" /></Link></Button>
            <Button variant="outline" asChild><a href="#reference">API reference</a></Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free to use. No credit card, no sales call.</p>
        </div>
        <div className="space-y-3 min-w-0">
          <Code label="Request" code={CURL} />
          <Code label="201 Created" code={RESPONSE} />
        </div>
      </section>

      <section aria-label="How it works" className="border-y border-border bg-card/50">
        <ol className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-7 sm:gap-8 px-6 sm:px-8 py-10 sm:py-12">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <step.icon className="size-5 text-primary mt-1 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold"><span className="text-muted-foreground font-mono mr-2">0{index + 1}</span>{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-16 grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        <div>
          <p className="text-xs font-mono text-muted-foreground mb-3">NO CODE NEEDED</p>
          <h2 className="text-2xl font-semibold leading-snug flex items-center gap-2"><Webhook className="size-5 text-primary" />Or connect a webhook</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Most course platforms can call a URL when a learner completes a course. Paste yours from Profile → API and
            certera issues the certificate by itself: it finds the learner's name in the payload, signs, and returns the link.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="size-4 text-success mt-0.5 shrink-0" /><span>Reads <code className="text-foreground">name</code>, <code className="text-foreground">user.full_name</code>, <code className="text-foreground">first_name</code> + <code className="text-foreground">last_name</code> and similar fields</span></li>
            <li className="flex gap-2"><Check className="size-4 text-success mt-0.5 shrink-0" /><span>Name somewhere unusual? Add <code className="text-foreground">&amp;name_field=path.to.name</code></span></li>
            <li className="flex gap-2"><Check className="size-4 text-success mt-0.5 shrink-0" /><span>A retried delivery returns the same certificate — never a duplicate</span></li>
          </ul>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            Using Zapier, Make or n8n? Add a webhook or HTTP step that POSTs to this URL — or to{" "}
            <code className="text-foreground">/v1/certificates</code> with your key — and map the learner's name.
          </p>
        </div>
        <div className="space-y-3 min-w-0">
          <Code label="Webhook URL" code={WEBHOOK} />
          <Code label="Node.js" code={NODE} />
        </div>
      </section>

      <section className="border-y border-border bg-card/50">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-7 sm:gap-8 px-6 sm:px-8 py-10 sm:py-12">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <f.icon className="size-5 text-primary mt-1 shrink-0" />
              <div><h3 className="text-sm font-semibold">{f.title}</h3><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="reference" className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-16 scroll-mt-4">
        <p className="text-xs font-mono text-muted-foreground mb-3">REFERENCE</p>
        <h2 className="text-2xl font-semibold">Seven endpoints. That's the API.</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Base URL <code className="text-foreground break-all">{API_BASE}</code>. Authenticate with{" "}
          <code className="text-foreground">Authorization: Bearer cert_…</code>; webhooks may pass{" "}
          <code className="text-foreground">?key=cert_…</code> instead. Requests and responses are JSON.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {endpoints.map(([method, path, text]) => (
                <tr key={path + method}>
                  <td className="px-3 py-2.5 align-top font-mono text-xs text-primary whitespace-nowrap">{method}</td>
                  <td className="px-3 py-2.5 align-top font-mono text-xs whitespace-nowrap">{path}</td>
                  <td className="px-3 py-2.5 text-muted-foreground min-w-[14rem]">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-10 text-sm font-semibold">Designed somewhere else?</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
          A certificate made in a design tool or by hand works as a template: send its static HTML and CSS to{" "}
          <code className="text-foreground">POST /v1/templates</code> with{" "}
          <code className="text-foreground">{"{{recipient_name}}"}</code> where the name goes, then issue from the id you get back.
          Scripts, forms and event handlers are refused. Working in an AI assistant? Connect certera's MCP server
          (<code className="text-foreground break-all">{MCP_URL}</code>) and ask it to save the design and issue the certificates.
        </p>

        <h3 className="mt-10 text-sm font-semibold">Errors</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Errors come back as <code className="text-foreground">{'{ "error": { "code", "message" } }'}</code> with a message written for a person.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {errors.map(([status, code, text]) => (
                <tr key={code}>
                  <td className="px-3 py-2.5 align-top font-mono text-xs whitespace-nowrap">{status}</td>
                  <td className="px-3 py-2.5 align-top font-mono text-xs whitespace-nowrap">{code}</td>
                  <td className="px-3 py-2.5 text-muted-foreground min-w-[14rem]">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
          <div>
            <p className="font-semibold">Issue your first certificate in five minutes</p>
            <p className="mt-1 text-sm text-muted-foreground">Create an account, design a certificate, copy the example from your profile.</p>
          </div>
          <Button asChild className="shrink-0"><Link to={SIGN_UP}>Get your API key <ArrowRight className="size-4 ml-2" /></Link></Button>
        </div>
      </section>
    </main>

    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-7 flex flex-col sm:flex-row justify-between gap-5 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} certera.ink</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">
          <Link className="hover:text-foreground focus-visible:outline-ring" to="/">Home</Link>
          <Link className="hover:text-foreground focus-visible:outline-ring" to="/verify">Verify a diploma</Link>
          <Link className="hover:text-foreground focus-visible:outline-ring" to="/demo">Studio</Link>
        </nav>
      </div>
    </footer>
  </div>
);

export default Developers;
