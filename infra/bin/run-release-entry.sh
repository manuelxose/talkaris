#!/bin/bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <current-release-entry>" >&2
  exit 1
fi

entry_path="$(readlink -f "$1")"
if [ -z "${entry_path}" ] || [ ! -f "${entry_path}" ]; then
  echo "Release entry not found: $1" >&2
  exit 1
fi

exec /usr/bin/node "${entry_path}"
