#!/bin/bash
set -euo pipefail
export PATH=/usr/local/bin:/usr/bin
unset BASH_ENV ENV NODE_OPTIONS NODE_PATH LD_PRELOAD LD_LIBRARY_PATH

trusted() {
  local check owner mode
  check="$(/usr/bin/realpath -e -- "$1")"
  while :; do
    owner="$(/usr/bin/stat -c '%u' "$check")" mode="$(/usr/bin/stat -c '%a' "$check")"
    if [ "$owner" != 0 ] || (( (8#$mode & 0022) != 0 )); then
      echo "Untrusted executable path: $check" >&2; return 1
    fi
    [ "$check" = / ] && break
    check="$(/usr/bin/dirname "$check")"
  done
}
script_dir="$(/usr/bin/dirname "$(/usr/bin/realpath -e "$0")")"
for path in /usr/bin /usr/local/bin "$script_dir/seal-release.sh" "$script_dir/verify-release-attestation.sh" "$script_dir/release-manifest.mjs"; do trusted "$path"; done
for command in bash node gh id realpath dirname basename stat mkdir mktemp cp chown find chmod mv rmdir cat sha256sum cut rm; do
  trusted "$(command -v "$command")"
done

if [ "$(id -u)" -ne 0 ] || [ "$#" -ne 3 ] || [[ "$2" != /* ]] || [[ ! "$3" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Usage: root seal-release.sh <staged-release> <new-absolute-directory> <expected-full-commit-sha>' >&2
  exit 1
fi
source_dir="$(realpath -e "$1")"
parent="$(realpath -e "$(dirname "$2")")"
destination="$parent/$(basename "$2")"
case "$parent/" in "$source_dir/"*) echo 'Destination cannot be inside source' >&2; exit 1 ;; esac
check="$parent"
while :; do
  owner="$(stat -c '%u' "$check")" mode="$(stat -c '%a' "$check")"
  if [ "$owner" != 0 ] || (( (8#$mode & 0022) != 0 )); then
    echo "Unsafe destination ancestor: $check" >&2
    exit 1
  fi
  [ "$check" = / ] && break
  check="$(dirname "$check")"
done
[ ! -e "$destination" ] && [ ! -L "$destination" ] || { echo 'Destination already exists' >&2; exit 1; }
staging="$(mktemp -d -p "$parent" .talkaris-seal.XXXXXXXX)"
trap 'if [ -d "$staging" ]; then chmod 700 "$staging"; echo "Incomplete copy retained at $staging" >&2; fi' EXIT
cp -a -- "$source_dir" "$staging/content"
chown -hR root:root -- "$staging/content"
find "$staging/content" -type f -exec chmod go-w {} +
find "$staging/content" -type d -exec chmod 755 {} +
[ -f "$staging/content/manifest.json" ] && [ ! -L "$staging/content/manifest.json" ] || { echo 'Manifest must be a regular file' >&2; exit 1; }
digest="$(bash "$script_dir/verify-release-attestation.sh" "$staging/content/manifest.json" "$3")"
node "$script_dir/release-manifest.mjs" verify "$staging/content" "$digest"
mv -Tn -- "$staging/content" "$destination"
[ ! -e "$staging/content" ] || { echo 'Destination already exists' >&2; exit 1; }
rmdir "$staging"
echo "Sealed $destination; activation is not implemented"
