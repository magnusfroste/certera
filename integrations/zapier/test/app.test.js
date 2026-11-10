'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const KEY = 'cert_' + 'a'.repeat(40);
const cert = (id, name) => ({
  id, url: `https://www.certera.ink/diploma/${id}`, verify_url: `https://www.certera.ink/verify/${id}`,
  recipient_name: name, institution_name: 'Nordlys Academy', issuer_domain: null, verified_issuer: false,
  hedera: { topic_id: '0.0.1', sequence_number: '1', transaction_id: 'tx', explorer_url: null },
  created_at: '2026-11-10T09:00:00.000Z',
});

// A stand-in for api.certera.ink that records what the app sent.
const seen = [];
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    seen.push({ method: req.method, path: url.pathname, query: url.search, headers: req.headers, body: raw });
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.headers.authorization !== `Bearer ${KEY}`) return send(401, { error: { code: 'unauthorized', message: 'nope' } });
    if (url.pathname === '/v1/me') return send(200, { account: 'owner@nordlys.se', issuer_domain: 'nordlys.se', verified_issuer: true });
    if (url.pathname === '/v1/templates') return send(200, { templates: [{ id: 't1', title: null, institution_name: 'Nordlys Academy', has_recipient_placeholder: true, updated_at: 'x' }] });
    if (url.pathname === '/v1/certificates' && req.method === 'GET') return send(200, { certificates: [cert('DIP_b', 'Bo'), cert('DIP_a', 'Aya')] });
    if (url.pathname === '/v1/certificates' && req.method === 'POST') {
      const body = JSON.parse(raw);
      if (body.template_id === 'missing') return send(404, { error: { code: 'template_not_found', message: 'No design with that id in your account.' } });
      if (body.template_id === 'limit') return send(429, { error: { code: 'daily_limit', message: 'Daily limit reached.' } });
      return send(201, cert('DIP_new', body.recipient_name));
    }
    if (url.pathname === '/v1/certificates/DIP_a') return send(200, cert('DIP_a', 'Aya'));
    return send(404, { error: { code: 'not_found', message: 'No certificate with that id in your account.' } });
  });
});

let appTester; let App;
const bundle = (inputData = {}, key = KEY) => ({ authData: { api_key: key }, inputData });

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.CERTERA_API_BASE = `http://127.0.0.1:${server.address().port}`;
  const zapier = require('zapier-platform-core');
  App = require('../index');
  appTester = zapier.createAppTester(App);
});
after(() => server.close());

test('the connection test identifies the account', async () => {
  const me = await appTester(App.authentication.test, bundle());
  assert.equal(me.account, 'owner@nordlys.se');
});

test('a wrong key is reported as an authentication problem', async () => {
  await assert.rejects(appTester(App.authentication.test, bundle({}, 'cert_wrong')), /API key was not accepted/);
});

test('designs feed the dropdown, with a name for untitled ones', async () => {
  const rows = await appTester(App.triggers.template.operation.perform, bundle());
  assert.deepEqual(rows.map((r) => [r.id, r.title]), [['t1', 'Untitled design']]);
});

test('new certificates come newest first with ids to deduplicate on', async () => {
  const rows = await appTester(App.triggers.new_certificate.operation.perform, bundle());
  assert.deepEqual(rows.map((r) => r.id), ['DIP_b', 'DIP_a']);
});

test('issuing sends the name, and the reference as an idempotency key', async () => {
  const out = await appTester(App.creates.issue_certificate.operation.perform,
    bundle({ template_id: 't1', recipient_name: 'Elin Andersson', reference: 'order-42' }));
  assert.equal(out.id, 'DIP_new');
  assert.equal(out.url, 'https://www.certera.ink/diploma/DIP_new');
  const sent = seen.filter((s) => s.method === 'POST').pop();
  assert.deepEqual(JSON.parse(sent.body), { template_id: 't1', recipient_name: 'Elin Andersson' });
  assert.equal(sent.headers['idempotency-key'], 'zapier:order-42');
});

test('without a reference no idempotency key is sent; an issuer name is passed on', async () => {
  await appTester(App.creates.issue_certificate.operation.perform,
    bundle({ template_id: 't1', recipient_name: 'Elin', institution_name: 'Other School' }));
  const sent = seen.filter((s) => s.method === 'POST').pop();
  assert.equal(JSON.parse(sent.body).institution_name, 'Other School');
  assert.equal(sent.headers['idempotency-key'], undefined);
});

test("certera's own error message reaches the Zap", async () => {
  await assert.rejects(
    appTester(App.creates.issue_certificate.operation.perform, bundle({ template_id: 'missing', recipient_name: 'Elin' })),
    /No design with that id in your account/);
});

test('the daily limit is reported as throttling', async () => {
  await assert.rejects(
    appTester(App.creates.issue_certificate.operation.perform, bundle({ template_id: 'limit', recipient_name: 'Elin' })),
    (e) => e.name === 'ThrottledError');
});

test('find returns the certificate, or nothing when the id is unknown', async () => {
  const found = await appTester(App.searches.find_certificate.operation.perform, bundle({ id: ' DIP_a ' }));
  assert.equal(found[0].recipient_name, 'Aya');
  const none = await appTester(App.searches.find_certificate.operation.perform, bundle({ id: 'DIP_zzz' }));
  assert.deepEqual(none, []);
});
