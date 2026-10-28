#!/bin/bash
# This guard supplements the external harness; it does not authenticate a container.
set -euo pipefail
[[ ${TALKARIS_TEST_NONCE:-} =~ ^[0-9a-f]{32}$ ]] || { echo 'Use the disposable Docker harness' >&2; exit 1; }
[[ $EUID == 0 && -f /.dockerenv && -f /tmp/talkaris-test-marker && ! -L /tmp/talkaris-test-marker ]] || { echo 'Disposable test container required' >&2; exit 1; }
[[ $(cat /tmp/talkaris-test-marker) == "$TALKARIS_TEST_NONCE" ]] || { echo 'Invalid test marker' >&2; exit 1; }
[[ $(ls /sys/class/net | tr '\n' ' ') == 'lo ' ]] || { echo 'Only loopback is allowed' >&2; exit 1; }
while IFS= read -r mount; do
  case "$mount" in /etc/hosts|/etc/hostname|/etc/resolv.conf) continue ;; esac
  for protected in /opt /usr /var /tmp /run /etc; do
    [[ $mount != "$protected" && $mount != "$protected/"* ]] || { echo "Unexpected mount: $mount" >&2; exit 1; }
  done
done < <(awk '$5 != "/" {print $5}' /proc/self/mountinfo)
