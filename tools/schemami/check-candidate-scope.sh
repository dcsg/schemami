#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
scope="$root/release/schemami-v1.0.0/candidate-paths.txt"
test -f "$scope"

duplicates="$(sort "$scope" | uniq -d)"
test -z "$duplicates" || { echo "candidate scope: duplicate paths: $duplicates" >&2; exit 1; }
while IFS= read -r path; do
  test -n "$path" || { echo "candidate scope: blank path" >&2; exit 1; }
  test -f "$root/$path" || { echo "candidate scope: missing $path" >&2; exit 1; }
done <"$scope"

for required in \
  schema/schemami-v1-core.schema.json \
  schema/schemami-v1-pack.schema.json \
  conformance/schemami-v1/calculus.json \
  conformance/schemami-v1/validation.json \
  tools/schemami/main.go \
  tools/viewer/dist/index.html \
  release/schemami-v1.0.0/contract-map.json; do
  grep -Fqx "$required" "$scope" || { echo "candidate scope: required path omitted: $required" >&2; exit 1; }
done

if rg -n '(^|/)(rcplint|registry|i18n|docsite)(/|$)|\.rcp\.|PRD-00[1-6]|SPEC-00[1-6]|PLAN-rcp' "$scope"; then
  echo "candidate scope: historical implementation entered the release candidate" >&2
  exit 1
fi

echo "schemami candidate scope: $(wc -l <"$scope" | tr -d ' ') explicit files; historical dirty work excluded"

if [ "${1:-}" = "--committed" ]; then
  while IFS= read -r path; do
    git -C "$root" ls-files --error-unmatch "$path" >/dev/null 2>&1 || {
      echo "candidate scope: $path is not committed" >&2
      exit 1
    }
    git -C "$root" diff --quiet HEAD -- "$path" || {
      echo "candidate scope: $path differs from the candidate commit" >&2
      exit 1
    }
  done <"$scope"
  while IFS= read -r path; do
    grep -Fqx "$path" "$scope" || {
      echo "candidate scope: current commit includes an unreviewed path: $path" >&2
      exit 1
    }
  done < <(git -C "$root" diff-tree --no-commit-id --name-only -r HEAD)
  echo "schemami candidate scope: all release files are committed at HEAD; unrelated worktree changes ignored"
elif [ "$#" -ne 0 ]; then
  echo "usage: $0 [--committed]" >&2
  exit 64
fi
