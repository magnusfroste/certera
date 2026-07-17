import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};


import { renderDSL, esc, PALETTES, PALETTE_IDS, TYPOGRAPHY_IDS, type DiplomaDSL } from "../_shared/diplomaRenderer.ts";

// ── Shared request/DSL types ──
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: string; media_type: string; data: string } };

interface AIMessage {
  role: string;
  content: string | ContentPart[];
}



// ─────────────────────────────────────────────────────────────────
// 7b. DSL VALIDATION (design guardrails)
// ─────────────────────────────────────────────────────────────────
// Representative solid color per background style, for contrast checks
const BG_REPRESENTATIVE: Record<string, string> = {
  'parchment': '#eee2cd', 'clean-white': '#ffffff', 'ivory': '#fdfaf3',
  'gradient-warm': '#f8f1e8', 'gradient-cool': '#edf1f6', 'linen': '#faf0e6',
  'marble': '#f0f0f0', 'ocean-deep': '#c4dde9', 'cosmic-dark': '#16213e',
  'botanical-green': '#e8f2e2', 'vintage-sepia': '#eeddc3', 'watercolor-soft': '#f0e8f0',
  'royal-burgundy': '#f2d8d8',
};
const DARK_BGS = new Set(['cosmic-dark']);

function relativeLuminance(hex: string): number | null {
  const m = hex.match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Fixes that don't need the model: drop overrides that would produce
// unreadable or mismatched designs, keep the curated palette instead.
function applyDeterministicFixes(dsl: DiplomaDSL): void {
  const palette = PALETTES[dsl.palette ?? ''] || PALETTES['ivory-navy'];
  const isLightText = palette.text === 'light';

  // A background override whose darkness doesn't match the palette's text
  // color would make body text unreadable — drop the override.
  if (dsl.background?.style && DARK_BGS.has(dsl.background.style) !== isLightText) {
    console.warn(`Dropping background override '${dsl.background.style}' (mismatches '${dsl.palette}' text color)`);
    delete dsl.background;
  }

  const bgKey = dsl.background?.style || palette.bg;
  const bgColor = BG_REPRESENTATIVE[bgKey] || '#ffffff';

  // Brand primary is used for headings/recipient: needs real contrast (WCAG
  // large-text threshold). Brand accent is decorative: a lower bar.
  if (dsl.brand?.primaryColor) {
    const ratio = contrastRatio(dsl.brand.primaryColor, bgColor);
    if (ratio !== null && ratio < 3) {
      console.warn(`Dropping brand.primaryColor ${dsl.brand.primaryColor} (contrast ${ratio.toFixed(2)}:1 on ${bgKey})`);
      delete dsl.brand.primaryColor;
    }
  }
  if (dsl.brand?.accentColor) {
    const ratio = contrastRatio(dsl.brand.accentColor, bgColor);
    if (ratio !== null && ratio < 1.6) {
      console.warn(`Dropping brand.accentColor ${dsl.brand.accentColor} (contrast ${ratio.toFixed(2)}:1 on ${bgKey})`);
      delete dsl.brand.accentColor;
    }
  }
}

// Issues the model should fix itself (content doesn't fit the layout).
// Returned strings are fed back to the model in one repair round.
function validateDsl(dsl: DiplomaDSL): string[] {
  const issues: string[] = [];
  const descLimit = dsl.layout?.composition === 'split-horizontal' ? 280 : 420;
  const desc = dsl.body?.description ?? '';
  if (desc.length > descLimit) {
    issues.push(`body.description is ${desc.length} characters but must be at most ${descLimit} for the '${dsl.layout?.composition || 'classic-stack'}' composition — shorten it or pick another composition`);
  }
  if ((dsl.body?.title ?? '').length > 60) issues.push('body.title must be at most 60 characters');
  if ((dsl.header?.institutionName ?? '').length > 60) issues.push('header.institutionName must be at most 60 characters');
  if ((dsl.header?.subtitle ?? '').length > 90) issues.push('header.subtitle must be at most 90 characters');
  if ((dsl.seal?.text ?? '').length > 20) issues.push('seal.text must be at most 20 characters');
  return issues;
}

// ─────────────────────────────────────────────────────────────────
// 8. JSON SCHEMA (used by all providers for structured output)
// ─────────────────────────────────────────────────────────────────

const DSL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    palette: { type: 'string', enum: PALETTE_IDS, description: 'Curated color palette (decides bg + primary + accent)' },
    typography: {
      type: 'object',
      properties: { pair: { type: 'string', enum: TYPOGRAPHY_IDS } },
      required: ['pair'],
    },
    layout: {
      type: 'object',
      properties: {
        orientation: { type: 'string', enum: ['landscape','portrait'] },
        padding: { type: 'string', enum: ['compact','normal','spacious'] },
        composition: { type: 'string', enum: ['classic-stack','banner-top','medallion-center','split-horizontal','corner-accent'] },
      },
      required: ['orientation','padding','composition'],
    },
    decorations: {
      type: 'array',
      items: { type: 'string', enum: ['corner-flourishes','watermark-monogram','ribbon-banner','guilloche-pattern','laurel-side','subtle-grid'] },
      maxItems: 2,
    },
    header: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['serif-centered','modern-left','elegant-script','bold-caps','minimal','monumental'] },
        institutionName: { type: 'string' },
        subtitle: { type: 'string' },
      },
      required: ['style','institutionName'],
    },
    border: {
      type: 'object',
      properties: { style: { type: 'string', enum: ['ornamental','double-line','modern','minimal','classical','art-deco','wave','none'] } },
      required: ['style'],
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        preText: { type: 'string' },
        recipientName: { type: 'string' },
        description: { type: 'string' },
        date: { type: 'string' },
        courseOrProgram: { type: 'string' },
      },
      required: ['title','recipientName','description'],
    },
    seal: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['classical-round','star','shield','ribbon','modern-circle','rosette','compass','laurel-wreath','none'] },
        position: { type: 'string', enum: ['bottom-right','bottom-left','bottom-center'] },
        text: { type: 'string' },
      },
      required: ['style','position'],
    },
    signature: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['handwriting','formal','elegant','stamp','digital'] },
        name: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['style','name'],
    },
  },
  required: ['palette','typography','layout','header','border','body','seal','signature'],
};

