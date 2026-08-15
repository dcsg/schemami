#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
map="$root/release/schemami-v1.0.0/contract-map.json"
output="${1:-$root/release/schemami-v1.0.0.manifest.json}"

bash "$root/tools/schemami/check-candidate-scope.sh" --committed >/dev/null
bash "$root/tools/schemami/check-release-contract-map.sh" >/dev/null

source_commit="$(git -C "$root" rev-parse HEAD)"
"$root/tools/with-toolchain.sh" bun run "$root/tools/schemami/build-release-manifest.ts" "$output" >/dev/null
echo "release manifest: wrote $output for $source_commit"
