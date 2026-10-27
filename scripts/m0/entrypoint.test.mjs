import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('the default M0 command stops before running stages without a namespace', () => {
  const env = { ...process.env };
  delete env.M0_NAMESPACE_SERVICES;
  const result = spawnSync(process.execPath, ['scripts/m0/run.mjs'], { env, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /M0 requires an independently verified loopback-only namespace/);
  assert.doesNotMatch(result.stdout + result.stderr, /M0 stage:/);
});

test('the launcher fails before stages when prerequisites are missing', () => {
  const emptyPath = mkdtempSync(join(tmpdir(), 'm0-no-tools-'));
  try {
    const env = { ...process.env, PATH: emptyPath, Path: emptyPath };
    const result = spawnSync(process.execPath, ['scripts/m0/launch.mjs'], { env, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /M0 launcher failed/);
    assert.doesNotMatch(result.stdout + result.stderr, /M0 stage:/);
  } finally { rmSync(emptyPath, { recursive: true, force: true }); }
});

test('the namespace marker cannot bypass boundary verification', () => {
  const result = spawnSync(process.execPath, ['scripts/m0/run.mjs'], { env: { ...process.env, M0_NAMESPACE_SERVICES: '1' }, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /M0 namespace mode requires Linux|M0 namespace must have loopback only|M0 namespace must have no IPv[46] routes/);
  assert.doesNotMatch(result.stdout + result.stderr, /M0 stage:/);
});

test('the launcher reports interruption during preparation', { skip: process.platform === 'win32', timeout: 10000 }, async () => {
  const fakePath = mkdtempSync(join(tmpdir(), 'm0-fake-tools-'));
  try {
    writeFileSync(join(fakePath, 'git'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    writeFileSync(join(fakePath, 'docker'), '#!/bin/sh\necho docker-started\nexec /bin/sleep 30\n', { mode: 0o755 });
    const child = spawn(process.execPath, ['scripts/m0/launch.mjs'], { env: { ...process.env, PATH: fakePath }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; if (output.includes('docker-started')) child.kill('SIGTERM'); });
    child.stderr.on('data', chunk => { output += chunk; });
    const result = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
    assert.notEqual(result.code, 0);
    assert.match(output, /M0 launcher failed/);
    assert.doesNotMatch(output, /M0 stage:/);
  } finally { rmSync(fakePath, { recursive: true, force: true }); }
});