// ─────────────────────────────────────────────────────────────────
// 9. PROMPTS
// ─────────────────────────────────────────────────────────────────
function dslSystemPrompt(variant: number): string {
  return `You are an expert diploma designer. Pick from predefined, pre-tested visual blocks.

DESIGN HEURISTIC:
- Choose ONE palette that matches the requested vibe. The palette determines bg + colors automatically.
- Choose ONE typography pair that fits the era/feel (serif-classic for formal, sans-modern for tech, display-editorial for premium, script-romantic for arts, mono-tech for dev, mixed-contrast for bold).
- Choose ONE composition: classic-stack (safe default), banner-top (modern enterprise), medallion-center (award-ceremony), split-horizontal (landscape modern), corner-accent (minimal premium).
- Pick 0–2 decorations max. They are overlays — do not pick more than 2 or it gets cluttered.

CONSTRAINTS:
- body.recipientName MUST be exactly "{{recipient_name}}" (literal placeholder).
- signature.name defaults to "Mr Diploma" unless user specifies.
- Do NOT include customCss unless absolutely required.
- Available palettes: ${PALETTE_IDS.join(', ')}.
- Available typography pairs: ${TYPOGRAPHY_IDS.join(', ')}.

VARIATION SEED: ${variant}/5 — when multiple valid choices exist, lean toward variation #${variant} so repeated prompts produce different designs.

Return ONLY the JSON object matching the schema.`;
}

const ITERATION_SYSTEM_PROMPT = `You are an expert diploma and certificate designer. You modify existing HTML/CSS diplomas.
You CAN add CSS animations, decorative pseudo-elements, modify layout/colors/fonts/spacing.
FORBIDDEN: QR codes, <img> tags, external images, markdown fences, JavaScript.
Format response as:
MESSAGE: [brief explanation]
HTML: [complete HTML]
CSS: [complete CSS]
Make ONLY the specific changes requested.`;

