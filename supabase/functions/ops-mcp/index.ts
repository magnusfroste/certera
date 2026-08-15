// ============================================================================
// ops-mcp — a Model Context Protocol server for operating certera.ink
// ============================================================================
// Exposes read-only operational data (traffic, sign-ups, sign-ins, diploma
// volume, guest rate limits) plus live provider health, so an operator (or an
// MCP-capable assistant) can answer "is the site healthy, and are we out of
// credits?" without opening a dashboard.
//
// Transport: Streamable HTTP — JSON-RPC 2.0 over a single POST endpoint.
// Auth:      Bearer OPS_MCP_TOKEN. This endpoint runs with verify_jwt = false,
//            so THIS check is the only gate — it must stay strict. The data
//            here includes personal data (emails, sign-in times), so the token
//            is a production secret; rotate it via Supabase secrets.
//
// Almost every tool is read-only. The one exception is set_ai_provider, which
// changes which provider and model serve live generations. That makes the
// bearer token a production-config credential, not just a reporting one:
//   - anyone holding it can change what the site spends money on, so it is
//     scoped to operators and must not be embedded in a client;
//   - the write validates the target provider has a key and (by default)
//     verifies the model with a real call before persisting, so a bad value
//     cannot silently break generation;
//   - no other tool writes, and none touch user or diploma data.
// Adding further write tools means revisiting this section.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Length-independent constant-time compare, so the token can't be timed out. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Compare a fixed number of bytes regardless of input length.
  let diff = ab.length ^ bb.length;
  const n = Math.max(ab.length, bb.length);
  for (let i = 0; i < n; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const expected = Deno.env.get('OPS_MCP_TOKEN');
  // No token configured = endpoint stays shut, rather than open to the world.
  if (!expected) return false;
  const header = req.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return false;
  return safeEqual(header.slice('Bearer '.length).trim(), expected);
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

const DAY_MS = 86_400_000;
const sinceIso = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

/** Count rows in a table, optionally created since a cutoff. Head-only query. */
async function countRows(table: string, sinceDays?: number): Promise<number> {
  let q = admin().from(table).select('*', { count: 'exact', head: true });
  if (sinceDays !== undefined) q = q.gte('created_at', sinceIso(sinceDays));
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
}

/**
 * auth.users isn't reachable through PostgREST, so page through the admin API.
 * Capped so a runaway user table can't blow the function's memory or time.
 */
async function listUsers(maxPages = 10): Promise<AuthUser[]> {
  const out: AuthUser[] = [];
  const perPage = 1000;
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.users: ${error.message}`);
    const users = (data?.users ?? []) as AuthUser[];
    out.push(...users);
    if (users.length < perPage) break;
  }
  return out;
}

/** Bucket ISO timestamps into a dense daily series covering the last N days. */
function dailySeries(timestamps: (string | null | undefined)[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10), 0);
  }
  for (const ts of timestamps) {
    if (!ts) continue;
    const key = ts.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}

// ---------------------------------------------------------------------------
// Provider health
// ---------------------------------------------------------------------------
// The operator's real question is "will the next generation succeed, and if
// not, is it because we're out of money?". Only OpenRouter publishes a balance;
// for everyone else that answer only exists in the error of a real call, so a
// deep probe sends a 1-token request and classifies what comes back.

type ProviderStatus = 'ok' | 'no_key' | 'out_of_credits' | 'rate_limited' | 'auth_failed' | 'error';

interface ProviderReport {
  provider: string;
  status: ProviderStatus;
  detail: string;
  latencyMs?: number;
  balanceUsd?: number;
  usedUsd?: number;
}

/** Map an HTTP status + error body onto an operational status. */
function classify(status: number, body: string): { status: ProviderStatus; detail: string } {
  const b = body.toLowerCase();
  const brief = body.replace(/\s+/g, ' ').slice(0, 200);
  const broke =
    b.includes('credit balance is too low') ||
    b.includes('insufficient_quota') ||
    b.includes('insufficient credits') ||
    b.includes('exceeded your current quota') ||
    b.includes('billing');
  if (broke) return { status: 'out_of_credits', detail: brief };
  if (status === 429) return { status: 'rate_limited', detail: brief };
  if (status === 401 || status === 403) return { status: 'auth_failed', detail: brief };
  return { status: 'error', detail: `HTTP ${status}: ${brief}` };
}

async function probeAnthropic(deep: boolean): Promise<ProviderReport> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return { provider: 'anthropic', status: 'no_key', detail: 'ANTHROPIC_API_KEY not set' };
  const started = Date.now();
  const headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  try {
    // GET /v1/models validates the key for free but never reveals an empty
    // balance — only a real message call does, hence the deep mode.
    const res = deep
      ? await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        })
      : await fetch('https://api.anthropic.com/v1/models?limit=1', { headers });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { provider: 'anthropic', latencyMs, ...classify(res.status, await res.text()) };
    return { provider: 'anthropic', status: 'ok', detail: deep ? 'message call succeeded' : 'key valid (models listed)', latencyMs };
  } catch (e) {
    return { provider: 'anthropic', status: 'error', detail: (e as Error).message };
  }
}

async function probeOpenRouter(): Promise<ProviderReport> {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) return { provider: 'openrouter', status: 'no_key', detail: 'OPENROUTER_API_KEY not set' };
  const started = Date.now();
  try {
    // OpenRouter is the one provider with a real balance endpoint — and it's
    // free to call, so this is the cheapest true "are we out of credits?".
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { provider: 'openrouter', latencyMs, ...classify(res.status, await res.text()) };
    const body = await res.json();
    const total = Number(body?.data?.total_credits ?? 0);
    const used = Number(body?.data?.total_usage ?? 0);
    const remaining = total - used;
    return {
      provider: 'openrouter',
      status: remaining <= 0 ? 'out_of_credits' : 'ok',
      detail: `${remaining.toFixed(4)} USD remaining`,
      latencyMs,
      balanceUsd: remaining,
      usedUsd: used,
    };
  } catch (e) {
    return { provider: 'openrouter', status: 'error', detail: (e as Error).message };
  }
}

async function probeOpenAI(deep: boolean): Promise<ProviderReport> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return { provider: 'openai', status: 'no_key', detail: 'OPENAI_API_KEY not set' };
  const started = Date.now();
  const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    const res = deep
      ? await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        })
      : await fetch('https://api.openai.com/v1/models?limit=1', { headers: auth });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { provider: 'openai', latencyMs, ...classify(res.status, await res.text()) };
    return { provider: 'openai', status: 'ok', detail: deep ? 'completion succeeded' : 'key valid', latencyMs };
  } catch (e) {
    return { provider: 'openai', status: 'error', detail: (e as Error).message };
  }
}

async function probeGemini(): Promise<ProviderReport> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return { provider: 'gemini', status: 'no_key', detail: 'GEMINI_API_KEY not set' };
  const started = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`);
    const latencyMs = Date.now() - started;
    if (!res.ok) return { provider: 'gemini', latencyMs, ...classify(res.status, await res.text()) };
    return { provider: 'gemini', status: 'ok', detail: 'key valid', latencyMs };
  } catch (e) {
    return { provider: 'gemini', status: 'error', detail: (e as Error).message };
  }
}

