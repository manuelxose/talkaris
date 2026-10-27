import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

test('deployment refuses missing SHA, dirty checkout and mismatched branch before building', () => {
  const script = `set -eu
mkdir -p /var/www/talkaris /tmp/fakebin
cat > /tmp/fakebin/git <<'EOF'
#!/bin/sh
case "$1" in
  status) [ "$SCENARIO" != dirty ] || echo ' M changed' ;;
  rev-parse) printf '%040d\\n' 1 ;;
esac
EOF
cat > /tmp/fakebin/npm <<'EOF'
#!/bin/sh
echo 'build must not start' >&2
exit 99
EOF
chmod +x /tmp/fakebin/git /tmp/fakebin/npm
export PATH=/tmp/fakebin:$PATH
for SCENARIO in missing dirty mismatch; do
  export SCENARIO
  sha=0000000000000000000000000000000000000000
  [ "$SCENARIO" != missing ] || sha=''
  if bash /guard.sh main "$sha" > /tmp/output 2>&1; then cat /tmp/output; exit 1; fi
  case "$SCENARIO" in
    missing) grep -q 'Expected full source SHA is required' /tmp/output ;;
    dirty) grep -q 'Working tree has local changes' /tmp/output ;;
    mismatch) grep -q 'Checkout does not match expected source SHA' /tmp/output ;;
  esac
  if grep -q 'build must not start' /tmp/output; then cat /tmp/output; exit 1; fi
done`;
  const result = spawnSync('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'bash', '-v', `${resolve('infra/deploy-chat.sh')}:/guard.sh:ro`, 'node:22.23.2-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844', '-c', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error));
});
