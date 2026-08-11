#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"
trace_file="${SCHEMAMI_CI_TRACE_FILE:-}"
if [ -n "$trace_file" ]; then : > "$trace_file"; fi

stage() {
  local id="$1"
  shift
  if [ -n "$trace_file" ]; then printf '%s\0' "$id" >> "$trace_file"; fi
  printf '\n== schemami ci stage: %s ==\n' "$id"
  "$@"
}

stage toolchain make toolchain-check
stage go tools/with-toolchain.sh go -C tools/schemami test -count=1 ./...
stage validate make validate
stage conformance make conformance
stage bundle make bundle
stage viewer make viewer
stage cutover make cutover
stage release-contract make release-contract
