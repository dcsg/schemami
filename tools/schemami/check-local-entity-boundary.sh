#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go -C "$root/tools/schemami" test -mod=readonly . -run TestValidateAdmitsUnknownRecipeLocalConceptsWithoutRegistry
"$root/tools/with-toolchain.sh" bun test "$root/tools/viewer/conformance/schemami-local-entities.test.ts"

echo "schemami local entity boundary: valid"
