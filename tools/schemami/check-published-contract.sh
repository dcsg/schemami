#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
manifest="${1:-$root/release/schemami-v1.0.0.manifest.json}"
test -f "$manifest" || {
  echo "published contract: release manifest is absent; build it from a clean candidate commit" >&2
  exit 1
}
jq -e '.manifest_version == 1 and .release == "schemami-v1.0.0" and .manifest_url == "https://schemami.dev/releases/schemami-v1.0.0.json" and (.source_commit | test("^[a-f0-9]{40}$"))' "$manifest" >/dev/null

download_root="$(mktemp -d "${TMPDIR:-/tmp}/schemami-published-contract.XXXXXX")"
cleanup() { rm -rf -- "$download_root"; }
trap cleanup EXIT

published_manifest="$download_root/manifest.json"
manifest_metadata="$download_root/manifest.metadata"
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
  --output "$published_manifest" --write-out '%{url_effective}\n%{content_type}\n' \
  "$(jq -r '.manifest_url' "$manifest")" >"$manifest_metadata"
case "$(sed -n '1p' "$manifest_metadata")" in https://schemami.dev/*) ;; *) echo "published contract: manifest resolved outside schemami.dev" >&2; exit 1 ;; esac
case "$(sed -n '2p' "$manifest_metadata")" in application/json|application/json\;*) ;; *) echo "published contract: manifest media type is not application/json" >&2; exit 1 ;; esac
cmp -s "$manifest" "$published_manifest" || { echo "published contract: published release manifest bytes differ" >&2; exit 1; }

index=0
while IFS= read -r artifact; do
  url="$(jq -r '.url' <<<"$artifact")"
  expected="$(jq -r '.sha256' <<<"$artifact")"
  media_type="$(jq -r '.media_type' <<<"$artifact")"
  body="$download_root/$index.body"
  headers="$download_root/$index.headers"
  metadata="$download_root/$index.metadata"
  curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
    --dump-header "$headers" --output "$body" --write-out '%{url_effective}\n%{content_type}\n' "$url" >"$metadata"
  effective="$(sed -n '1p' "$metadata")"
  actual_type="$(sed -n '2p' "$metadata")"
  case "$effective" in https://schemami.dev/*) ;; *) echo "published contract: $url resolved outside schemami.dev to $effective" >&2; exit 1 ;; esac
  case "$actual_type" in "$media_type"|"$media_type;"*) ;; *) echo "published contract: media type drift at $url: $actual_type" >&2; exit 1 ;; esac
  actual="$(shasum -a 256 "$body" | awk '{print $1}')"
  test "$actual" = "$expected" || { echo "published contract: digest mismatch at $url" >&2; exit 1; }
  index=$((index + 1))
done < <(jq -c '.artifacts[]' "$manifest")

echo "published contract: versioned manifest and $index HTTPS artifacts match the candidate bytes"
