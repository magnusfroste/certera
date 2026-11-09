// ============================================================================
// api — certera.ink public API: certificates as an API call
// ============================================================================
//   GET  /v1/templates                 your saved designs (ids to sign from)
//   POST /v1/certificates              sign one certificate
//        { template_id, recipient_name, institution_name? }
//   GET  /v1/certificates/:id          one of your certificates
//   POST /v1/hooks/:template_id        "course completed" webhook from a course
//        platform; the learner's name is read from the payload
//        (?name_field=user.display_name to say where, ?institution= to override)
//
// Auth: Authorization: Bearer cert_…  (webhooks may use ?key=cert_… instead,
// since most platforms cannot set headers). Keys are created in Profile and
// stored only as a SHA-256 hash.
//
// (There is no /developers page yet; Profile → API shows ready-to-run examples.)
//
// A certificate is a real Hedera transaction, so: requests are idempotent
// (Idempotency-Key header; webhooks default to a hash of their body), and each
// account has a daily limit. The issuer domain is decided here from the
// account, exactly as in the studio — a request cannot claim one.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { submitDiplomaToHedera, sha256Hex } from "../_shared/hederaSubmit.ts";
import { chooseIssuerDomain } from "../_shared/issuerDomain.ts";
import { hasRecipientPlaceholder, personalizeHtml } from "../_shared/recipient.ts";
import {
  API_DAILY_LIMIT, API_KEY_PATTERN, SITE_URL, cleanName, extractRecipientName, institutionFromDsl, newDiplomaId,
} from "../_shared/publicApi.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

type Db = ReturnType<typeof admin>;
interface Caller { userId: string; keyId: string }

