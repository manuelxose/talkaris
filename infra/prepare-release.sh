#!/bin/bash
# Prepare an isolated build; activation and database recovery are separate gates.
set -euo pipefail

if [ "$#" -ne 3 ] || [[ ! "$2" =~ ^[0-9a-f]{40}$ ]] || [[ "$3" != /* ]]; then
  echo "Usage: $0 <repository> <full-commit-sha> <new-absolute-release-directory>" >&2
  exit 1
fi
repo="$(realpath "$1")" sha="$2" release="$3"
git -C "$repo" cat-file -e "$sha^{commit}"
mkdir -m 700 "$release"
release="$(realpath "$release")"
complete=0
trap 'if [ "$complete" -ne 1 ]; then echo "Incomplete release retained at $release; do not activate" >&2; fi' EXIT
git -C "$repo" archive "$sha" | tar -xf - -C "$release"
cd "$release"
npm ci --no-audit --no-fund
npm run build
while IFS= read -r -d '' link; do
  target="$(realpath -e "$link")"
  case "$target" in "$release"/*) ;; *) echo "External link: $link" >&2; exit 1 ;; esac
done < <(find . -type l -print0)
find . -type f -exec chmod go-w {} +
manifest_tool="$(dirname "$(realpath "$0")")/release-manifest.mjs"
digest="$(node "$manifest_tool" create "$release" "$sha" "$(git -C "$repo" rev-parse "$sha^{tree}")")"
node "$manifest_tool" verify "$release" "$digest"
complete=1
echo "Prepared $release; manifest SHA-256: $digest; activation and recovery have not been verified"
