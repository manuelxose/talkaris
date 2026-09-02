#!/bin/bash
set -euo pipefail

APP_NAME="talkaris-portal" \
BUILD_WORKDIR="/var/www/talkaris" \
BUILD_CMD="npm run build -w @tecnoria-chat/portal" \
STAGING_DIR="/var/www/talkaris/apps/portal/dist/portal" \
RELEASES_DIR="/var/www/talkaris/apps/portal/releases" \
SERVICE_NAME="tecnoria-chat-portal.service" \
SERVER_ENTRY="server/server.mjs" \
LOCAL_URL="http://127.0.0.1:4103/" \
PUBLIC_URL="https://talkaris.com/" \
PUBLIC_HOST="talkaris.com" \
EXPECTED_TEXT="Talkaris" \
NODE_BUILD_OPTIONS="${NODE_BUILD_OPTIONS:---max-old-space-size=1536}" \
exec /var/www/bin/publish-frontend-release.sh
