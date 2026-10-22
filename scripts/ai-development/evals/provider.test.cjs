const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Provider = require('./provider.cjs');

test('offline fixture never calls fetch', async () => {
  const previous = global.fetch;
  global.fetch = () => { throw new Error('Unexpected network'); };
  try {
    const result = await new Provider().callApi('hello');
    assert.equal(JSON.parse(result.output).fixture, true);
  } finally { global.fetch = previous; }
});
test('target policy rejects remote, credentialed and non-HTTP targets', () => {
  for (const value of ['https://example.com', 'http://localhost', 'http://127.0.0.1.evil.test', 'http://10.0.0.1', 'file:///tmp/x', 'http://secret@127.0.0.1']) {
    assert.throws(() => Provider.loopbackUrl(value));
  }
  assert.equal(Provider.loopbackUrl('http://127.0.0.1:4101').hostname, '127.0.0.1');
  assert.equal(Provider.loopbackUrl('http://[::1]:4101').hostname, '[::1]');
});
test('live requires explicit isolated runtime and cost approval', async () => {
  await assert.rejects(new Provider({ config: { mode: 'live', baseUrl: 'http://127.0.0.1:4101' } }).callApi('hello'));
});
test('local transport uses canonical message shape and refuses redirects', async (t) => {
  let redirected = false;
  let responseMode = 'answer';
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    assert.equal(req.url, '/v1/widget/messages');
    assert.deepEqual(JSON.parse(raw), { conversationId: 'synthetic-conversation', message: 'hello' });
    if (redirected) { res.writeHead(302, { location: 'https://example.com' }); res.end(); return; }
    res.setHeader('content-type', responseMode === 'json' ? 'application/json' : 'text/event-stream; charset=utf-8');
    const answer = { message: 'local transport', citations: [{ title: 'Synthetic policy', url: 'https://fixture.invalid/policy' }] };
    res.end(responseMode === 'json' ? JSON.stringify(answer) : 'data: ' + JSON.stringify({ type: responseMode, payload: answer }) + '\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const provider = new Provider({ config: { mode: 'live', isolated: true, runtimeCallsApproved: true,
    testBot: 'synthetic', conversationId: 'synthetic-conversation', costPolicy: 'non-billable-verified',
    baseUrl: 'http://127.0.0.1:' + server.address().port } });
  assert.equal(JSON.parse((await provider.callApi('hello')).output).message, 'local transport');
  assert.equal(JSON.parse((await provider.callApi('hello')).output).citations[0].title, 'Synthetic policy');
  responseMode = 'json';
  await assert.rejects(provider.callApi('hello'), /Expected widget SSE/);
  responseMode = 'status';
  await assert.rejects(provider.callApi('hello'), /no answer event/);
  redirected = true;
  await assert.rejects(provider.callApi('hello'));
});
