import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import issueCertificates from '@/lib/mcp/tools/issueCertificates';
import createTemplate from '@/lib/mcp/tools/createTemplate';

const TEMPLATE = '6f0c1a52-6f8e-4c57-9a61-3f1f0a2b9c11';
const ctx = { getToken: () => 'aaa.bbb.ccc', getUserId: () => 'u1' } as never;
const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
let respond: (body: Record<string, unknown>) => { status: number; json: unknown };

const run = (tool: { handler: unknown }, input: unknown) =>
  (tool.handler as (i: unknown, c: unknown) => Promise<{ content: { text: string }[]; structuredContent: Record<string, unknown[]> }>)(input, ctx);

beforeEach(() => {
  calls.length = 0;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  vi.stubGlobal('fetch', async (url: string, init: { headers: Record<string, string>; body?: string }) => {
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({ url, headers: init.headers, body });
    const r = respond(body);
    return { ok: r.status < 400, status: r.status, json: async () => r.json };
  });
});
afterEach(() => vi.unstubAllGlobals());

const cert = (name: string) => ({ id: `DIP_${name}`, url: `https://www.certera.ink/diploma/DIP_${name}`, verify_url: 'v', recipient_name: name, institution_name: 'Nordlys', verified_issuer: false, issuer_domain: null });

describe('MCP: issuing certificates', () => {
  it('issues one per name as the signed-in person, in order', async () => {
    respond = (b) => ({ status: 201, json: cert(b.recipient_name as string) });
    const out = await run(issueCertificates, { template_id: TEMPLATE, recipient_names: ['Aya', ' Bo '], reference: 'run-1' });
    expect(calls.map((c) => c.body.recipient_name)).toEqual(['Aya', 'Bo']);
    expect(calls[0].url).toBe('https://example.supabase.co/functions/v1/api/v1/certificates');
    expect(calls[0].headers.Authorization).toBe('Bearer aaa.bbb.ccc');
    expect(calls[1].headers['Idempotency-Key']).toBe('mcp:run-1:Bo');
    expect(out.content[0].text).toContain('Issued 2 of 2');
    expect(out.content[0].text).toContain('Bo: https://www.certera.ink/diploma/DIP_Bo');
  });

  it('reports who was not issued and why, and keeps going', async () => {
    respond = (b) => b.recipient_name === 'Bo'
      ? { status: 400, json: { error: { code: 'invalid_recipient', message: 'recipient_name is required (1–120 characters).' } } }
      : { status: 201, json: cert(b.recipient_name as string) };
    const out = await run(issueCertificates, { template_id: TEMPLATE, recipient_names: ['Aya', 'Bo', 'Cy'] });
    expect(calls).toHaveLength(3);
    expect(calls[0].headers['Idempotency-Key']).toBeUndefined();
    expect(out.content[0].text).toContain('Issued 2 of 3');
    expect(out.content[0].text).toContain('Bo: NOT issued — recipient_name is required');
    expect(out.structuredContent.failed).toHaveLength(1);
  });

  it('stops at once when the first one fails, with the reason', async () => {
    respond = () => ({ status: 404, json: { error: { code: 'template_not_found', message: 'No design with that id in your account.' } } });
    await expect(run(issueCertificates, { template_id: TEMPLATE, recipient_names: ['Aya', 'Bo', 'Cy'] }))
      .rejects.toThrow(/No certificate was issued\. No design with that id/);
    expect(calls).toHaveLength(1);
  });
});

describe('MCP: saving a design as a template', () => {
  it('sends the design and passes on a missing-placeholder warning', async () => {
    respond = () => ({ status: 201, json: { id: TEMPLATE, title: 'Mine', institution_name: null, format: 'landscape', has_recipient_placeholder: false, warning: 'The design has no {{recipient_name}} placeholder.' } });
    const out = await run(createTemplate, { title: 'Mine', html: '<p>Hi</p>' });
    expect(calls[0].url).toMatch(/\/v1\/templates$/);
    expect(calls[0].body).toEqual({ title: 'Mine', html: '<p>Hi</p>' });
    expect(out.content[0].text).toContain('no {{recipient_name}} placeholder');
  });

  it("shows the API's reason when a design is refused", async () => {
    respond = () => ({ status: 400, json: { error: { code: 'active_content', message: 'A certificate must be a static document: remove <script> elements.' } } });
    await expect(run(createTemplate, { title: 'Bad', html: '<script></script>' })).rejects.toThrow(/static document/);
  });
});
