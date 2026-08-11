#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

mkdir -p "$root/.toolchain/mise-config" "$root/.toolchain/mise-state" \
  "$root/.toolchain/mise-data" "$root/.toolchain/mise-cache" \
  "$root/.toolchain/go-build-cache" "$root/.toolchain/go-mod-cache" \
  "$root/.toolchain/bun-cache"

export GOTOOLCHAIN=local
export GOCACHE="$root/.toolchain/go-build-cache"
export GOMODCACHE="$root/.toolchain/go-mod-cache"
export BUN_INSTALL_CACHE_DIR="$root/.toolchain/bun-cache"

"$root/tools/mise" trust --yes "$root/.mise.toml"
"$root/tools/mise" install --locked
"$root/tools/mise" exec --locked -- go -C "$root/tools/schemami" mod download
"$root/tools/mise" exec --locked -- bun install --cwd "$root/tools/viewer" --frozen-lockfile

exec "$root/tools/schemami/check-toolchain.sh"
