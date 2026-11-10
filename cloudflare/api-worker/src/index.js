// api.certera.ink → the certera public API.
//
// The API is a Supabase edge function, reachable at
//   https://<project>.supabase.co/functions/v1/api/v1/…
// This Worker gives it the address integrators see in the docs:
//   https://api.certera.ink/v1/…
// It forwards the request as it is (method, path, query, body and the headers
// the API reads) and returns the response unchanged. It holds no secrets and
// makes no decisions: authentication, limits and idempotency all stay in the
// API function.

const ORIGIN = 'https://jiokwdsnmgmcjoyxrwax.supabase.co/functions/v1/api';

// Only what the API uses. Cookies, client IP headers and the like are not passed on.
const FORWARDED_HEADERS = ['authorization', 'content-type', 'idempotency-key', 'accept'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // The bare domain is what people open in a browser: send them to the docs.
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect('https://www.certera.ink/developers', 302);
    }
    if (!url.pathname.startsWith('/v1/')) {
      return json({ error: { code: 'not_found', message: 'Unknown endpoint. See https://www.certera.ink/developers' } }, 404);
    }
    if (!['GET', 'POST'].includes(request.method)) {
      return json({ error: { code: 'method_not_allowed', message: 'Use GET or POST.' } }, 405);
    }

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    let upstream;
    try {
      upstream = await fetch(ORIGIN + url.pathname + url.search, {
        method: request.method,
        headers,
        body: request.method === 'POST' ? request.body : undefined,
        redirect: 'manual',
      });
    } catch {
      return json({ error: { code: 'upstream_unreachable', message: 'The API is temporarily unreachable. Retry with the same Idempotency-Key.' } }, 502);
    }

    const out = new Headers(CORS);
    out.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');
    // API responses are per key and must never be cached by anything in between.
    out.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
