#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go test -mod=readonly -run 'TestParseAndCanonicalizationUseIJSONAndJCS|TestCanonicalFixtureDigestIsPinned|TestFileSuffixesArePartOfWireIdentity' ./...
)

digest="$(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . digest testdata/basic.schemami.yaml
)"
test "$digest" = "d281957075f4f98b5e5021f6aa7ba4ee901f7a32c64a5d613dbb8aee7236bbe0"

echo "schemami canonical wire: valid"
