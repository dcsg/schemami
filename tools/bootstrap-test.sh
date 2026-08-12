#!/usr/bin/env bash
# Prove a first bootstrap and a second network-disabled bootstrap from an
# isolated copy without mutating source locks.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
host_mise="$(command -v mise || true)"
if [ -z "$host_mise" ] || ! "$host_mise" --version | grep -Eq '^2026\.3\.17( |$)'; then
  echo "bootstrap test: host mise 2026.3.17 is required" >&2
  exit 1
fi

test_root="$(mktemp -d "${TMPDIR:-/tmp}/schemami-bootstrap.XXXXXX")"
work="$test_root/work"
test_home="$test_root/home"
cleanup() {
  chmod -R u+w "$test_root" 2>/dev/null || true
  rm -rf -- "$test_root"
}
trap cleanup EXIT
mkdir -p "$work" "$test_home"

tar -C "$root" --exclude .git --exclude .toolchain --exclude node_modules -cf - . |
  tar -C "$work" -xf -

source_before="$test_root/source-before.sha256"
source_after="$test_root/source-after.sha256"
cache_first="$test_root/cache-first.sha256"
cache_second="$test_root/cache-second.sha256"
source_locks=(
  .mise.toml
  mise.lock
  tools/schemami/go.mod
  tools/schemami/go.sum
  tools/viewer/package.json
  tools/viewer/bun.lock
)

(
  cd "$work"
  shasum -a 256 "${source_locks[@]}"
) >"$source_before"

isolated() {
  env -i \
    HOME="$test_home" \
    PATH="/usr/bin:/bin" \
    MISE_BIN="$host_mise" \
    XDG_CONFIG_HOME="$test_root/xdg-config" \
    XDG_CACHE_HOME="$test_root/xdg-cache" \
    XDG_DATA_HOME="$test_root/xdg-data" \
    XDG_STATE_HOME="$test_root/xdg-state" \
    "$@"
}

echo "bootstrap test: first isolated run"
isolated bash "$work/tools/bootstrap.sh" >/dev/null
find "$work/.toolchain" -type f -print0 | sort -z | xargs -0 shasum -a 256 >"$cache_first"

echo "bootstrap test: second isolated network-disabled run"
isolated \
  MISE_LOCKED=1 GONOSUMDB='*' GOSUMDB=off GOPROXY=off \
  BUN_INSTALL_OFFLINE=1 \
  http_proxy=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 \
  bash "$work/tools/bootstrap.sh" >/dev/null
find "$work/.toolchain" -type f -print0 | sort -z | xargs -0 shasum -a 256 >"$cache_second"
cmp -s "$cache_first" "$cache_second" || {
  echo "bootstrap test: second run changed cached artifacts" >&2
  exit 1
}
(
  cd "$work"
  shasum -a 256 "${source_locks[@]}"
) >"$source_after"
cmp -s "$source_before" "$source_after" || {
  echo "bootstrap test: bootstrap changed repository locks" >&2
  exit 1
}

echo "bootstrap test: isolated first run and network-disabled second run passed"