// DSL-native iteration: the model modifies the structured design instead of
// free-form HTML/CSS, so every change stays inside the design system.
function dslIterationSystemPrompt(currentDsl: DiplomaDSL): string {
  return `You are an expert diploma designer. You MODIFY an existing diploma design expressed as a DSL.

CURRENT DESIGN:
${JSON.stringify(currentDsl, null, 2)}

RULES:
- Apply ONLY the changes the user asks for. Keep every other field exactly as it is in the current design.
- Text changes (title, description, names, dates) go in the corresponding DSL fields.
- Style changes are made by picking different predefined blocks — never invent values outside the schema.
- Keep body.recipientName unchanged unless the user explicitly asks to change the recipient.
- Do NOT include customCss unless absolutely required.
- Available palettes: ${PALETTE_IDS.join(', ')}.
- Available typography pairs: ${TYPOGRAPHY_IDS.join(', ')}.

Return the COMPLETE updated design (all fields, not just the changed ones).`;
}

// ─────────────────────────────────────────────────────────────────
// 10. PROVIDER ADAPTERS (structured output, provider-agnostic)
// ─────────────────────────────────────────────────────────────────
interface AIResponse { text: string; json?: DiplomaDSL }

async function callAnthropic(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body: Record<string, unknown> = { model, max_tokens: 4000, system: systemPrompt, messages };
  if (structured) {
    body.tools = [{ name: 'emit_diploma_dsl', description: 'Emit the diploma DSL', input_schema: DSL_JSON_SCHEMA }];
    body.tool_choice = { type: 'tool', name: 'emit_diploma_dsl' };
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Anthropic API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();

  if (structured) {
    const toolUse = (data.content || []).find((c: { type: string; input?: DiplomaDSL }) => c.type === 'tool_use');
    if (toolUse?.input) return { text: JSON.stringify(toolUse.input), json: toolUse.input };
  }
  return { text: data.content?.[0]?.text || '' };
}

function toOpenAIMessages(systemPrompt: string, messages: AIMessage[]): Array<{ role: string; content: unknown }> {
  const oaiMsgs: Array<{ role: string; content: unknown }> = [{ role: 'system', content: systemPrompt }];
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      const parts = msg.content.map((p) =>
        p.type === 'text' ? { type: 'text', text: p.text }
        : { type: 'image_url', image_url: { url: `data:${p.source.media_type};base64,${p.source.data}` } });
      oaiMsgs.push({ role: msg.role, content: parts });
    } else oaiMsgs.push({ role: msg.role, content: msg.content });
  }
  return oaiMsgs;
}

async function callOpenAI(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const body: Record<string, unknown> = { model, max_tokens: 4000, messages: toOpenAIMessages(systemPrompt, messages) };
  if (structured) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'diploma_dsl', schema: DSL_JSON_SCHEMA, strict: false },
    };
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

async function callGemini(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const allParts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [];
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const p of msg.content) {
        if (p.type === 'text') allParts.push({ text: p.text });
        else if (p.type === 'image') allParts.push({ inline_data: { mime_type: p.source.media_type, data: p.source.data } });
      }
    } else allParts.push({ text: msg.content });
  }

  const generationConfig: Record<string, unknown> = { maxOutputTokens: 4000 };
  if (structured) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = DSL_JSON_SCHEMA;
  }

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: allParts }],
      generationConfig,
    }),
  });
  if (!r.ok) throw new Error(`Gemini API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
}

async function callOpenRouter(systemPrompt: string, messages: AIMessage[], model: string, structured: boolean): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const body: Record<string, unknown> = { model, max_tokens: 4000, messages: toOpenAIMessages(systemPrompt, messages) };
  if (structured) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: 'diploma_dsl', schema: DSL_JSON_SCHEMA, strict: false },
    };
  }

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://certera.ink',
      'X-Title': 'Certera Diploma Generator',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenRouter API error ${r.status}: ${(await r.text()).substring(0,300)}`);
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || '';
  return { text };
}

