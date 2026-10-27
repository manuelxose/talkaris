#!/bin/bash
set -euo pipefail
tmp="$(mktemp -d)"
pids=()
node_link=0
trap 'for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; rm -rf "$tmp"; if [ "$node_link" = 1 ]; then rm /usr/bin/node; fi' EXIT
if [ ! -e /usr/bin/node ]; then ln -s "$(command -v node)" /usr/bin/node; node_link=1; fi
mkdir -p "$tmp/release/apps/chat-api/dist" "$tmp/release/apps/ingest-worker/dist" "$tmp/release/apps/widget" "$tmp/release/apps/portal/dist/portal/server" "$tmp/bin"
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
export PATH="$tmp/bin:$PATH"
sleep 1
bash "$(dirname "$0")/check-release-processes.sh" "$tmp/release" >/dev/null
mkdir "$tmp/other"
if bash "$(dirname "$0")/check-release-processes.sh" "$tmp/other" >/dev/null 2>&1; then exit 1; fi
kill "$ingest"
wait "$ingest" 2>/dev/null || true
if bash "$(dirname "$0")/check-release-processes.sh" "$tmp/release" >/dev/null 2>&1; then exit 1; fi
echo 'release process identity tests passed'
