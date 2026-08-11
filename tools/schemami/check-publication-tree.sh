#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
map="$root/release/schemami-v1.0.0/contract-map.json"
proof_root="$(mktemp -d /private/tmp/schemami-publication-tree.XXXXXX)"
cleanup() { rm -rf -- "$proof_root"; }
trap cleanup EXIT

bash "$root/tools/schemami/build-publication-tree.sh" "$proof_root/public" >/dev/null
while IFS= read -r artifact; do
  source_path="$root/$(jq -r '.path' <<<"$artifact")"
  url_path="$(jq -r '.url | sub("^https://schemami.dev/"; "")' <<<"$artifact")"
  media_type="$(jq -r '.media_type' <<<"$artifact")"
  destination="$proof_root/public/$url_path"
  if [ "$media_type" = text/html ]; then destination="$destination.html"; fi
  cmp -s "$source_path" "$destination" || { echo "publication tree: byte drift for $url_path" >&2; exit 1; }
done < <(jq -c '.artifacts[]' "$map")

expected_headers="$(printf '%s\n' \
  '/schema/schemami/1/core.schema.json' \
  '  Content-Type: application/schema+json' \
  '' \
  '/schema/schemami/1/pack.schema.json' \
  '  Content-Type: application/schema+json')"
test "$(cat "$proof_root/public/_headers")" = "$expected_headers" || {
  echo "publication tree: Cloudflare schema media-type rules drifted" >&2
  exit 1
}
test "$(find "$proof_root/public" -type f | wc -l | tr -d ' ')" = 15
echo "schemami publication tree: 14 route artifacts and Cloudflare media-type rules assembled byte-for-byte"
