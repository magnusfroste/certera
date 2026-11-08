// ─────────────────────────────────────────────────────────────────
// Custom OpenAI-compatible AI providers
// ─────────────────────────────────────────────────────────────────
// Besides the built-in providers (Anthropic, OpenAI, Gemini, OpenRouter), an
// admin can register any OpenAI-compatible endpoint in /admin → Integrations —
// e.g. GarageAI at https://api.garageai.eu/v1. The list lives in
// app_settings.custom_providers, which is readable by everyone (see its RLS),
// so it holds only non-secret configuration: id, label, base URL, models.
//
// The API key stays a Supabase secret whose name is DERIVED from the id and
// carries a fixed prefix: LLM_<ID>_API_KEY. The prefix is the security
// boundary. Whoever edits the list chooses the URL the key is sent to, so if
// the secret name were free (or simply <ID>_API_KEY), an admin account could
// register a provider called "openrouter" or "firecrawl" pointing at a server
// of their choosing and receive that service's key. With the prefix, a custom
// provider can only ever be handed a key that was stored for a custom
// provider. Shared by generate-diploma, test-integration and ops-mcp so the
// rule is defined once.

export interface CustomProvider {
  /** Lowercase slug, e.g. "garageai". Also selects the secret name. */
  id: string;
  label: string;
  /** Base URL up to and including the version segment, e.g. https://api.garageai.eu/v1 */
  baseUrl: string;
  /** Model names as the endpoint expects them. The first one is the default. */
  models: string[];
  enabled: boolean;
}

export const CUSTOM_PROVIDERS_KEY = 'custom_providers';

/** Ids that would shadow a built-in provider or integration. */
const RESERVED_IDS = new Set(['anthropic', 'openai', 'gemini', 'openrouter', 'firecrawl', 'hedera', 'supabase']);

export const ID_PATTERN = /^[a-z][a-z0-9]{1,23}$/;
const MODEL_PATTERN = /^[A-Za-z0-9._:/@+-]{1,120}$/;

export function secretNameFor(id: string): string {
  return `LLM_${id.toUpperCase()}_API_KEY`;
}

/**
 * Normalise a base URL, or return null if it is not acceptable. HTTPS only
 * (the key travels in a header), no embedded credentials, and no local or
 * IP-literal hosts — the request is made from our edge runtime, so this keeps
 * it pointed at a public API rather than at infrastructure next to it.
 * Accepts a pasted ".../chat/completions" and trims it to the base.
 */
export function normaliseBaseUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) return null;
  const host = u.hostname.toLowerCase();
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[');
  if (
    isIpLiteral ||
    !host.includes('.') ||
    host === 'localhost' ||
    /\.(local|internal|localhost|lan|home|arpa)$/.test(host)
  ) {
    return null;
  }
  const path = u.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  return `https://${u.host}${path}`;
}

export interface ProviderValidation {
  provider: CustomProvider | null;
  error?: string;
}

/** Validate one entry as an admin submitted it. */
export function validateCustomProvider(raw: unknown): ProviderValidation {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id.trim().toLowerCase() : '';
  if (!ID_PATTERN.test(id)) {
    return { provider: null, error: 'Id must be 2–24 lowercase letters or digits, starting with a letter.' };
  }
  if (RESERVED_IDS.has(id)) return { provider: null, error: `"${id}" is reserved for a built-in provider.` };

  const baseUrl = normaliseBaseUrl(r.baseUrl);
  if (!baseUrl) {
    return { provider: null, error: 'Base URL must be a public https:// address, e.g. https://api.example.com/v1.' };
  }

  const models = Array.isArray(r.models)
    ? [...new Set(r.models.map((m) => (typeof m === 'string' ? m.trim() : '')).filter(Boolean))]
    : [];
  if (models.length === 0) return { provider: null, error: 'List at least one model.' };
  if (models.length > 20) return { provider: null, error: 'At most 20 models.' };
  const bad = models.find((m) => !MODEL_PATTERN.test(m));
  if (bad) return { provider: null, error: `Model name "${bad}" contains characters an API model id does not use.` };

  const label = typeof r.label === 'string' && r.label.trim() ? r.label.trim().slice(0, 60) : id;
  return { provider: { id, label, baseUrl, models, enabled: r.enabled !== false } };
}

/**
 * Parse the stored list. Invalid entries are dropped rather than failing the
 * caller: a malformed setting must never take diploma generation down.
 */
export function parseCustomProviders(raw: unknown): CustomProvider[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomProvider[] = [];
  for (const entry of raw) {
    const { provider } = validateCustomProvider(entry);
    if (provider && !seen.has(provider.id)) {
      seen.add(provider.id);
      out.push(provider);
    }
  }
  return out;
}

export class ProviderHttpError extends Error {
  constructor(public status: number, public body: string, label: string) {
    super(`${label} API error ${status}: ${body.slice(0, 300)}`);
  }
}

/** A 400/422 that complains about response_format — the model or runtime lacks that mode. */
function rejectsResponseFormat(status: number, body: string): boolean {
  if (status !== 400 && status !== 422) return false;
  return /response_format|json_schema|json_object|structured|guided|grammar|not supported|unsupported/i.test(body);
}

export interface ChatResult {
  /** The parsed /chat/completions response. */
  data: Record<string, unknown>;
  /** The structured-output mode the endpoint actually accepted. */
  mode: 'json_schema' | 'json_object' | 'none';
}

/**
 * POST /chat/completions to an OpenAI-compatible endpoint.
 *
 * Endpoints in front of local runtimes (Ollama, llama.cpp, vLLM behind a
 * LiteLLM gateway) differ in which structured-output modes they accept, so
 * when a JSON schema is requested this steps down json_schema → json_object →
 * plain text, but only on an error that is actually about response_format. An
 * auth, budget or overload error is thrown at once instead of being retried
 * three times. Callers still parse the text defensively, since a plain-text
 * answer may wrap the JSON in prose.
 */
export async function openAICompatibleChat(
  provider: CustomProvider,
  apiKey: string,
  body: Record<string, unknown>,
  opts: { schema?: { name: string; schema: unknown }; timeoutMs?: number } = {},
): Promise<ChatResult> {
  const modes: ChatResult['mode'][] = opts.schema ? ['json_schema', 'json_object', 'none'] : ['none'];
  let lastError: ProviderHttpError | null = null;

  for (const mode of modes) {
    const payload: Record<string, unknown> = { ...body };
    if (mode === 'json_schema') {
      payload.response_format = {
        type: 'json_schema',
        json_schema: { name: opts.schema!.name, schema: opts.schema!.schema, strict: false },
      };
    } else if (mode === 'json_object') {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      // Local GPUs can be slow, and a stalled one must not hold the request
      // until the edge runtime kills it — that would also kill the fallback.
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
    if (res.ok) return { data: (await res.json()) as Record<string, unknown>, mode };

    const text = await res.text();
    lastError = new ProviderHttpError(res.status, text, provider.label);
    if (!rejectsResponseFormat(res.status, text)) throw lastError;
  }
  throw lastError!;
}

/** Text content and the model that actually answered (a router such as garageai/auto names it). */
export function readChat(data: Record<string, unknown>): { text: string; answeredModel: string | null } {
  const choices = data.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  return {
    text: typeof content === 'string' ? content : '',
    answeredModel: typeof data.model === 'string' ? data.model : null,
  };
}
