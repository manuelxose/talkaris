import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

test('legacy checkout deployment always fails closed', () => {
  const result = spawnSync('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'bash', '-v', `${resolve('infra/deploy-chat.sh')}:/guard.sh:ro`, 'node:22.23.2-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844', '/guard.sh', 'main', '0000000000000000000000000000000000000000'], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr || result.stdout || String(result.error));
  assert.match(result.stderr, /Legacy checkout deployment is disabled/);
});
