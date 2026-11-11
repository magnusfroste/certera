import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { certeraApi } from "../api";

type Certificate = { id: string; url: string; verify_url: string; recipient_name: string; institution_name: string; verified_issuer: boolean; issuer_domain: string | null };
type Outcome = { recipient_name: string; certificate?: Certificate; error?: string };

export default defineTool({
  name: "issue_certificates",
  title: "Issue signed certificates",
  description:
    "Issue one signed certificate per recipient from a template in your certera account. Each certificate is recorded on Hedera and gets a public link that anyone can verify. " +
    "This is real and cannot be undone: confirm the template and the exact list of names with the person before calling. Up to 20 recipients per call; an account can issue 200 per day.",
  inputSchema: {
    template_id: z.string().uuid().describe("The template to issue from (see list_templates or create_template)."),
    recipient_names: z.array(z.string().min(1).max(120)).min(1).max(20).describe("Full names, one certificate each, exactly as they should be printed."),
    institution_name: z.string().min(1).max(120).optional().describe("The issuing organisation. Leave out to use the template's."),
    reference: z.string().min(1).max(100).optional().describe("A reference for this batch, e.g. a course run. Repeating a call with the same reference never issues a recipient twice."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ template_id, recipient_names, institution_name, reference }, ctx) => {
    const names = recipient_names.map((n) => n.trim()).filter(Boolean);
    if (!names.length) throw new ToolError("Give at least one recipient name.");
    const outcomes: Outcome[] = [];
    // One at a time: each is a Hedera transaction, and order is kept.
    for (const recipient_name of names) {
      try {
        const certificate = await certeraApi<Certificate>(ctx, "POST", "/v1/certificates", {
          body: { template_id, recipient_name, ...(institution_name ? { institution_name } : {}) },
          idempotencyKey: reference ? `mcp:${reference}:${recipient_name}`.slice(0, 200) : undefined,
        });
        outcomes.push({ recipient_name, certificate });
      } catch (e) {
        outcomes.push({ recipient_name, error: e instanceof Error ? e.message : "Unknown error" });
        // A problem with the template or the daily limit will repeat for everyone.
        if (outcomes.every((o) => o.error)) break;
      }
    }
    const issued = outcomes.filter((o) => o.certificate);
    if (!issued.length) throw new ToolError(`No certificate was issued. ${outcomes[0]?.error ?? ""}`.trim());
    const failed = outcomes.filter((o) => o.error);
    const notTried = names.length - outcomes.length;
    const lines = [
      `Issued ${issued.length} of ${names.length} certificate${names.length === 1 ? "" : "s"}.`,
      ...issued.map((o) => `${o.recipient_name}: ${o.certificate!.url}`),
      ...failed.map((o) => `${o.recipient_name}: NOT issued — ${o.error}`),
      ...(notTried > 0 ? [`${notTried} recipient(s) were not attempted.`] : []),
    ];
    return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { issued: issued.map((o) => o.certificate!), failed: failed.map((o) => ({ recipient_name: o.recipient_name, error: o.error ?? "" })) } };
  },
});
