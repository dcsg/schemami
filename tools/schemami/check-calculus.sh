#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test -mod=readonly ./calculus
"$root/tools/with-toolchain.sh" bun test \
  "$root/tools/viewer/conformance/schemami-calculus.test.ts" \
  "$root/tools/viewer/conformance/schemami-phase9.test.ts"

echo "schemami exact calculus: valid"
