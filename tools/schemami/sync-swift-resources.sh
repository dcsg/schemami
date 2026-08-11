#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
"$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run ./cmd/swift-resources sync "$root"
