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
for path in /usr/bin /usr/local/bin "$0"; do trusted "$path"; done
for command in systemctl realpath readlink; do trusted "$(command -v "$command")"; done
if [ "$#" -ne 1 ]; then echo 'Usage: check-release-processes.sh <release-directory>' >&2; exit 1; fi
release="$(realpath -e "$1")"
check_service() {
  local unit="$1" app="$2" entry="$3" pid cwd exe actual pid_after
  systemctl is-active --quiet "$unit"
  pid="$(systemctl show "$unit" --property=MainPID --value)"
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] || { echo "$unit has no main process" >&2; return 1; }
  cwd="$(readlink -f "/proc/$pid/cwd")"
  exe="$(readlink -f "/proc/$pid/exe")"
  [ "$cwd" = "$release/apps/$app" ] && [ "$exe" = "$(readlink -f /usr/bin/node)" ] || { echo "$unit runtime identity mismatch" >&2; return 1; }
  mapfile -d '' -t args < "/proc/$pid/cmdline"
  [ "${#args[@]}" -ge 2 ] || return 1
  if [[ "${args[1]}" = /* ]]; then actual="$(realpath -e "${args[1]}")"; else actual="$(realpath -e "$cwd/${args[1]}")"; fi
  [ "$actual" = "$release/apps/$app/$entry" ] || { echo "$unit entry point mismatch" >&2; return 1; }
  pid_after="$(systemctl show "$unit" --property=MainPID --value)"
  [ "$pid_after" = "$pid" ] && systemctl is-active --quiet "$unit"
}
check_service tecnoria-chat-api.service chat-api dist/main.js
check_service tecnoria-chat-ingest.service ingest-worker dist/main.js
check_service tecnoria-chat-widget.service widget server.mjs
check_service tecnoria-chat-portal.service portal dist/portal/server/server.mjs
echo "All four service processes use $release"
