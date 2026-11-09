// ============================================================================
// issuer-domain — prove control of an organisation domain with a DNS record
// ============================================================================
// Actions (POST JSON { action, domain? }), all for the signed-in user only:
//   status — the account's domain, the record to publish, whether verified
//   start  — choose a domain; issues a fresh token (resets verification)
//   check  — look the TXT record up over DNS-over-HTTPS; marks it verified
//   remove — forget the domain
// verified_at is set here and nowhere else (issuer_domains has no client write
// policy), so the stamp can only come from a record actually found in DNS.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  dnsRecordName, dnsRecordValue, normalizeDomainInput, txtRecordsMatch,
} from "../_shared/issuerDomain.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Two public resolvers, so one being down or slow to see a new record does
// not fail the check.
const RESOLVERS = [
  (name: string) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
  (name: string) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
];

async function lookupTxt(name: string): Promise<{ answers: string[]; reached: boolean }> {
  const answers: string[] = [];
  let reached = false;
  for (const url of RESOLVERS) {
    try {
      const res = await fetch(url(name), {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      reached = true;
      const body = await res.json() as { Answer?: { type: number; data: string }[] };
      for (const a of body.Answer ?? []) if (a.type === 16) answers.push(a.data);
      if (answers.length) break;
    } catch {
      // try the next resolver
    }
  }
  return { answers, reached };
}

const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, '0')).join('');

type Row = { domain: string; token: string; verified_at: string | null; last_checked_at: string | null };
const view = (row: Row | null) =>
  row
    ? {
        domain: row.domain,
        verified: Boolean(row.verified_at),
        verifiedAt: row.verified_at,
        lastCheckedAt: row.last_checked_at,
        record: { type: 'TXT', name: dnsRecordName(row.domain), value: dnsRecordValue(row.token) },
      }
    : { domain: null, verified: false };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  // Identity from the JWT, never from the body.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const load = async () => {
    const { data, error } = await admin.from('issuer_domains')
      .select('domain, token, verified_at, last_checked_at').eq('user_id', user.id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Row | null;
  };

  try {
    const { action, domain: rawDomain } = await req.json().catch(() => ({}));

    if (action === 'status') return json(view(await load()));

    if (action === 'start') {
      const domain = normalizeDomainInput(rawDomain);
      if (!domain) {
        return json({ error: 'Enter a domain your organisation owns, such as nordlys.se. Personal email providers cannot be verified.' }, 400);
      }
      const current = await load();
      // Same domain again keeps its token, so a record already published stays valid.
      if (current?.domain === domain) return json(view(current));
      const { error } = await admin.from('issuer_domains').upsert({
        user_id: user.id, domain, token: newToken(), verified_at: null, last_checked_at: null,
      }, { onConflict: 'user_id' });
      if (error) throw new Error(error.message);
      return json(view(await load()));
    }

    if (action === 'check') {
      const current = await load();
      if (!current) return json({ error: 'Choose a domain first.' }, 400);
      const { answers, reached } = await lookupTxt(dnsRecordName(current.domain));
      if (!reached) return json({ ...view(current), checked: false, error: 'Could not reach DNS right now — try again in a minute.' }, 503);
      const found = txtRecordsMatch(answers, current.token);
      const now = new Date().toISOString();
      const { error } = await admin.from('issuer_domains').update({
        last_checked_at: now,
        // Once verified, a later failed check (e.g. while DNS is being edited)
        // does not revoke it; removing the domain does.
        ...(found ? { verified_at: current.verified_at ?? now } : {}),
      }).eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return json({ ...view(await load()), checked: true, found, recordsSeen: answers.length });
    }

    if (action === 'remove') {
      const { error } = await admin.from('issuer_domains').delete().eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return json(view(null));
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('issuer-domain error:', e instanceof Error ? e.message : e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
