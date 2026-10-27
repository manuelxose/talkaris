#!/bin/bash
set -euo pipefail
script="$(realpath "$(dirname "$0")/prepare-release.sh")"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git init -q "$tmp/repo"
git -C "$tmp/repo" config user.email test@example.invalid
git -C "$tmp/repo" config user.name test
printf '{"name":"fixture","version":"1.0.0","scripts":{"build":"node build.cjs"}}\n' > "$tmp/repo/package.json"
cat > "$tmp/repo/build.cjs" <<'EOF'
const fs = require('fs');
for (const file of ['apps/chat-api/dist/main.js', 'apps/ingest-worker/dist/main.js', 'apps/widget/server.mjs', 'apps/portal/dist/portal/server/server.mjs']) {
  fs.mkdirSync(require('path').dirname(file), { recursive: true });
  fs.writeFileSync(file, 'ok');
}
EOF
mkdir -p "$tmp/repo/apps/chat-api/migrations"
printf 'SELECT 1;\n' > "$tmp/repo/apps/chat-api/migrations/001.sql"
cd "$tmp/repo"
npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null
git add package.json package-lock.json build.cjs apps
git commit -qm fixture
sha="$(git rev-parse HEAD)"
output="$(bash "$script" "$tmp/repo" "$sha" "$tmp/release")"
test "$(cat "$tmp/release/apps/chat-api/dist/main.js")" = ok
digest="$(printf '%s\n' "$output" | sed -n 's/.*manifest SHA-256: \([0-9a-f]*\);.*/\1/p')"
node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$digest" >/dev/null
mkdir "$tmp/fakebin"
cat > "$tmp/fakebin/gh" <<'EOF'
#!/bin/sh
printf '%s\n' "$@" > "$GH_ARGS"
[ "${GH_FAIL:-0}" = 0 ]
EOF
chmod +x "$tmp/fakebin/gh"
export GH_ARGS="$tmp/gh-args" PATH="$tmp/fakebin:$PATH"
test "$(bash "$(dirname "$script")/verify-release-attestation.sh" "$tmp/release/manifest.json" "$sha")" = "$digest"
grep -qx -- '--deny-self-hosted-runners' "$GH_ARGS"
grep -qx -- "$sha" "$GH_ARGS"
if GH_FAIL=1 bash "$(dirname "$script")/verify-release-attestation.sh" "$tmp/release/manifest.json" "$sha" >/dev/null 2>&1; then exit 1; fi
if bash "$(dirname "$script")/verify-release-attestation.sh" "$tmp/release/manifest.json" "$(printf '%040d' 0)" >/dev/null 2>&1; then exit 1; fi
mv "$tmp/release/manifest.json" "$tmp/manifest.json"
ln -s "$tmp/manifest.json" "$tmp/release/manifest.json"
if node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
rm "$tmp/release/manifest.json"
mv "$tmp/manifest.json" "$tmp/release/manifest.json"
printf extra > "$tmp/release/unexpected"
if node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
rm "$tmp/release/unexpected"
ln -s /etc/passwd "$tmp/release/external"
if node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
rm "$tmp/release/external"
if node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$(printf '%064d' 0)" >/dev/null 2>&1; then exit 1; fi
if bash "$script" "$tmp/repo" "$sha" "$tmp/release" >/dev/null 2>&1; then exit 1; fi
if bash "$script" "$tmp/repo" invalid "$tmp/invalid" >/dev/null 2>&1; then exit 1; fi
printf tampered > "$tmp/release/apps/chat-api/dist/main.js"
if node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
echo 'release preparation tests passed'
