#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

required_vars=(
  APP_NAME
  BUILD_WORKDIR
  BUILD_CMD
  STAGING_DIR
  RELEASES_DIR
  SERVICE_NAME
  SERVER_ENTRY
  LOCAL_URL
)

for name in "${required_vars[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
done

KEEP_RELEASES="${KEEP_RELEASES:-5}"
EXPECTED_TEXT="${EXPECTED_TEXT:-}"
PUBLIC_URL="${PUBLIC_URL:-}"
PUBLIC_HOST="${PUBLIC_HOST:-}"
NGINX_CACHE_DIR="${NGINX_CACHE_DIR:-}"
NODE_BUILD_OPTIONS="${NODE_BUILD_OPTIONS:---max-old-space-size=1536}"
CURRENT_LINK="${RELEASES_DIR}/current"

release_fingerprint() {
  local target_dir="$1"
  if [ ! -d "${target_dir}/browser" ] || [ ! -d "${target_dir}/server" ]; then
    return 1
  fi

  (
    cd "${target_dir}"
    find browser server -type f -print0 \
      | sort -z \
      | while IFS= read -r -d '' file; do
          sha256sum "${file}"
        done \
      | sha256sum \
      | awk '{print $1}'
  )
}

current_release_dir() {
  if [ -L "${CURRENT_LINK}" ] || [ -e "${CURRENT_LINK}" ]; then
    readlink -e "${CURRENT_LINK}" 2>/dev/null || true
  fi
}

ensure_release_materialized() {
  local release_dir="$1"

  [ -n "${release_dir}" ] || return 1
  [ -d "${release_dir}" ] || return 1
  [ -d "${release_dir}/browser" ] || return 1
  [ -d "${release_dir}/server" ] || return 1
  [ -f "${release_dir}/${SERVER_ENTRY}" ] || return 1
}

point_current_to_release() {
  local release_dir="$1"
  local temp_link="${RELEASES_DIR}/.current_tmp"

  if ! ensure_release_materialized "${release_dir}"; then
    echo "Refusing to point current at an incomplete release: ${release_dir}" >&2
    return 1
  fi

  ln -sfn "${release_dir}" "${temp_link}"
  mv -Tf "${temp_link}" "${CURRENT_LINK}"
}

service_main_pid() {
  systemctl show -p MainPID --value "${SERVICE_NAME}"
}

running_entry_path() {
  local pid="$1"
  if [ -z "${pid}" ] || [ "${pid}" = "0" ] || [ ! -r "/proc/${pid}/cmdline" ]; then
    return 1
  fi
  tr '\0' '\n' < "/proc/${pid}/cmdline" | tail -n 1
}

verify_service_points_to_release() {
  local expected_entry="$1"
  for _ in {1..20}; do
    local pid running_path
    pid="$(service_main_pid)"
    running_path="$(running_entry_path "${pid}" || true)"
    if [ -n "${running_path}" ] && [ "$(readlink -f "${running_path}")" = "$(readlink -f "${expected_entry}")" ]; then
      return 0
    fi
    sleep 1
  done

  echo "Service ${SERVICE_NAME} is not running the expected release entry: ${expected_entry}" >&2
  return 1
}

service_points_to_release() {
  local expected_entry="$1"
  local pid running_path

  pid="$(service_main_pid)"
  running_path="$(running_entry_path "${pid}" || true)"
  if [ -z "${running_path}" ]; then
    return 1
  fi

  [ "$(readlink -f "${running_path}")" = "$(readlink -f "${expected_entry}")" ]
}

wait_http() {
  local url="$1"
  local expected="${2:-200}"
  local extra_args=()

  if [ -n "${PUBLIC_HOST}" ] && [[ "${url}" == "${PUBLIC_URL}"* ]]; then
    extra_args+=(--resolve "${PUBLIC_HOST}:443:127.0.0.1" -k)
  fi

  for _ in {1..30}; do
    local code
    code="$(curl -s -o /dev/null -w "%{http_code}" "${extra_args[@]}" "$url" || true)"
    if [ "${code}" = "${expected}" ]; then
      return 0
    fi
    sleep 2
  done

  echo "HTTP check failed for ${url} (expected ${expected})" >&2
  return 1
}

verify_staging_release() {
  if [ ! -d "${STAGING_DIR}/browser" ]; then
    echo "Missing browser output at ${STAGING_DIR}/browser" >&2
    exit 1
  fi

  if [ ! -d "${STAGING_DIR}/server" ]; then
    echo "Missing server output at ${STAGING_DIR}/server" >&2
    exit 1
  fi

  if ! find "${STAGING_DIR}/browser" -type f | grep -q .; then
    echo "Browser output is empty in ${STAGING_DIR}/browser" >&2
    exit 1
  fi

  if ! find "${STAGING_DIR}/server" -type f | grep -q .; then
    echo "Server output is empty in ${STAGING_DIR}/server" >&2
    exit 1
  fi

  if [ ! -f "${STAGING_DIR}/${SERVER_ENTRY}" ]; then
    echo "Missing server entry ${STAGING_DIR}/${SERVER_ENTRY}" >&2
    exit 1
  fi

  if [ ! -f "${STAGING_DIR}/server/index.server.html" ]; then
    echo "Missing SSR template ${STAGING_DIR}/server/index.server.html" >&2
    exit 1
  fi
}

