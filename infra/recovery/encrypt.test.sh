#!/usr/bin/env bash
set -eu
umask 077
tmp=$(mktemp -d)
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp/key" "$tmp/backup" "$tmp/restore" "$tmp/recovered-key"
gpg --homedir "$tmp/key" --batch --pinentry-mode loopback --passphrase synthetic-test-passphrase --quick-generate-key 'Synthetic Recovery Test <test@example.invalid>' rsa2048 encrypt 1d >/dev/null 2>&1
fingerprint=$(gpg --homedir "$tmp/key" --batch --with-colons --list-keys | awk -F: '$1 == "fpr" { print $10; exit }')
gpg --homedir "$tmp/key" --batch --armor --export "$fingerprint" > "$tmp/public.asc"
gpg --homedir "$tmp/key" --batch --pinentry-mode loopback --passphrase synthetic-test-passphrase --armor --export-secret-keys "$fingerprint" > "$tmp/private.asc"
gpg --homedir "$tmp/recovered-key" --batch --quiet --import "$tmp/private.asc"
files=(captured-at-utc database-connection-limit database.dump globals.sql app-role-password.sql system.tar.gz)
for file in "${files[@]}"; do echo fixture > "$tmp/backup/$file"; done
(cd "$tmp/backup" && sha256sum "${files[@]}" > SHA256SUMS)
script="$(dirname "$0")/encrypt.sh"
bash "$script" "$tmp/backup" "$tmp/public.asc" "$fingerprint" "$tmp/recovery.gpg" >/dev/null
gpg --homedir "$tmp/recovered-key" --batch --quiet --pinentry-mode loopback --passphrase synthetic-test-passphrase --decrypt "$tmp/recovery.gpg" | tar -C "$tmp/restore" -xf -
(cd "$tmp/restore" && sha256sum -c SHA256SUMS >/dev/null)
if bash "$script" "$tmp/backup" "$tmp/public.asc" "$fingerprint" "$tmp/recovery.gpg" >/dev/null 2>&1; then exit 1; fi
if bash "$script" "$tmp/backup" "$tmp/public.asc" 0000000000000000000000000000000000000000 "$tmp/wrong.gpg" >/dev/null 2>&1; then exit 1; fi
printf '%064d  ../../private.asc\n' 0 >> "$tmp/backup/SHA256SUMS"
if bash "$script" "$tmp/backup" "$tmp/public.asc" "$fingerprint" "$tmp/path.gpg" >/dev/null 2>&1; then exit 1; fi
(cd "$tmp/backup" && sha256sum "${files[@]}" > SHA256SUMS)
touch "$tmp/backup/unlisted"
if bash "$script" "$tmp/backup" "$tmp/public.asc" "$fingerprint" "$tmp/extra.gpg" >/dev/null 2>&1; then exit 1; fi
rm "$tmp/backup/unlisted" "$tmp/backup/database.dump"
ln -s "$tmp/private.asc" "$tmp/backup/database.dump"
if bash "$script" "$tmp/backup" "$tmp/public.asc" "$fingerprint" "$tmp/link.gpg" >/dev/null 2>&1; then exit 1; fi
echo 'encrypted archive round trip and inventory checks passed'
