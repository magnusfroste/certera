import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_signed_diplomas",
  title: "List signed diplomas",
  description: "List diplomas you have signed on Hedera, newest first, with verification links.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("signed_diplomas")
      .select("blockchain_id, recipient_name, institution_name, created_at, verification_url")
      .eq("issuer_id", ctx.getUserId() ?? "")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) throw new ToolError("Could not load signed diplomas.");
    const diplomas = (data ?? []).map((d) => ({
      id: d.blockchain_id,
      recipient: d.recipient_name,
      institution: d.institution_name,
      signedAt: d.created_at,
      verificationUrl: d.verification_url,
    }));
    const text = diplomas.length
      ? diplomas.map((d) => `${d.id}: ${d.recipient} — ${d.institution} (${d.signedAt.slice(0, 10)}) ${d.verificationUrl}`).join("\n")
      : "No signed diplomas yet.";
    return { content: [{ type: "text", text }], structuredContent: { diplomas } };
  },
});
