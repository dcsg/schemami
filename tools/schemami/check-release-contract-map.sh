#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
map="$root/release/schemami-v1.0.0/contract-map.json"
evidence_map="$root/release/schemami-v1.0.0/evidence-map.json"
jq -e '.release == "schemami-v1.0.0" and (.artifacts | length == 26)' "$map" >/dev/null
jq -e '.release == "schemami-v1.0.0" and (.requirements | length == 9)' "$evidence_map" >/dev/null

duplicate_paths="$(jq -r '[.artifacts[].path] | group_by(.)[] | select(length > 1) | .[0]' "$map")"
duplicate_urls="$(jq -r '[.artifacts[].url] | group_by(.)[] | select(length > 1) | .[0]' "$map")"
test -z "$duplicate_paths" || { echo "release contract: duplicate path $duplicate_paths" >&2; exit 1; }
test -z "$duplicate_urls" || { echo "release contract: duplicate URL $duplicate_urls" >&2; exit 1; }

while IFS= read -r artifact; do
  path="$(jq -r '.path' <<<"$artifact")"
  url="$(jq -r '.url' <<<"$artifact")"
  media_type="$(jq -r '.media_type' <<<"$artifact")"
  test -f "$root/$path" || { echo "release contract: missing $path" >&2; exit 1; }
  case "$url" in https://schemami.dev/*) ;; *) echo "release contract: non-canonical URL $url" >&2; exit 1 ;; esac
  case "$media_type" in application/json|application/schema+json|text/html) ;; *) echo "release contract: unsupported media type $media_type" >&2; exit 1 ;; esac
  kind="$(jq -r '.kind' <<<"$artifact")"
  if [ "$kind" = schema ]; then
    jq -e . "$root/$path" >/dev/null
    test "$(jq -r '."$id"' "$root/$path")" = "$url" || { echo "release contract: schema id drift at $path" >&2; exit 1; }
  elif [ "$kind" = conformance ]; then
    jq -e . "$root/$path" >/dev/null
  elif [ "$kind" = problem ]; then
    grep -Fq '<!doctype html>' "$root/$path" || { echo "release contract: problem documentation is not HTML at $path" >&2; exit 1; }
    grep -Fq "<link rel=\"canonical\" href=\"$url\">" "$root/$path" || { echo "release contract: problem canonical URL drift at $path" >&2; exit 1; }
    grep -Fq "<meta name=\"schemami-problem-type\" content=\"$url\">" "$root/$path" || { echo "release contract: problem identity drift at $path" >&2; exit 1; }
  fi
done < <(jq -c '.artifacts[]' "$map")

expected="ambiguous-unit dependency-cycle dimension-mismatch duplicate-object-member inactive-reference invalid-decimal invalid-document invalid-json invalid-operation-arguments missing-fact missing-producer multiple-producers relative-timing-conflict resource-limit unknown-unit unresolved-reference unsupported-legacy unsupported-quantity-kind"
actual="$(jq -r '.artifacts[] | select(.kind == "problem") | .url | split("/")[-1]' "$map" | sort | tr '\n' ' ' | sed 's/ $//')"
test "$actual" = "$expected" || { echo "release contract: problem set drift: $actual" >&2; exit 1; }

while IFS= read -r type; do
  jq -e --arg type "$type" '.artifacts[] | select(.url == $type and .kind == "problem")' "$map" >/dev/null || {
    echo "release contract: vector problem is not published: $type" >&2
    exit 1
  }
done < <(jq -r '.. | objects | .type? // empty' "$root/conformance/schemami-v1/calculus.json" "$root/conformance/schemami-v1/structured-calculus.json" | sort -u)

echo "schemami release contract map: 26 unique local artifacts and 18 problem types verified"