async function probeFirecrawl(): Promise<ProviderReport> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  if (!key) return { provider: 'firecrawl', status: 'no_key', detail: 'FIRECRAWL_API_KEY not set (URL scraping falls back)' };
  const started = Date.now();
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/team/credit-usage', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { provider: 'firecrawl', latencyMs, ...classify(res.status, await res.text()) };
    const body = await res.json();
    const remaining = Number(body?.data?.remaining_credits ?? NaN);
    return {
      provider: 'firecrawl',
      status: Number.isFinite(remaining) && remaining <= 0 ? 'out_of_credits' : 'ok',
      detail: Number.isFinite(remaining) ? `${remaining} credits remaining` : 'key valid',
      latencyMs,
    };
  } catch (e) {
    return { provider: 'firecrawl', status: 'error', detail: (e as Error).message };
  }
}

/**
 * Verify one specific provider+model with a minimal real call.
 * set_ai_provider runs this before persisting, so a typo'd or retired model id
 * is rejected instead of silently breaking every generation until someone
 * notices. Costs a fraction of a cent.
 */
async function probeModel(provider: string, model: string): Promise<{ ok: boolean; detail: string }> {
  try {
    let res: Response;
    if (provider === 'anthropic') {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
    } else if (provider === 'gemini') {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${Deno.env.get('GEMINI_API_KEY') ?? ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        },
      );
    } else {
      const isOR = provider === 'openrouter';
      res = await fetch(
        isOR ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get(isOR ? 'OPENROUTER_API_KEY' : 'OPENAI_API_KEY') ?? ''}`,
          },
          body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        },
      );
    }
    if (!res.ok) {
      const { detail } = classify(res.status, await res.text());
      return { ok: false, detail };
    }
    return { ok: true, detail: `${provider}/${model} responded successfully` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Model catalogue + pricing
// ---------------------------------------------------------------------------
// Mirrors the choices offered in the admin UI. Used to validate writes and to
// price token usage. Prices are USD per 1M tokens and are a planning estimate,
// not a billing source — providers change them, so cost figures are labelled
// "estimated" everywhere they surface.

interface ModelInfo { id: string; label: string; inputPer1M: number; outputPer1M: number }

const CATALOGUE: Record<string, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', inputPer1M: 3, outputPer1M: 15 },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', inputPer1M: 1, outputPer1M: 5 },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', inputPer1M: 2.5, outputPer1M: 10 },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', inputPer1M: 0.15, outputPer1M: 0.6 },
  ],
  gemini: [
    { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash', inputPer1M: 0.3, outputPer1M: 2.5 },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)', inputPer1M: 2.5, outputPer1M: 10 },
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (via OpenRouter)', inputPer1M: 0.15, outputPer1M: 0.6 },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4 (via OpenRouter)', inputPer1M: 3, outputPer1M: 15 },
  ],
};

const PROVIDERS = Object.keys(CATALOGUE);

function priceFor(provider: string, model: string): ModelInfo | undefined {
  return CATALOGUE[provider]?.find((m) => m.id === model);
}

/** Estimated USD for a token count, or null when the model isn't priced here. */
function estimateCost(provider: string, model: string, input: number, output: number): number | null {
  const p = priceFor(provider, model);
  if (!p) return null;
  return (input / 1_000_000) * p.inputPer1M + (output / 1_000_000) * p.outputPer1M;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

interface ToolDef {
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const daysArg = (args: Record<string, unknown>, fallback: number) => {
  const n = Number(args.days ?? fallback);
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 1), 90) : fallback;
};

const TOOLS: Record<string, ToolDef> = {
  get_overview: {
    description:
      'Headline health of certera.ink: user, session and signed-diploma totals with 24h/7d deltas, plus guest generation volume. Start here.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const users = await listUsers();
      const now = Date.now();
      const newSince = (d: number) => users.filter((u) => now - new Date(u.created_at).getTime() <= d * DAY_MS).length;
      const activeSince = (d: number) =>
        users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= d * DAY_MS).length;

      const [sessions, sessions24h, signed, signed24h, signed7d] = await Promise.all([
        countRows('diploma_sessions'),
        countRows('diploma_sessions', 1),
        countRows('signed_diplomas'),
        countRows('signed_diplomas', 1),
        countRows('signed_diplomas', 7),
      ]);

      const { data: guests } = await admin()
        .from('guest_usage')
        .select('count, window_start')
        .gte('window_start', sinceIso(1));
      const guestGenerations = (guests ?? []).reduce((sum: number, g: { count: number }) => sum + (g.count ?? 0), 0);

      return {
        generatedAt: new Date().toISOString(),
        users: { total: users.length, new24h: newSince(1), new7d: newSince(7), new30d: newSince(30) },
        activeUsers: { signedIn24h: activeSince(1), signedIn7d: activeSince(7), signedIn30d: activeSince(30) },
        diplomaSessions: { total: sessions, last24h: sessions24h },
        signedDiplomas: { total: signed, last24h: signed24h, last7d: signed7d },
        guests: { generationsLast24h: guestGenerations, activeIpWindows: (guests ?? []).length },
      };
    },
  },

  get_signups: {
    description: 'Daily new-user counts over the last N days (default 30), newest last, with the most recent sign-ups listed.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Look-back window, 1-90 (default 30)' } },
    },
    handler: async (args) => {
      const days = daysArg(args, 30);
      const users = await listUsers();
      const recent = [...users]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 20)
        .map((u) => ({ email: u.email ?? null, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at ?? null }));
      return { days, series: dailySeries(users.map((u) => u.created_at), days), recentSignups: recent };
    },
  },

  get_signins: {
    description: 'Daily active-user counts by last sign-in over the last N days (default 30), plus users who have never signed in.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Look-back window, 1-90 (default 30)' } },
    },
    handler: async (args) => {
      const days = daysArg(args, 30);
      const users = await listUsers();
      return {
        days,
        note: 'Buckets are each user\'s most recent sign-in, so a user appears at most once — this is "active users", not a login count.',
        series: dailySeries(users.map((u) => u.last_sign_in_at), days),
        neverSignedIn: users.filter((u) => !u.last_sign_in_at).length,
      };
    },
  },

  get_diploma_volume: {
    description: 'Daily volume of diploma sessions created and diplomas signed to the blockchain over the last N days (default 30).',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Look-back window, 1-90 (default 30)' } },
    },
    handler: async (args) => {
      const days = daysArg(args, 30);
      const since = sinceIso(days);
      const [{ data: sessions }, { data: signed }] = await Promise.all([
        admin().from('diploma_sessions').select('created_at').gte('created_at', since),
        admin().from('signed_diplomas').select('created_at, institution_name').gte('created_at', since),
      ]);
      const byInstitution = new Map<string, number>();
      for (const row of signed ?? []) {
        const name = (row as { institution_name?: string }).institution_name || 'Unknown';
        byInstitution.set(name, (byInstitution.get(name) ?? 0) + 1);
      }
      return {
        days,
        sessionsCreated: dailySeries((sessions ?? []).map((r: { created_at: string }) => r.created_at), days),
        diplomasSigned: dailySeries((signed ?? []).map((r: { created_at: string }) => r.created_at), days),
        topInstitutions: [...byInstitution]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([institution, count]) => ({ institution, count })),
      };
    },
  },

  list_recent_diplomas: {
    description: 'The most recently signed diplomas, newest first — recipient, institution, blockchain id and timestamp.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'How many to return, 1-100 (default 20)' } },
    },
    handler: async (args) => {
      const raw = Number(args.limit ?? 20);
      const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 100) : 20;
      const { data, error } = await admin()
        .from('signed_diplomas')
        .select('blockchain_id, recipient_name, institution_name, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return { count: (data ?? []).length, diplomas: data ?? [] };
    },
  },

  get_guest_usage: {
    description:
      'Guest generation rate-limit state: how many anonymous generations have run in the current 24h windows and how many IPs hit the cap.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { data, error } = await admin().from('guest_usage').select('count, window_start');
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const active = rows.filter((r: { window_start: string }) => Date.now() - new Date(r.window_start).getTime() <= DAY_MS);
      const total = active.reduce((s: number, r: { count: number }) => s + (r.count ?? 0), 0);
      return {
        activeWindows: active.length,
        generationsInActiveWindows: total,
        ipsAtOrAboveCap: active.filter((r: { count: number }) => (r.count ?? 0) >= 3).length,
        staleWindows: rows.length - active.length,
        note: 'IPs are stored hashed; individual guests are not identifiable here.',
      };
    },
  },

  check_providers: {
    description:
      'Live health of every AI provider and Firecrawl: reports ok / no_key / out_of_credits / rate_limited / auth_failed / error. Use this when generation fails or to check whether credits ran out. OpenRouter and Firecrawl report a real remaining balance; Anthropic and OpenAI only reveal exhausted credit through a real call, so use deep=true to detect that.',
    inputSchema: {
      type: 'object',
      properties: {
        deep: {
          type: 'boolean',
          description:
            'Send a minimal 1-token request to Anthropic/OpenAI so exhausted credits surface. Costs a fraction of a cent. Default true.',
        },
      },
    },
    handler: async (args) => {
      const deep = args.deep === undefined ? true : Boolean(args.deep);
      const reports = await Promise.all([
        probeAnthropic(deep),
        probeOpenRouter(),
        probeOpenAI(deep),
        probeGemini(),
        probeFirecrawl(),
      ]);
      // The app's default provider is Anthropic with the others as fallback, so
      // generation only truly stops when every configured LLM provider is down.
      const llm = reports.filter((r) => r.provider !== 'firecrawl');
      const usable = llm.filter((r) => r.status === 'ok');
      const broke = llm.filter((r) => r.status === 'out_of_credits');
      return {
        checkedAt: new Date().toISOString(),
        mode: deep ? 'deep' : 'light',
        generationHealthy: usable.length > 0,
        alert:
          usable.length === 0
            ? 'CRITICAL: no usable LLM provider — generation is down.'
            : broke.length > 0
              ? `WARNING: out of credits at ${broke.map((r) => r.provider).join(', ')} (still serving via ${usable.map((r) => r.provider).join(', ')}).`
              : null,
        providers: reports,
      };
    },
  },

  get_settings: {
    description: 'Current app_settings key/value configuration (model choice, provider preference and other operator-set values).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { data, error } = await admin().from('app_settings').select('key, value, updated_at').order('key');
      if (error) throw new Error(error.message);
      return { settings: data ?? [] };
    },
  },

  get_token_usage: {
    description:
      'Token consumption and estimated cost over the last N days (default 30), broken down by day and by provider/model. Also reports tokens burned by failed calls and by fallback, i.e. spend caused by outages.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'number', description: 'Look-back window, 1-90 (default 30)' } },
    },
    handler: async (args) => {
      const days = daysArg(args, 30);
      const { data, error } = await admin()
        .from('generation_usage')
        .select('created_at, provider, model, input_tokens, output_tokens, succeeded, fell_back, is_guest')
        .gte('created_at', sinceIso(days));
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as {
        created_at: string; provider: string; model: string;
        input_tokens: number; output_tokens: number;
        succeeded: boolean; fell_back: boolean; is_guest: boolean;
      }[];

      if (rows.length === 0) {
        return {
          days,
          note: 'No usage recorded yet. Token accounting starts when the instrumented generate-diploma is deployed; nothing before that can be reconstructed.',
          totals: { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
        };
      }

      const byDay = new Map<string, { inputTokens: number; outputTokens: number; calls: number; costUsd: number }>();
      const byModel = new Map<string, { provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number; priced: boolean }>();
      let unpriced = 0;
      const totals = { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, failedCalls: 0, fallbackCalls: 0, guestCalls: 0, wastedTokens: 0 };

      for (const r of rows) {
        const cost = estimateCost(r.provider, r.model, r.input_tokens, r.output_tokens);
        if (cost === null) unpriced++;
        const day = r.created_at.slice(0, 10);
        const d = byDay.get(day) ?? { inputTokens: 0, outputTokens: 0, calls: 0, costUsd: 0 };
        d.calls++; d.inputTokens += r.input_tokens; d.outputTokens += r.output_tokens; d.costUsd += cost ?? 0;
        byDay.set(day, d);

        const key = `${r.provider}/${r.model}`;
        const m = byModel.get(key) ?? { provider: r.provider, model: r.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, priced: cost !== null };
        m.calls++; m.inputTokens += r.input_tokens; m.outputTokens += r.output_tokens; m.costUsd += cost ?? 0;
        byModel.set(key, m);

        totals.calls++;
        totals.inputTokens += r.input_tokens;
        totals.outputTokens += r.output_tokens;
        totals.estimatedCostUsd += cost ?? 0;
        if (!r.succeeded) { totals.failedCalls++; totals.wastedTokens += r.input_tokens + r.output_tokens; }
        if (r.fell_back) totals.fallbackCalls++;
        if (r.is_guest) totals.guestCalls++;
      }

      const round = (n: number) => Math.round(n * 10000) / 10000;
      return {
        days,
        totals: { ...totals, estimatedCostUsd: round(totals.estimatedCostUsd) },
        costNote:
          unpriced > 0
            ? `${unpriced} call(s) used a model with no price in the catalogue and contribute 0 to the cost estimate.`
            : 'All calls priced from the built-in catalogue. Costs are estimates, not provider billing.',
        byDay: [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v, costUsd: round(v.costUsd) })),
        byModel: [...byModel.values()].sort((a, b) => b.costUsd - a.costUsd).map((m) => ({ ...m, costUsd: round(m.costUsd) })),
      };
    },
  },

  list_models: {
    description:
      'The providers and models this app can be configured to use, with estimated per-1M-token prices, and which one is active right now.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { data } = await admin().from('app_settings').select('value').eq('key', 'ai_provider').maybeSingle();
      const active = (data?.value as { provider?: string; model?: string }) ?? null;
      return {
        active,
        note: 'OpenRouter also accepts models outside this list; set_ai_provider verifies any model it does not recognise before saving.',
        providers: PROVIDERS.map((p) => ({
          provider: p,
          keyConfigured: Boolean(Deno.env.get(
            { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY', openrouter: 'OPENROUTER_API_KEY' }[p] as string,
          )),
          models: CATALOGUE[p],
        })),
      };
    },
  },

  set_ai_provider: {
    description:
      'Change the provider and/or model used for all diploma generations. WRITE — this changes production behaviour immediately. By default the combination is verified with a real 1-token call before it is saved, so an invalid model cannot break generation.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: `One of: ${PROVIDERS.join(', ')}. Omit to keep the current provider.` },
        model: { type: 'string', description: 'Model id for that provider. Omit to use the provider\'s first catalogue model.' },
        verify: { type: 'boolean', description: 'Probe the combination before saving (default true). Only set false if the provider is known-good but temporarily unreachable.' },
      },
    },
    handler: async (args) => {
      const { data: current } = await admin().from('app_settings').select('value').eq('key', 'ai_provider').maybeSingle();
      const now = (current?.value as { provider?: string; model?: string }) ?? {};

      const provider = String(args.provider ?? now.provider ?? 'anthropic');
      if (!PROVIDERS.includes(provider)) {
        throw new Error(`Unknown provider "${provider}". Valid: ${PROVIDERS.join(', ')}`);
      }
      // Changing provider without naming a model would otherwise carry the old
      // provider's model across and break the call.
      const model = String(
        args.model ?? (provider === now.provider ? now.model ?? CATALOGUE[provider][0].id : CATALOGUE[provider][0].id),
      );

      const keyEnv = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY', openrouter: 'OPENROUTER_API_KEY' }[provider] as string;
      if (!Deno.env.get(keyEnv)) {
        throw new Error(`Refusing to switch: ${keyEnv} is not configured, so ${provider} cannot serve generations.`);
      }

      const verify = args.verify === undefined ? true : Boolean(args.verify);
      let verification: { ok: boolean; detail: string } | null = null;
      if (verify) {
        const probe = await probeModel(provider, model);
        verification = probe;
        if (!probe.ok) {
          throw new Error(`Refusing to save: ${provider}/${model} failed verification — ${probe.detail}`);
        }
      }

      // Select back the affected rows: a plain update matching no row reports
      // success, which would leave the caller believing the switch took effect.
      const { data: saved, error } = await admin()
        .from('app_settings')
        .update({ value: { provider, model }, updated_at: new Date().toISOString() })
        .eq('key', 'ai_provider')
        .select('key');
      if (error) throw new Error(`Save failed: ${error.message}`);
      if (!saved || saved.length === 0) {
        throw new Error("Save failed: no app_settings row with key 'ai_provider' exists to update.");
      }

      return {
        changed: true,
        previous: now,
        active: { provider, model },
        verification,
        pricing: priceFor(provider, model) ?? 'not in catalogue — cost estimates will be 0 for this model',
      };
    },
  },
};

// ---------------------------------------------------------------------------
// JSON-RPC / MCP plumbing
// ---------------------------------------------------------------------------

const SERVER_INFO = { name: 'certera-ops', version: '1.0.0' };
const DEFAULT_PROTOCOL = '2024-11-05';
const SUPPORTED_PROTOCOLS = ['2024-11-05', '2025-03-26', '2025-06-18'];

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const rpcResult = (id: string | number | null | undefined, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id: string | number | null | undefined, code: number, message: string) => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
});

async function handleRpc(msg: RpcRequest): Promise<unknown | null> {
  const { method, id, params } = msg;

  switch (method) {
    case 'initialize': {
      const asked = String((params as { protocolVersion?: string })?.protocolVersion ?? '');
      return rpcResult(id, {
        protocolVersion: SUPPORTED_PROTOCOLS.includes(asked) ? asked : DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }

    // Notifications carry no id and must not get a response body.
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

    case 'ping':
      return rpcResult(id, {});

    case 'tools/list':
      return rpcResult(id, {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case 'tools/call': {
      const name = String((params as { name?: string })?.name ?? '');
      const tool = TOOLS[name];
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`);
      const args = ((params as { arguments?: Record<string, unknown> })?.arguments ?? {}) as Record<string, unknown>;
      try {
        const data = await tool.handler(args);
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
      } catch (e) {
        // Tool failures are reported in-band (isError) so the client can show
        // them, rather than as a transport-level error.
        return rpcResult(id, {
          content: [{ type: 'text', text: `Tool ${name} failed: ${(e as Error).message}` }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return json({ error: 'This MCP endpoint accepts POST (Streamable HTTP) only.' }, 405);
  }

  if (!isAuthorized(req)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: RpcRequest | RpcRequest[];
  try {
    payload = await req.json();
  } catch {
    return json(rpcError(null, -32700, 'Parse error'), 400);
  }

  // A batch is answered with an array; notification-only batches get 202.
  if (Array.isArray(payload)) {
    const results = (await Promise.all(payload.map(handleRpc))).filter((r) => r !== null);
    return results.length ? json(results) : new Response(null, { status: 202, headers: corsHeaders });
  }

  const result = await handleRpc(payload);
  return result === null ? new Response(null, { status: 202, headers: corsHeaders }) : json(result);
});
