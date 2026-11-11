import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseProjectUrl, supabasePublishableKey } from "./supabase";

/**
 * Calls certera's own certificate API as the person who connected the tools.
 * Templates, signing, limits and idempotency live there, in one place.
 */
export async function certeraApi<T>(
  ctx: ToolContext,
  method: "GET" | "POST",
  path: string,
  options: { body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const body = options.body;
  const idempotencyKey = options.idempotencyKey;
  const token = ctx.getToken();
  if (!token) throw new ToolError("You are not signed in to certera.");
  const response = await fetch(`${supabaseProjectUrl()}/functions/v1/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabasePublishableKey(),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // The API's messages are written for a person; pass them on.
    throw new ToolError(payload?.error?.message ?? `certera answered ${response.status}.`);
  }
  return payload as T;
}
