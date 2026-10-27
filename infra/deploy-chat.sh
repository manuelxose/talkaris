#!/bin/bash
# Deploy completo de la plataforma chat (Talkaris) en produccion (VPS Contabo)
# Uso: sudo /var/www/talkaris/infra/deploy-chat.sh <branch> <full-source-sha>
# - Paquetes TS: build ordenado (domain -> core -> application -> infrastructure)
# - Apps: chat-api + ingest-worker + widget (dist en sitio, restart, smoke 4101)
# - Portal: release symlink via /var/www/bin/deploy-talkaris-portal.sh
set -euo pipefail
IFS=$'\n\t'

APP_DIR="/var/www/talkaris"
BRANCH="${1:-main}"
EXPECTED_SHA="${2:-}"
CHAT_API_PORT="4101"

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

wait_http() {
  local url="$1"
  local i
  for i in $(seq 1 30); do
    local code
    code=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" "$url" || true)
    if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

cd "${APP_DIR}"

if [[ ! "${EXPECTED_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected full source SHA is required" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has local changes; refusing to deploy" >&2
  exit 1
fi
git fetch --prune origin
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"
if [[ "$(git rev-parse HEAD)" != "${EXPECTED_SHA}" ]]; then
  echo "Checkout does not match expected source SHA; refusing to deploy" >&2
  exit 1
fi

npm install --no-audit --no-fund

# Build ordenado (los paquetes dependen entre si; el orden importa)
npm run build -w @tecnoria-chat/domain
npm run build -w @tecnoria-chat/core
npm run build -w @tecnoria-chat/application
npm run build -w @tecnoria-chat/infrastructure
npm run build -w @tecnoria-chat/chat-api
npm run build -w @tecnoria-chat/ingest-worker
npm run build -w @tecnoria-chat/widget

# API + worker + widget (dist en sitio)
systemctl restart tecnoria-chat-api tecnoria-chat-ingest tecnoria-chat-widget
wait_http "http://127.0.0.1:${CHAT_API_PORT}/health"

# Portal (build + release + restart + smoke local/publico)
/var/www/bin/deploy-talkaris-portal.sh

echo "Deploy talkaris OK; source SHA: $(git rev-parse HEAD)"
