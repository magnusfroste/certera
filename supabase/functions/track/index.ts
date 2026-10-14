// ============================================================================
// track — first-party, cookieless page-view beacon for certera.ink
// ============================================================================
// Receives one beacon per page view from the SPA and records it in page_views,
// which the ops-mcp get_traffic tool reads.
//
// Privacy: no IP address and no cookie is stored. A visitor is identified only
// by sha256(daily_salt | ip | user_agent), truncated, where the salt is random
// per UTC day and deleted once that day is over — after which a hash can no
// longer be recomputed or linked to anyone. See the page_views migration.
//
// This endpoint is public (verify_jwt = false): the beacon is sent by anonymous
// visitors with navigator.sendBeacon, which cannot attach auth headers. It only
// ever inserts one narrowly-validated row, so the worst abuse is noise in the
// numbers. It always answers 204, so a failure here can never affect the page.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const noContent = () => new Response(null, { status: 204, headers: corsHeaders });

// Only the live site is measured. Preview, editor and local builds send nothing
// client-side either; this is the server-side backstop.
const ALLOWED_HOST = /(^|\.)certera\.ink$/i;

// Agents that announce themselves. Crawlers are stored with is_bot = true rather
// than dropped, so their volume stays visible, but excluded from default counts.
const BOT_UA =
  /bot|crawl|spider|slurp|scrape|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|curl|wget|python-requests|httpclient|go-http|java\/|okhttp|axios|node-fetch|phantom|selenium|puppeteer|playwright/i;

function deviceOf(ua: string): string {
  if (/ipad|tablet|kindle|silk/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function countryOf(req: Request): string | null {
  for (const h of ['cf-ipcountry', 'x-vercel-ip-country', 'x-country-code']) {
    const v = (req.headers.get(h) ?? '').toUpperCase();
    // Reject placeholders some proxies emit for unknown / Tor traffic.
    if (/^[A-Z]{2}$/.test(v) && v !== 'XX' && v !== 'T1') return v;
  }
  return null;
}

function cleanPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 300) return null;
  // Keep the pathname only: query strings and fragments can carry personal data.
  return raw.split(/[?#]/)[0] || '/';
}

function referrerHost(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    // Internal navigation is not a traffic source.
    return host && !ALLOWED_HOST.test(host) ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

/**
 * Today's salt, created on first use. The insert ignores conflicts so two
 * concurrent first-of-the-day requests converge on one salt, and the first
 * request of a new day also deletes every older salt — which is what makes
 * yesterday's hashes permanently unlinkable.
 */
async function saltForToday(): Promise<string> {
  const db = admin();
  const day = new Date().toISOString().slice(0, 10);
  const existing = await db.from('traffic_salts').select('salt').eq('day', day).maybeSingle();
  if (existing.data?.salt) return existing.data.salt;

  await db.from('traffic_salts').upsert({ day, salt: randomSalt() }, { onConflict: 'day', ignoreDuplicates: true });
  await db.from('traffic_salts').delete().lt('day', day);

  const created = await db.from('traffic_salts').select('salt').eq('day', day).single();
  if (!created.data?.salt) throw new Error('could not establish today\'s salt');
  return created.data.salt;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return noContent();

  try {
    // Browsers attach Origin to beacon POSTs; anything else is not our page.
    const origin = req.headers.get('Origin') ?? '';
    let originHost = '';
    try { originHost = new URL(origin).hostname; } catch { /* missing or malformed */ }
    if (!ALLOWED_HOST.test(originHost)) return noContent();

    // The beacon is sent as text/plain to avoid a CORS preflight, so parse here.
    const body = JSON.parse((await req.text()).slice(0, 2000) || '{}');
    const path = cleanPath(body.path);
    if (!path) return noContent();

    const ua = (req.headers.get('user-agent') ?? '').slice(0, 400);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    const salt = await saltForToday();
    const visitorHash = (await sha256Hex(`${salt}|${ip}|${ua}`)).slice(0, 16);

    const { error } = await admin().from('page_views').insert({
      path,
      referrer_host: referrerHost(body.referrer),
      device: deviceOf(ua),
      country: countryOf(req),
      visitor_hash: visitorHash,
      // No user-agent at all is not a browser.
      is_bot: !ua || BOT_UA.test(ua),
    });
    if (error) console.error('page_views insert failed:', error.message);
  } catch (e) {
    console.error('track failed:', e instanceof Error ? e.message : e);
  }
  return noContent();
});
