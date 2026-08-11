#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
map="$root/release/schemami-v1.0.0/contract-map.json"
output="${1:-$root/release/schemami-v1.0.0.manifest.json}"

bash "$root/tools/schemami/check-candidate-scope.sh" --committed >/dev/null
bash "$root/tools/schemami/check-release-contract-map.sh" >/dev/null

source_commit="$(git -C "$root" rev-parse HEAD)"
source_tree="$(git -C "$root" rev-parse 'HEAD^{tree}')"
committed_at="$(git -C "$root" show -s --format=%cI HEAD)"
map_digest="$(shasum -a 256 "$map" | awk '{print $1}')"
artifacts='[]'
while IFS= read -r artifact; do
  path="$(jq -r '.path' <<<"$artifact")"
  digest="$(shasum -a 256 "$root/$path" | awk '{print $1}')"
  bytes="$(wc -c <"$root/$path" | tr -d ' ')"
  artifacts="$(jq -cn --argjson items "$artifacts" --argjson artifact "$artifact" --arg digest "$digest" --argjson bytes "$bytes" '$items + [$artifact + {sha256:$digest, bytes:$bytes}]')"
done < <(jq -c '.artifacts[]' "$map")

temporary="$(mktemp "$root/release/.schemami-v1.0.0.manifest.XXXXXX")"
cleanup() { rm -f -- "$temporary"; }
trap cleanup EXIT
jq -n \
  --arg release schemami-v1.0.0 \
  --arg manifest_url https://schemami.dev/releases/schemami-v1.0.0.json \
  --arg source_commit "$source_commit" \
  --arg source_tree "$source_tree" \
  --arg committed_at "$committed_at" \
  --arg contract_map_sha256 "$map_digest" \
  --argjson artifacts "$artifacts" \
  '{manifest_version:1, release:$release, manifest_url:$manifest_url, source_commit:$source_commit, source_tree:$source_tree, source_committed_at:$committed_at, contract_map_sha256:$contract_map_sha256, artifacts:$artifacts}' \
  >"$temporary"
mv -- "$temporary" "$output"
trap - EXIT
echo "release manifest: wrote $output for $source_commit"