// ─────────────────────────────────────────────────────────────────
// 11. JSON extraction fallback
// ─────────────────────────────────────────────────────────────────
function extractJson(text: string): DiplomaDSL {
  let cleaned = text.replace(/```(?:json)?\s*/gi,'').replace(/```\s*/g,'').trim();
  const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON found');
  cleaned = cleaned.substring(s, e+1);
  try { return JSON.parse(cleaned); }
  catch {
    // eslint-disable-next-line no-control-regex -- intentionally strip control chars from malformed model JSON
    cleaned = cleaned.replace(/,\s*}/g,'}').replace(/,\s*]/g,']').replace(/[\x00-\x1F\x7F]/g,'');
    return JSON.parse(cleaned);
  }
}

// ─────────────────────────────────────────────────────────────────
// 12. Web scrape helpers
// ─────────────────────────────────────────────────────────────────
// Basic SSRF guard: only fetch public http(s) hosts, never IP literals or local names
const isSafePublicUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false; // IPv4 literal
    if (host.includes(':') || host.startsWith('[')) return false; // IPv6 literal
    return true;
  } catch {
    return false;
  }
};

interface BrandData { brandName: string; colors: string[]; fonts: string[] }

// Extract brand colors/fonts/name from raw HTML (+ optional pre-parsed metadata)
const extractBrandFromHtml = (
  html: string,
  url: string,
  meta?: { title?: string; siteName?: string },
): BrandData => {
  const colors = html.match(/#[0-9a-fA-F]{3,6}/g) || [];
  const fonts = new Set<string>();
  for (const m of html.matchAll(/font-family\s*:\s*([^;]+)/gi)) {
    const f = m[1].replace(/['"]/g, '').split(',')[0].trim();
    if (f && f !== 'inherit') fonts.add(f);
  }
  const title = meta?.title || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
  const siteName = meta?.siteName || html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/i)?.[1] || '';
  return {
    brandName: siteName || title.split(/[-|–—]/)[0].trim() || new URL(url).hostname.replace('www.', ''),
    colors: [...new Set(colors)].slice(0, 5),
    fonts: [...fonts].slice(0, 3),
  };
};

// Scrape via Firecrawl (renders JS, cleaner metadata); returns null if unavailable/failed
const scrapeWithFirecrawl = async (url: string): Promise<BrandData | null> => {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  try {
    const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ url, formats: ['html'], onlyMainContent: false, timeout: 20000 }),
    });
    if (!r.ok) throw new Error(`Firecrawl HTTP ${r.status}: ${(await r.text()).substring(0, 200)}`);
    const data = await r.json();
    if (!data?.success || !data?.data) throw new Error('Firecrawl returned no data');
    const html: string = data.data.html || data.data.rawHtml || '';
    const md = data.data.metadata || {};
    return extractBrandFromHtml(html, url, {
      title: md.title || md.ogTitle,
      siteName: md.ogSiteName || md['og:site_name'],
    });
  } catch (e) {
    console.error('Firecrawl scrape failed, falling back:', e instanceof Error ? e.message : e);
    return null;
  }
};

// Direct fetch fallback (no JS rendering)
const scrapeDirect = async (url: string): Promise<BrandData | null> => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiplomaBot/1.0)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return extractBrandFromHtml(await r.text(), url);
  } catch (e) {
    console.error('Direct scrape failed:', e instanceof Error ? e.message : e);
    return null;
  }
};

const scrapeWebsiteData = async (url: string): Promise<BrandData | null> => {
  if (!isSafePublicUrl(url)) {
    console.error('Scrape: URL is not a public http(s) address');
    return null;
  }
  // Prefer Firecrawl when configured; fall back to a direct fetch.
  return (await scrapeWithFirecrawl(url)) || (await scrapeDirect(url));
};