publish_release() {
  local release_id release_dir fingerprint

  release_id="$(date +%Y%m%d_%H%M%S)"
  release_dir="${RELEASES_DIR}/${release_id}"
  fingerprint="$(release_fingerprint "${STAGING_DIR}")"

  mkdir -p "${RELEASES_DIR}" "${release_dir}"
  cp -a "${STAGING_DIR}/browser" "${release_dir}/browser"
  cp -a "${STAGING_DIR}/server" "${release_dir}/server"

  if [ -f "${STAGING_DIR}/prerendered-routes.json" ]; then
    cp -a "${STAGING_DIR}/prerendered-routes.json" "${release_dir}/prerendered-routes.json"
  fi

  cat > "${release_dir}/release.json" <<EOF
{"app":"${APP_NAME}","releasedAt":"$(date -Iseconds)","service":"${SERVICE_NAME}","fingerprint":"${fingerprint}"}
EOF

  if ! ensure_release_materialized "${release_dir}"; then
    echo "Release directory is incomplete after publish: ${release_dir}" >&2
    return 1
  fi

  printf '%s\n' "${release_dir}"
}

ensure_current_symlink_consistency() {
  local release_dir="$1"
  local current_dir

  current_dir="$(current_release_dir || true)"
  if [ -z "${current_dir}" ]; then
    point_current_to_release "${release_dir}"
  fi
}

cleanup_old_releases() {
  local current_dir releases_to_delete
  current_dir="$(current_release_dir || true)"
  mapfile -t releases_to_delete < <(
    find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
      | sort -r \
      | tail -n +"$((KEEP_RELEASES + 1))"
  )

  for release_id in "${releases_to_delete[@]}"; do
    if [ -n "${current_dir}" ] && [ "$(readlink -e "${RELEASES_DIR}/${release_id}" 2>/dev/null || true)" = "${current_dir}" ]; then
      continue
    fi
    rm -rf "${RELEASES_DIR}/${release_id}"
  done
}

verify_expected_text() {
  local body extra_args=()

  if [ -z "${PUBLIC_URL}" ] || [ -z "${EXPECTED_TEXT}" ]; then
    return 0
  fi

  if [ -n "${PUBLIC_HOST}" ]; then
    extra_args+=(--resolve "${PUBLIC_HOST}:443:127.0.0.1" -k)
  fi

  for _ in {1..3}; do
    body="$(curl -fsS --max-time 15 "${extra_args[@]}" "${PUBLIC_URL}" || true)"
    if printf '%s' "${body}" | grep -Fq "${EXPECTED_TEXT}"; then
      return 0
    fi
    sleep 2
  done

  echo "Expected text not found on ${PUBLIC_URL}: ${EXPECTED_TEXT}" >&2
  exit 1
}

echo "==> ${APP_NAME}: building staging dist"
cd "${BUILD_WORKDIR}"
CI=1 NG_CLI_ANALYTICS=false NODE_OPTIONS="${NODE_BUILD_OPTIONS}" bash -lc "${BUILD_CMD}"

echo "==> ${APP_NAME}: validating staging dist"
verify_staging_release

staging_fingerprint="$(release_fingerprint "${STAGING_DIR}")"
current_dir="$(current_release_dir || true)"
previous_current_dir="${current_dir:-}"
current_fingerprint=""
if [ -n "${current_dir}" ] && [ -d "${current_dir}" ]; then
  current_fingerprint="$(release_fingerprint "${current_dir}" || true)"
fi

if [ -n "${current_fingerprint}" ] && [ "${staging_fingerprint}" = "${current_fingerprint}" ]; then
  echo "==> ${APP_NAME}: staging build is identical to current release, skipping new release publish"
  ensure_current_symlink_consistency "${current_dir}"
  expected_entry="${current_dir}/${SERVER_ENTRY}"
  needs_restart="0"
  if ! service_points_to_release "${expected_entry}"; then
    needs_restart="1"
  fi
else
  echo "==> ${APP_NAME}: publishing release"
  release_dir="$(publish_release)"
  point_current_to_release "${release_dir}"
  current_dir="$(current_release_dir)"
  if [ -z "${current_dir}" ] || ! ensure_release_materialized "${current_dir}"; then
    if [ -n "${previous_current_dir}" ] && [ -d "${previous_current_dir}" ]; then
      point_current_to_release "${previous_current_dir}" || true
    fi
    echo "Current release link is invalid after publishing ${APP_NAME}" >&2
    exit 1
  fi
  expected_entry="${current_dir}/${SERVER_ENTRY}"
  needs_restart="1"
fi

if [ "${needs_restart}" = "1" ]; then
  echo "==> ${APP_NAME}: reloading systemd and restarting ${SERVICE_NAME}"
  systemctl daemon-reload
  systemctl restart "${SERVICE_NAME}"

  wait_http "${LOCAL_URL}" "200"
  verify_service_points_to_release "${expected_entry}"
else
  echo "==> ${APP_NAME}: current service already points to the expected release, skipping restart"
  wait_http "${LOCAL_URL}" "200"
fi

if [ -n "${NGINX_CACHE_DIR}" ] && [ -d "${NGINX_CACHE_DIR}" ]; then
  rm -rf "${NGINX_CACHE_DIR:?}/"*
  nginx -t
  systemctl reload nginx
fi

if [ -n "${PUBLIC_URL}" ]; then
  wait_http "${PUBLIC_URL}" "200"
  verify_expected_text
fi

cleanup_old_releases

echo "==> ${APP_NAME}: release published"
