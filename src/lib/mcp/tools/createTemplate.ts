import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { certeraApi } from "../api";

type Created = { id: string; title: string; institution_name: string | null; format: string; has_recipient_placeholder: boolean; warning?: string | null };

export default defineTool({
  name: "create_template",
  title: "Create a certificate template",
  description:
    "Save a finished certificate design as a template in your certera account, so signed certificates can be issued from it. " +
    "Pass the design as static HTML plus CSS. Write {{recipient_name}} exactly where each recipient's name should appear. " +
    "Scripts, forms, iframes and event handlers are refused; link images by https URL and load fonts with @import in the css. " +
    "Design for an A4 page (about 800px wide landscape, 620px wide portrait).",
  inputSchema: {
    title: z.string().min(1).max(120).describe("A name for the template, e.g. \"Leadership Programme certificate\"."),
    html: z.string().min(1).describe("The certificate markup (body content only), with {{recipient_name}} where the name goes."),
    css: z.string().optional().describe("The stylesheet for the markup, as plain CSS."),
    institution_name: z.string().min(1).max(120).optional().describe("The issuing organisation, shown next to the certificate. Can also be given when issuing."),
    format: z.enum(["landscape", "portrait"]).optional().describe("A4 orientation (default landscape)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const template = await certeraApi<Created>(ctx, "POST", "/v1/templates", { body: input });
    const text = [
      `Template saved: ${template.title} (id ${template.id}, ${template.format}).`,
      template.warning ?? "Issue certificates from it with issue_certificates.",
    ].join("\n");
    return { content: [{ type: "text", text }], structuredContent: { template: { ...template, warning: template.warning ?? null } } };
  },
});
