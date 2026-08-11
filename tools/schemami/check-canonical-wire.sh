#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go test -mod=readonly -run 'TestCanonicalisationUsesIJSONAndJCS|TestCanonicaliseFilePinsFixtureDigest|TestParseDocumentRejectsDuplicateJSONKeys|TestFileSuffixesArePartOfTheWireIdentity' ./...
)

digest="$(
  cd "$root/tools/schemami"
  GOSUMDB=off GOPROXY=off "$root/tools/with-toolchain.sh" go run -mod=readonly . digest testdata/basic.schemami.yaml
)"
test "$digest" = "f0670a641fbb55823d24814dee65f4e235fb74aa264db4d9fc247d7250b9f395"

echo "schemami canonical wire: valid"
