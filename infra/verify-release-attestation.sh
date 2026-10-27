#!/bin/bash
set -euo pipefail
if [ "$#" -ne 2 ] || [[ ! "$2" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Usage: verify-release-attestation.sh <manifest.json> <expected-full-commit-sha>' >&2
  exit 1
fi
private="$(mktemp -d)"
trap 'rm -rf "$private"' EXIT
cat -- "$1" > "$private/manifest.json"
gh attestation verify "$private/manifest.json" --repo manuelxose/talkaris \
  --signer-workflow manuelxose/talkaris/.github/workflows/release-artifact.yml \
  --source-ref refs/heads/main --source-digest "$2" --signer-digest "$2" \
  --deny-self-hosted-runners >&2
node -e 'const fs=require("fs"); if (JSON.parse(fs.readFileSync(process.argv[1],"utf8")).commit !== process.argv[2]) process.exit(1)' "$private/manifest.json" "$2"
sha256sum "$private/manifest.json" | cut -d ' ' -f 1
