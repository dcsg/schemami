#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
export SCHEMAMI_TOOLCHAIN_ACTIVE=1
export GOTOOLCHAIN=local
export GOCACHE="$root/.toolchain/go-build-cache"
export GOMODCACHE="$root/.toolchain/go-mod-cache"
export BUN_INSTALL_CACHE_DIR="$root/.toolchain/bun-cache"
exec "$root/tools/mise" exec --locked -- "$@"
