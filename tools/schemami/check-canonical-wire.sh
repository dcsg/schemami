#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go test -mod=readonly -run 'TestParseAndCanonicalizationUseIJSONAndJCS|TestCanonicalFixtureDigestIsPinned|TestFileSuffixesArePartOfWireIdentity' ./...
)

digest="$(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . digest ../../conformance/schemami-v1/canonicalization/member-order-a.schemami.json
)"
test "$digest" = "e0066948ac7fc695ac5769afb4977c849d3584145cc1f7541d9e46cc6ad7f657"

if (
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . digest testdata/basic.schemami.yaml
) >/dev/null 2>&1; then
  echo "YAML unexpectedly received canonical identity" >&2
  exit 1
fi

echo "schemami canonical wire: valid"
