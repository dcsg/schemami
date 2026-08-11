#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test -mod=readonly ./calculus -run 'TestSharedCalculusVectors|TestSharedVectorEnvelopeInvariants'
"$root/tools/with-toolchain.sh" bun test \
  "$root/tools/viewer/conformance/schemami-calculus.test.ts" \
  "$root/tools/viewer/conformance/schemami-phase9.test.ts"

if rg -n -i 'raw_text|confidence|instruction|evidence|notes' \
  "$root/tools/schemami/calculus/calculus.go" \
  "$root/tools/viewer/src/schemami/calculus.ts"; then
  echo "normative calculus references prose or evidence fields" >&2
  exit 1
fi

echo "schemami diagnostic and prose-isolation boundary: valid"