async function authenticate(db: Db, req: Request, url: URL, allowQueryKey: boolean): Promise<Caller | null> {
  const header = req.headers.get('Authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7).trim() : allowQueryKey ? (url.searchParams.get('key') ?? '') : '';
  if (!API_KEY_PATTERN.test(presented)) return null;
  const { data } = await db.from('api_keys').select('id, user_id').eq('token_hash', await sha256Hex(presented)).maybeSingle();
  if (!data) return null;
  await db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { userId: data.user_id, keyId: data.id };
}

interface CertRow {
  blockchain_id: string; recipient_name: string; institution_name: string; issuer_domain: string | null;
  diplomator_seal: string; created_at: string;
}
function present(row: CertRow) {
  let seal: Record<string, string> = {};
  try { seal = JSON.parse(row.diplomator_seal); } catch { /* legacy */ }
  return {
    id: row.blockchain_id,
    url: `${SITE_URL}/diploma/${row.blockchain_id}`,
    verify_url: `${SITE_URL}/verify/${row.blockchain_id}`,
    recipient_name: row.recipient_name,
    institution_name: row.institution_name,
    issuer_domain: row.issuer_domain,
    verified_issuer: Boolean(row.issuer_domain),
    hedera: {
      topic_id: seal.hederaTopicId ?? null,
      sequence_number: seal.hederaSequenceNumber ?? null,
      transaction_id: seal.hederaTxId ?? null,
      explorer_url: seal.hederaTxExplorerUrl ?? seal.hederaExplorerUrl ?? null,
    },
    created_at: row.created_at,
  };
}
const CERT_COLUMNS = 'blockchain_id, recipient_name, institution_name, issuer_domain, diplomator_seal, created_at';

async function issue(db: Db, caller: Caller, input: {
  templateId: string; recipientName: string; institutionOverride: string | null; idemKey: string | null;
}): Promise<Response> {
  if (!UUID.test(input.templateId)) return fail(400, 'invalid_template', 'template_id must be the id of one of your designs (see GET /v1/templates).');

  // The template must be the caller's own design.
  const { data: tpl } = await db.from('diploma_sessions')
    .select('id, diploma_html, diploma_css, diploma_dsl').eq('id', input.templateId).eq('user_id', caller.userId).maybeSingle();
  if (!tpl || !tpl.diploma_html) return fail(404, 'template_not_found', 'No design with that id in your account.');

  const institutionName = input.institutionOverride ?? institutionFromDsl(tpl.diploma_dsl);
  if (!institutionName) return fail(400, 'institution_required', 'This design has no institution name; send institution_name.');

  // Idempotency: claim the key first, so two concurrent retries cannot both sign.
  if (input.idemKey) {
    const { error: claimError } = await db.from('api_idempotency').insert({ user_id: caller.userId, idem_key: input.idemKey });
    if (claimError) {
      const { data: prior } = await db.from('api_idempotency')
        .select('diploma_id').eq('user_id', caller.userId).eq('idem_key', input.idemKey).maybeSingle();
      if (prior?.diploma_id) {
        const { data: row } = await db.from('signed_diplomas').select(CERT_COLUMNS).eq('blockchain_id', prior.diploma_id).maybeSingle();
        if (row) return json({ ...present(row as CertRow), idempotent_replay: true });
      }
      return fail(409, 'in_progress', 'A request with this idempotency key is still being processed. Retry shortly.');
    }
  }
  const release = async () => {
    if (input.idemKey) await db.from('api_idempotency').delete().eq('user_id', caller.userId).eq('idem_key', input.idemKey);
  };

  try {
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await db.from('hedera_signatures').select('diploma_id', { count: 'exact', head: true })
      .eq('issuer_id', caller.userId).gte('created_at', dayStart.toISOString());
    if ((count ?? 0) >= API_DAILY_LIMIT) {
      await release();
      return fail(429, 'daily_limit', `Daily limit of ${API_DAILY_LIMIT} certificates reached. It resets at 00:00 UTC.`);
    }

    // Issuer domain from the account, exactly as when signing in the studio.
    const { data: userData } = await db.auth.admin.getUserById(caller.userId);
    const { data: dnsRow } = await db.from('issuer_domains')
      .select('domain').eq('user_id', caller.userId).not('verified_at', 'is', null).maybeSingle();
    const issuerDomain = chooseIssuerDomain(dnsRow?.domain, userData?.user?.email, Boolean(userData?.user?.email_confirmed_at));

    const html = personalizeHtml(tpl.diploma_html, input.recipientName);
    const css = tpl.diploma_css ?? '';
    const contentHash = await sha256Hex(html + css);
    const diplomaId = newDiplomaId();

    const seal = await submitDiplomaToHedera({
      diplomaId, contentHash, recipientName: input.recipientName, institutionName, issuerDomain,
    });

    await db.from('hedera_signatures').insert({
      diploma_id: diplomaId, issuer_id: caller.userId, content_hash: contentHash, seal, issuer_domain: issuerDomain,
    });
    const { data: row, error: insertError } = await db.from('signed_diplomas').insert({
      blockchain_id: diplomaId,
      issuer_id: caller.userId,
      recipient_name: input.recipientName,
      institution_name: institutionName,
      diploma_html: html,
      diploma_css: css,
      content_hash: contentHash,
      // Same legacy fingerprint the studio stores in this column.
      signature: await sha256Hex(`${contentHash}:${input.recipientName}:diplomator_secure_key_2024`),
      diplomator_seal: JSON.stringify(seal),
      issuer_domain: issuerDomain,
      verification_url: `${SITE_URL}/verify/${diplomaId}`,
      diploma_url: `${SITE_URL}/diploma/${diplomaId}`,
    }).select(CERT_COLUMNS).single();
    if (insertError || !row) throw new Error('Failed to store certificate: ' + (insertError?.message ?? 'no row'));

    if (input.idemKey) {
      await db.from('api_idempotency').update({ diploma_id: diplomaId }).eq('user_id', caller.userId).eq('idem_key', input.idemKey);
    }
    return json({
      ...present(row as CertRow),
      // Tells an integrator their design has no {{recipient_name}} to fill in.
      ...(hasRecipientPlaceholder(tpl.diploma_html) ? {} : { warning: 'The design has no {{recipient_name}} placeholder, so the name is recorded but not printed on the certificate.' }),
    }, 201);
  } catch (e) {
    await release();
    throw e;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  // Served at …/functions/v1/api/v1/…; keep only what follows the function name.
  const path = url.pathname.replace(/^.*?\/api(?=\/|$)/, '').replace(/\/+$/, '') || '/';
  const hook = path.match(/^\/v1\/hooks\/([^/]+)$/);

  try {
    const db = admin();
    const caller = await authenticate(db, req, url, Boolean(hook));
    if (!caller) return fail(401, 'unauthorized', 'Send your API key as "Authorization: Bearer cert_…". Create one in Profile → API keys.');

    if (req.method === 'GET' && path === '/v1/templates') {
      const { data, error } = await db.from('diploma_sessions')
        .select('id, title, diploma_html, diploma_dsl, updated_at').eq('user_id', caller.userId).order('updated_at', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);
      return json({
        templates: (data ?? []).filter((t) => t.diploma_html).map((t) => ({
          id: t.id,
          title: t.title,
          institution_name: institutionFromDsl(t.diploma_dsl),
          has_recipient_placeholder: hasRecipientPlaceholder(t.diploma_html),
          updated_at: t.updated_at,
        })),
      });
    }

    const one = path.match(/^\/v1\/certificates\/([A-Za-z0-9_]{1,64})$/);
    if (req.method === 'GET' && one) {
      const { data } = await db.from('signed_diplomas').select(CERT_COLUMNS)
        .eq('blockchain_id', one[1]).eq('issuer_id', caller.userId).maybeSingle();
      return data ? json(present(data as CertRow)) : fail(404, 'not_found', 'No certificate with that id in your account.');
    }

    if (req.method === 'POST' && (path === '/v1/certificates' || hook)) {
      const raw = (await req.text()).slice(0, 100_000);
      let body: unknown;
      try { body = raw ? JSON.parse(raw) : {}; } catch { return fail(400, 'invalid_json', 'The request body must be JSON.'); }
      const b = (body ?? {}) as Record<string, unknown>;

      const headerKey = req.headers.get('Idempotency-Key')?.trim().slice(0, 200) || null;
      if (hook) {
        const recipientName = extractRecipientName(body, url.searchParams.get('name_field'));
        if (!recipientName) {
          return fail(422, 'name_not_found', 'Could not find the learner\'s name in the payload. Add ?name_field=path.to.name to the webhook URL.');
        }
        return await issue(db, caller, {
          templateId: hook[1],
          recipientName,
          institutionOverride: cleanName(url.searchParams.get('institution')),
          // Platforms retry webhooks; the same body for the same template is the same completion.
          idemKey: headerKey ?? `hook:${await sha256Hex(`${hook[1]}\n${raw}`)}`,
        });
      }

      const recipientName = cleanName(b.recipient_name);
      if (!recipientName) return fail(400, 'invalid_recipient', 'recipient_name is required (1–120 characters).');
      if (b.institution_name !== undefined && !cleanName(b.institution_name)) {
        return fail(400, 'invalid_institution', 'institution_name must be 1–120 characters.');
      }
      return await issue(db, caller, {
        templateId: String(b.template_id ?? ''),
        recipientName,
        institutionOverride: cleanName(b.institution_name),
        idemKey: headerKey,
      });
    }

    return fail(404, 'not_found', 'Unknown endpoint. Available: GET /v1/templates, POST /v1/certificates, GET /v1/certificates/:id, POST /v1/hooks/:template_id.');
  } catch (e) {
    console.error('api error:', e instanceof Error ? e.message : e);
    return fail(500, 'internal_error', 'Something went wrong on our side. The request can be retried safely with the same Idempotency-Key.');
  }
});
