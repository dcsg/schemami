#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" run . validate-bundle \
  "$root/examples/paodeportugal.schemami-bundle.json"
