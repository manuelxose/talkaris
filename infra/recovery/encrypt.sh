#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ $# == 4 ]] || { echo 'Usage: encrypt.sh BACKUP_DIR PUBLIC_KEY FINGERPRINT OUTPUT' >&2; exit 2; }
backup=$(realpath -e "$1")
public_key=$(realpath -e "$2")
fingerprint=${3^^}
output=$4
[[ -d $backup && -f $public_key && $fingerprint =~ ^[0-9A-F]{40}$ && $output == /* && ! -e $output ]] || { echo 'Invalid arguments' >&2; exit 2; }
output_parent=$(realpath -e "$(dirname "$output")")
[[ "$output_parent/" != "$backup/"* ]] || { echo 'Output must be outside backup directory' >&2; exit 2; }
home=$(mktemp -d)
tmp=$(mktemp "${output}.partial.XXXXXXXX")
trap 'rm -rf -- "$home"; rm -f -- "$tmp"' EXIT
chmod 700 "$home"
files=(captured-at-utc database-connection-limit database.dump globals.sql app-role-password.sql system.tar.gz)
[[ $(find "$backup" -mindepth 1 -maxdepth 1 -printf '.' | wc -c) -eq 7 ]] || { echo 'Unexpected backup inventory' >&2; exit 1; }
mkdir "$home/snapshot" "$home/keyring"
for file in "${files[@]}" SHA256SUMS; do
  [[ -f "$backup/$file" && ! -L "$backup/$file" ]] || { echo "Invalid backup file: $file" >&2; exit 1; }
  cp -P -- "$backup/$file" "$home/snapshot/$file"
  [[ -f "$home/snapshot/$file" && ! -L "$home/snapshot/$file" ]] || { echo "Invalid copied file: $file" >&2; exit 1; }
done
expected=$(printf '%s\n' "${files[@]}" | sort)
actual=$(
  while IFS= read -r line; do
    [[ $line =~ ^[0-9a-f]{64}\ \ ([A-Za-z0-9._-]+)$ ]] || exit 1
    printf '%s\n' "${BASH_REMATCH[1]}"
  done < "$home/snapshot/SHA256SUMS" | sort
)
[[ $actual == "$expected" ]] || { echo 'Checksum inventory mismatch' >&2; exit 1; }
(cd "$home/snapshot" && sha256sum -c SHA256SUMS >/dev/null)
gpg --homedir "$home/keyring" --batch --quiet --import "$public_key"
gpg --homedir "$home/keyring" --batch --with-colons --fingerprint "$fingerprint" | grep -q "^fpr:::::::::$fingerprint:"
tar -C "$home/snapshot" -cf - . | gpg --homedir "$home/keyring" --batch --yes --quiet --trust-model always --recipient "$fingerprint" --encrypt --output "$tmp"
ln -- "$tmp" "$output"
echo "Encrypted archive created: $output"
