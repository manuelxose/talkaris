#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ] || [ "$#" -ne 3 ] || [[ "$2" != /* ]] || [[ ! "$3" =~ ^[0-9a-f]{64}$ ]]; then
  echo 'Usage: root seal-release.sh <staged-release> <new-absolute-directory> <trusted-manifest-sha256>' >&2
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
node "$(dirname "$(realpath "$0")")/release-manifest.mjs" verify "$staging/content" "$3"
mv -Tn -- "$staging/content" "$destination"
[ ! -e "$staging/content" ] || { echo 'Destination already exists' >&2; exit 1; }
rmdir "$staging"
echo "Sealed $destination; activation is not implemented"
