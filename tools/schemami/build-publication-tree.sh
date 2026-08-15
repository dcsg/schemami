#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
output="${1:?output directory required}"
manifest="${2:-}"
map="$root/release/schemami-v1.0.0/contract-map.json"

if [ -e "$output" ] && [ -n "$(find "$output" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
  echo "publication tree: output directory must be absent or empty: $output" >&2
  exit 1
fi
mkdir -p "$output"

headers="$output/_headers"
: >"$headers"

while IFS= read -r artifact; do
  source_path="$root/$(jq -r '.path' <<<"$artifact")"
  url_path="$(jq -r '.url | sub("^https://schemami.dev/"; "")' <<<"$artifact")"
  media_type="$(jq -r '.media_type' <<<"$artifact")"
  destination="$output/$url_path"
  if [ "$media_type" = text/html ]; then destination="$destination.html"; fi
  mkdir -p "$(dirname "$destination")"
  cp "$source_path" "$destination"
  if [ "$media_type" = application/schema+json ]; then
    printf '/%s\n  Content-Type: %s\n\n' "$url_path" "$media_type" >>"$headers"
  fi
done < <(jq -c '.artifacts[]' "$map")

if [ -n "$manifest" ]; then
  test -f "$manifest"
  manifest_path="$(jq -r '.manifest_url | sub("^https://schemami.dev/"; "")' "$manifest")"
  mkdir -p "$output/$(dirname "$manifest_path")"
  cp "$manifest" "$output/$manifest_path"
fi

echo "publication tree: built $output"
