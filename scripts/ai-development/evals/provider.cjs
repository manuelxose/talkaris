const { performance } = require('node:perf_hooks');

function loopbackUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password) throw new Error('Only literal loopback HTTP(S) URLs without credentials are allowed');
  return url;
}

class TalkarisProvider {
  constructor(options = {}) { this.config = options.config || {}; }
  id() { return 'talkaris-isolated'; }
  async callApi(prompt, context = {}) {
    const c = this.config;
    if (!c.mode || c.mode === 'offline') {
      // Transport fixture only: deliberately does not emulate retrieval or generation.
      return { output: JSON.stringify({ message: 'Synthetic transport smoke', citations: [], usedFallback: true, fixture: true }) };
    }
    if (c.mode !== 'live' || c.isolated !== true || c.runtimeCallsApproved !== true ||
        !c.testBot || !c.conversationId || !['non-billable-verified', 'paid-explicitly-approved'].includes(c.costPolicy)) {
      throw new Error('Live mode requires isolated test bot/conversation, explicit runtime approval and cost policy');
    }
    const base = loopbackUrl(c.baseUrl);
    if (base.pathname !== '/' || base.search || base.hash) throw new Error('baseUrl must be an origin');
    const start = performance.now();
    const response = await fetch(new URL('/v1/widget/messages', base), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId: c.conversationId, message: String(prompt) }),
    });
    if (!response.ok) throw new Error('Runtime HTTP ' + response.status);
    if (!response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Expected widget SSE response');
    const stream = await response.text();
    const events = stream.split(/\r?\n\r?\n/).filter(event => event.trim());
    let body;
    for (const event of events) {
      const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      const envelope = JSON.parse(data);
      if (envelope.type === 'answer') { body = envelope.payload; break; }
    }
    if (!body) throw new Error('Widget SSE response has no answer event');
    if (typeof body.message !== 'string' || !Array.isArray(body.citations)) throw new Error('Unexpected widget response contract');
    return { output: JSON.stringify(body), metadata: { elapsedMs: Math.round(performance.now() - start), runtime: 'widget', testBot: c.testBot } };
  }
}
module.exports = TalkarisProvider;
module.exports.loopbackUrl = loopbackUrl;
