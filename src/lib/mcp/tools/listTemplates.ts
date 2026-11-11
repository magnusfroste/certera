import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { certeraApi } from "../api";

type Template = { id: string; title: string; institution_name: string | null; format: string; has_recipient_placeholder: boolean; updated_at: string };

export default defineTool({
  name: "list_templates",
  title: "List certificate templates",
  description: "List the certificate designs in your certera account that certificates can be issued from, most recently updated first. Use a template's id with issue_certificates.",
  inputSchema: { limit: z.number().int().min(1).max(100).optional().describe("Max results (default 25).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { templates } = await certeraApi<{ templates: Template[] }>(ctx, "GET", "/v1/templates", {});
    const shown = templates.slice(0, limit ?? 25);
    const text = shown.length
      ? shown.map((t) => `${t.id}: ${t.title} (${t.format}${t.institution_name ? `, ${t.institution_name}` : ""}${t.has_recipient_placeholder ? "" : ", no {{recipient_name}} placeholder"})`).join("\n")
      : "No templates yet. Create one with create_template, or design one at https://www.certera.ink/app.";
    return { content: [{ type: "text", text }], structuredContent: { templates: shown } };
  },
});
