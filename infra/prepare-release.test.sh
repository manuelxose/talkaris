#!/bin/bash
set -euo pipefail
script="$(realpath "$(dirname "$0")/prepare-release.sh")"
tmp="$(mktemp -d)"
seal_root="/opt/talkaris-seal-test-$$"
mkdir -m 755 "$seal_root"
gh_test_created=0
trap 'rm -rf "$tmp" "$seal_root"; if [ "$gh_test_created" = 1 ]; then rm -f /usr/local/bin/gh; fi' EXIT
mkdir -m 755 "$seal_root/tools"
cp "$(dirname "$script")"/{prepare-release.sh,release-manifest.mjs,verify-release-attestation.sh,seal-release.sh} "$seal_root/tools/"
chmod 644 "$seal_root/tools"/*
script="$seal_root/tools/prepare-release.sh"
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
[ ! -e /usr/local/bin/gh ] || { echo 'test requires an unused /usr/local/bin/gh' >&2; exit 1; }
cp "$tmp/fakebin/gh" /usr/local/bin/gh
gh_test_created=1
chmod 666 "$seal_root/tools/release-manifest.mjs"
if bash "$(dirname "$script")/seal-release.sh" "$tmp/release" "$seal_root/untrusted-tools" "$sha" >/dev/null 2>&1; then exit 1; fi
chmod 644 "$seal_root/tools/release-manifest.mjs"
bash "$(dirname "$script")/seal-release.sh" "$tmp/release" "$seal_root/sealed" "$sha" >/dev/null
if bash "$(dirname "$script")/seal-release.sh" "$tmp/release" "$seal_root/sealed" "$sha" >/dev/null 2>&1; then exit 1; fi
if bash "$(dirname "$script")/seal-release.sh" "$tmp/release" "$tmp/unsafe" "$sha" >/dev/null 2>&1; then exit 1; fi
if GH_FAIL=1 bash "$(dirname "$script")/seal-release.sh" "$tmp/release" "$seal_root/untrusted" "$sha" >/dev/null 2>&1; then exit 1; fi
if [ -e "$seal_root/untrusted" ]; then exit 1; fi
mv "$tmp/release/manifest.json" "$tmp/manifest.json"
ln -s "$tmp/manifest.json" "$tmp/release/manifest.json"
if node "$(dirname "$script")/release-manifest.mjs" verify "$tmp/release" "$digest" >/dev/null 2>&1; then exit 1; fi
if bash "$(dirname "$script")/seal-release.sh" "$tmp/release" "$seal_root/symlink" "$sha" >/dev/null 2>&1; then exit 1; fi
rm "$tmp/release/manifest.json"
mv "$tmp/manifest.json" "$tmp/release/manifest.json"
su -s /bin/sh nobody -c "test -r '$seal_root/sealed/apps/chat-api/dist/main.js'"
if su -s /bin/sh nobody -c "echo changed > '$seal_root/sealed/apps/chat-api/dist/main.js'" 2>/dev/null; then exit 1; fi
node "$(dirname "$script")/release-manifest.mjs" verify "$seal_root/sealed" "$digest" >/dev/null
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