// ─────────────────────────────────────────────────────────────────
// 13. MAIN HANDLER
// ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, requestType, imageData, url, currentHtml, currentCss, currentDsl, userFullName } = await req.json();

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Derive identity from the token — never trust an isGuest flag from the body.
    const authHeader = req.headers.get('Authorization') ?? '';
    let isAuthenticated = false;
    if (authHeader.startsWith('Bearer ')) {
      const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
      isAuthenticated = !!user;
    }

    // Guests are allowed a limited number of generations per IP per day,
    // enforced server-side (the localStorage counter in the client is only UX).
    if (!isAuthenticated) {
      const GUEST_DAILY_LIMIT = 10;
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const ipHash = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))),
      ).map((b) => b.toString(16).padStart(2, '0')).join('');

      const dayMs = 24 * 60 * 60 * 1000;
      const { data: usage } = await supabaseAdmin.from('guest_usage').select('*').eq('ip_hash', ipHash).maybeSingle();
      const windowExpired = !usage || Date.now() - new Date(usage.window_start).getTime() > dayMs;
      const count = windowExpired ? 0 : usage.count;

      if (count >= GUEST_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: 'Guest limit reached', message: 'You have used all free generations for today. Create an account for unlimited access!' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error: usageError } = await supabaseAdmin.from('guest_usage').upsert({
        ip_hash: ipHash,
        count: count + 1,
        window_start: windowExpired ? new Date().toISOString() : usage.window_start,
      });
      // If the table doesn't exist yet (migration not applied), log but don't block guests.
      if (usageError) console.error('guest_usage upsert failed:', usageError.message);
    }

    // Provider selection
    const { data: settingData } = await supabaseAdmin.from('app_settings').select('value').eq('key','ai_provider').single();
    const cfg = (settingData?.value as { provider: string; model: string }) || { provider: 'anthropic', model: 'claude-sonnet-4-20250514' };
    const { provider, model } = cfg;
    console.log(`Provider: ${provider}, model: ${model}`);

    const isIteration = !!(currentHtml && currentCss) && requestType !== 'image' && requestType !== 'url';
    // DSL-native iteration when the client still has the structured design;
    // legacy raw HTML/CSS iteration only for sessions without a DSL
    // (older sessions, or manually edited HTML/CSS).
    const dslIteration = isIteration && currentDsl && typeof currentDsl === 'object';
    const variant = Math.floor(Math.random() * 5) + 1; // 1..5 seed

    let systemPrompt: string;
    let aiMessages: AIMessage[];
    let structured = true;

    if (dslIteration) {
      systemPrompt = dslIterationSystemPrompt(currentDsl as DiplomaDSL);
      aiMessages = ((messages || []) as AIMessage[]).filter((m) => m.role !== 'system');
    } else if (isIteration) {
      systemPrompt = `${ITERATION_SYSTEM_PROMPT}\n\nCURRENT HTML:\n${currentHtml}\nCURRENT CSS:\n${currentCss}`;
      aiMessages = ((messages || []) as AIMessage[]).filter((m) => m.role !== 'system');
      structured = false;
    } else if (requestType === 'image') {
      systemPrompt = dslSystemPrompt(variant) + '\n\nAnalyze the image and choose blocks reflecting its style.';
      aiMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: 'Design a diploma inspired by this image.' },
          { type: 'image', source: { type: 'base64', media_type: imageData.type, data: imageData.data } },
        ],
      }];
    } else if (requestType === 'url') {
      const ws = await scrapeWebsiteData(url);
      systemPrompt = dslSystemPrompt(variant) + (ws ? `\n\nBRAND: ${ws.brandName}\nColors: ${ws.colors.join(', ')}\nFonts: ${ws.fonts.join(', ')}` : '');
      aiMessages = [{ role: 'user', content: `Create a diploma for the brand at ${url}.` }];
    } else {
      systemPrompt = dslSystemPrompt(variant);
      aiMessages = ((messages || []) as AIMessage[]).filter((m) => m.role !== 'system');
    }

    // Call provider
    let result: AIResponse;
    const callProvider = async (p: string, m: string, msgs: AIMessage[] = aiMessages): Promise<AIResponse> => {
      switch (p) {
        case 'openai':     return callOpenAI(systemPrompt, msgs, m, structured);
        case 'gemini':     return callGemini(systemPrompt, msgs, m, structured);
        case 'openrouter': return callOpenRouter(systemPrompt, msgs, m, structured);
        case 'anthropic':
        default:           return callAnthropic(systemPrompt, msgs, m, structured);
      }
    };
    // Default model per provider (used in fallback)
    const defaultModelFor: Record<string, string> = {
      anthropic: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o-mini',
      gemini: 'gemini-2.5-flash-preview-05-20',
      openrouter: 'openai/gpt-4o-mini',
    };
    // Build fallback chain: configured first, then any other provider with a key set
    const keyEnv: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };
    const chain: { p: string; m: string }[] = [{ p: provider, m: model }];
    for (const p of ['anthropic', 'openai', 'gemini', 'openrouter']) {
      if (p !== provider && Deno.env.get(keyEnv[p])) {
        chain.push({ p, m: defaultModelFor[p] });
      }
    }
    let lastErr: unknown;
    let usedProvider = provider;
    let usedModel = model;
    for (const step of chain) {
      try {
        result = await callProvider(step.p, step.m);
        usedProvider = step.p;
        usedModel = step.m;
        if (step.p !== provider) console.warn(`Fell back from ${provider} to ${step.p}`);
        break;
      } catch (e) {
        lastErr = e;
        console.error(`Provider ${step.p} failed:`, e instanceof Error ? e.message : e);
      }
    }
    if (!result!) throw lastErr || new Error('All providers failed');

    if (isIteration && !dslIteration) {
      const strip = (s: string) => s.replace(/```(?:html|css|)\s*/gi,'').replace(/```\s*/g,'').trim();
      const msg = result.text.match(/MESSAGE:\s*(.*?)(?=HTML:|$)/s)?.[1]?.trim() || "I've updated the diploma!";
      const htmlPart = strip(result.text.match(/HTML:\s*(.*?)(?=CSS:|$)/s)?.[1]?.trim() || '');
      const cssPart = strip(result.text.match(/CSS:\s*(.*?)$/s)?.[1]?.trim() || '');
      return new Response(JSON.stringify({ message: msg, html: htmlPart, css: cssPart, provider: usedProvider, model: usedModel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let dsl: DiplomaDSL = result.json || extractJson(result.text);

    // Guardrails: content that doesn't fit the layout gets one repair round
    // with the model; readability problems are fixed deterministically.
    const issues = validateDsl(dsl);
    if (issues.length > 0) {
      console.warn('DSL validation issues, requesting repair:', issues);
      try {
        const repairMessages: AIMessage[] = [
          ...aiMessages,
          { role: 'assistant', content: JSON.stringify(dsl) },
          { role: 'user', content: `The design has problems that must be fixed:\n- ${issues.join('\n- ')}\nReturn the complete corrected design. Change as little as possible.` },
        ];
        const repaired = await callProvider(usedProvider, usedModel, repairMessages);
        const repairedDsl: DiplomaDSL = repaired.json || extractJson(repaired.text);
        const remaining = validateDsl(repairedDsl);
        if (remaining.length < issues.length) {
          dsl = repairedDsl;
        }
        if (remaining.length > 0) console.warn('DSL issues remaining after repair:', remaining);
      } catch (e) {
        console.error('DSL repair round failed, rendering original:', e instanceof Error ? e.message : e);
      }
    }
    applyDeterministicFixes(dsl);

    console.log('DSL palette:', dsl.palette, 'comp:', dsl.layout?.composition, 'decos:', dsl.decorations);
    const rendered = renderDSL(dsl);

    // Substitute the recipient placeholder the DSL prompt asks the model to emit
    const recipient = typeof userFullName === 'string' && userFullName.trim() ? userFullName.trim() : '';
    if (recipient) {
      rendered.html = rendered.html.replaceAll('{{recipient_name}}', esc(recipient));
    }

    const message = dslIteration
      ? "I've updated the diploma!"
      : `Designed using ${dsl.palette} palette · ${dsl.typography?.pair} typography · ${dsl.layout?.composition} layout (variant ${variant}).`;

    return new Response(JSON.stringify({
      message,
      html: rendered.html,
      css: rendered.css,
      provider: usedProvider,
      model: usedModel,
      dsl,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('generate-diploma error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, message: 'Sorry, an error occurred while generating your diploma. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
