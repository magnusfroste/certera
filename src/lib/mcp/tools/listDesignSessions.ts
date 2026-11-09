import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_design_sessions",
  title: "List design sessions",
  description: "List your diploma design sessions in the studio, most recently updated first.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("diploma_sessions")
      .select("id, title, diploma_format, updated_at")
      .eq("user_id", ctx.getUserId() ?? "")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) throw new ToolError("Could not load design sessions.");
    const sessions = (data ?? []).map((s) => ({ id: s.id, title: s.title, format: s.diploma_format, updatedAt: s.updated_at }));
    const text = sessions.length
      ? sessions.map((s) => `${s.id}: ${s.title} (${s.format}, ${s.updatedAt.slice(0, 10)})`).join("\n")
      : "No design sessions yet.";
    return { content: [{ type: "text", text }], structuredContent: { sessions } };
  },
});
