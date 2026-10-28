#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/test-container-guard.sh"
tmp="$(mktemp -d /opt/talkaris-process-release.XXXXXXXX)"
tools="$(mktemp -d /opt/talkaris-process-test.XXXXXXXX)"
pids=()
node_link=0
systemctl_test_created=0
find_test_created=0
trap 'for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; rm -rf "$tmp" "$tools"; if [ "$node_link" = 1 ]; then rm /usr/bin/node; fi; if [ "$systemctl_test_created" = 1 ]; then rm /usr/local/bin/systemctl; fi; if [ "$find_test_created" = 1 ]; then rm /usr/local/bin/find; fi' EXIT
chmod 755 "$tools"
if [ ! -e /usr/bin/node ] && [ ! -L /usr/bin/node ]; then ln -s "$(command -v node)" /usr/bin/node; node_link=1; fi
mkdir -p "$tmp/release/apps/chat-api/dist" "$tmp/release/apps/ingest-worker/dist" "$tmp/release/apps/widget" "$tmp/release/apps/portal/dist/portal/server" "$tmp/bin"
mkdir -p "$tmp/release/apps/chat-api/migrations"
printf '%s\n' 'SELECT 1;' > "$tmp/release/apps/chat-api/migrations/001_test.sql"
for file in apps/chat-api/dist/main.js apps/ingest-worker/dist/main.js apps/widget/server.mjs apps/portal/dist/portal/server/server.mjs; do
  printf 'setInterval(() => {}, 1000);\n' > "$tmp/release/$file"
done
(cd "$tmp/release/apps/chat-api" && exec node dist/main.js) & api=$!; pids+=("$api")
(cd "$tmp/release/apps/ingest-worker" && exec node dist/main.js) & ingest=$!; pids+=("$ingest")
(cd "$tmp/release/apps/widget" && exec node server.mjs) & widget=$!; pids+=("$widget")
(cd "$tmp/release/apps/portal" && exec node dist/portal/server/server.mjs) & portal=$!; pids+=("$portal")
export api ingest widget portal
cat > "$tmp/bin/systemctl" <<'EOF'
#!/bin/bash
if [ "$1" = show ]; then unit="$2"; else unit="$3"; fi
case "$unit" in
  tecnoria-chat-api.service) pid="$api" ;;
  tecnoria-chat-ingest.service) pid="$ingest" ;;
  tecnoria-chat-widget.service) pid="$widget" ;;
  tecnoria-chat-portal.service) pid="$portal" ;;
  *) exit 1 ;;
esac
if [ "$1" = show ]; then echo "$pid"; else kill -0 "$pid"; fi
EOF
chmod +x "$tmp/bin/systemctl"
[ ! -e /usr/local/bin/systemctl ] && [ ! -L /usr/local/bin/systemctl ] || { echo 'test requires an unused /usr/local/bin/systemctl' >&2; exit 1; }
cp "$tmp/bin/systemctl" /usr/local/bin/systemctl
systemctl_test_created=1
[ ! -e /usr/local/bin/find ] && [ ! -L /usr/local/bin/find ] || { echo 'test requires an unused /usr/local/bin/find' >&2; exit 1; }
cat > /usr/local/bin/find <<'EOF'
#!/bin/bash
if [ "${TEST_FIND_FAIL:-}" = 1 ]; then echo 'simulated traversal failure' >&2; exit 1; fi
exec /usr/bin/find "$@"
EOF
chmod 755 /usr/local/bin/find
find_test_created=1
cp "$(dirname "$0")/check-release-processes.sh" "$tools/check-release-processes.sh"
cp "$(dirname "$0")/release-manifest.mjs" "$tools/release-manifest.mjs"
chmod 644 "$tools/check-release-processes.sh"
digest="$(node "$tools/release-manifest.mjs" create "$tmp/release" "$(printf '%040d' 1)" "$(printf '%040d' 2)")"
sleep 1
output="$(bash "$tools/check-release-processes.sh" "$tmp/release" "$digest")"
[[ "$output" == *"Verified release $(printf '%040d' 1)"* ]]
[[ "$output" == *"All four service process paths match verified release $tmp/release"* ]]
if TEST_FIND_FAIL=1 bash "$tools/check-release-processes.sh" "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
if runuser -u nobody -- bash "$tools/check-release-processes.sh" "$tmp/release" "$digest" >"$tmp/nonroot.out" 2>&1; then exit 1; fi
grep -q 'Root execution required' "$tmp/nonroot.out"
if bash "$tools/check-release-processes.sh" "$tmp/release" "$(printf '%064d' 0)" >/dev/null 2>&1; then exit 1; fi
printf '%s\n' '// tampered' >> "$tmp/release/apps/widget/server.mjs"
if bash "$tools/check-release-processes.sh" "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
sed -i '$d' "$tmp/release/apps/widget/server.mjs"
chmod 666 "$tmp/release/apps/widget/server.mjs"
if bash "$tools/check-release-processes.sh" "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
chmod 644 "$tmp/release/apps/widget/server.mjs"
mkdir "$tmp/other"
if bash "$tools/check-release-processes.sh" "$tmp/other" "$digest" >/dev/null 2>&1; then exit 1; fi
kill "$ingest"
wait "$ingest" 2>/dev/null || true
if bash "$tools/check-release-processes.sh" "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
echo 'release process identity tests passed'
