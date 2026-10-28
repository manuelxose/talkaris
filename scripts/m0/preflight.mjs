import assert from 'node:assert/strict';
import { readFile, readdir, readlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { Resolver } from 'node:dns/promises';
import { createRequire } from 'node:module';

assert.deepEqual(await readdir('/sys/class/net'), ['lo'], 'M0 requires loopback only');
assert.equal((await readFile('/proc/net/route', 'utf8')).trim().split('\n').length, 1, 'IPv4 routes exist');
assert.ok(!(await readFile('/proc/net/ipv6_route', 'utf8')).split('\n').some(x => x.trim() && !x.trim().endsWith('lo')), 'IPv6 routes exist');
assert.ok(!Object.keys(process.env).some(k => /proxy/i.test(k)), 'proxy environment is present');
const namespace = await readlink('/proc/self/ns/net');
const child = spawnSync(process.execPath, ['-e', "process.stdout.write(require('fs').readlinkSync('/proc/self/ns/net'))"], { encoding: 'utf8' });
assert.equal(child.status, 0); assert.equal(child.stdout, namespace, 'child network namespace differs');
function tcp(host, port) {
  return new Promise(resolve => {
    const socket = connect({ host, port, timeout: 2000 });
    socket.on('connect', () => { socket.destroy(); resolve('connected'); });
    socket.on('error', error => resolve(error.code));
    socket.on('timeout', () => { socket.destroy(); resolve('timeout'); });
  });
}
for (const port of [45432, 45125, 45126]) assert.equal(await tcp('127.0.0.1', port), 'connected', `service ${port} unavailable`);
for (const host of ['1.1.1.1', '2606:4700:4700::1111', '172.17.0.1', '192.168.65.1']) {
  const result = await tcp(host, 443);
  assert.equal(result, 'ENETUNREACH', `${host} did not fail with ENETUNREACH: ${result}`);
  console.log(`${host}: ${result}`);
}
const resolver = new Resolver({ timeout: 1000, tries: 1 });
resolver.setServers(['1.1.1.1']);
await assert.rejects(resolver.resolve4('example.com'), 'external DNS unexpectedly succeeded');
const require = createRequire(new URL('./tools/package.json', import.meta.url));
const browser = await require('@playwright/test').chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-background-networking'] });
try {
  const page = await browser.newPage();
  await assert.rejects(page.goto('http://1.1.1.1/', { timeout: 3000 }), 'Chromium external access succeeded');
  const pids = (await readdir('/proc')).filter(x => /^\d+$/.test(x));
  let chromium = 0;
  for (const pid of pids) {
    try {
      const cmd = await readFile(`/proc/${pid}/cmdline`, 'utf8');
      if (cmd.includes('chrome') || cmd.includes('chromium')) {
        assert.equal(await readlink(`/proc/${pid}/ns/net`), namespace, `Chromium ${pid} escaped namespace`);
        chromium++;
      }
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error; }
  }
  assert.ok(chromium > 0, 'no Chromium process observed');
  console.log(`Chromium processes verified: ${chromium}`);
} finally { await browser.close(); }
console.log(`Isolation preflight passed: ${namespace}; loopback services, child, IPv4, IPv6, DNS, proxy and Chromium`);
