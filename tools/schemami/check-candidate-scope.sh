#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
scope="$root/release/schemami-v1.0.0/candidate-paths.txt"
removed="$root/release/schemami-v1.0.0/removed-paths.txt"
test -f "$scope"
test -f "$removed"

duplicates="$(sort "$scope" | uniq -d)"
test -z "$duplicates" || { echo "candidate scope: duplicate paths: $duplicates" >&2; exit 1; }
while IFS= read -r path; do
  test -n "$path" || { echo "candidate scope: blank path" >&2; exit 1; }
  test -f "$root/$path" || { echo "candidate scope: missing $path" >&2; exit 1; }
done <"$scope"

removed_duplicates="$(sort "$removed" | uniq -d)"
test -z "$removed_duplicates" || { echo "candidate scope: duplicate removal paths: $removed_duplicates" >&2; exit 1; }
while IFS= read -r path; do
  test -n "$path" || { echo "candidate scope: blank removal path" >&2; exit 1; }
  ! grep -Fqx "$path" "$scope" || { echo "candidate scope: $path is both retained and removed" >&2; exit 1; }
  test ! -e "$root/$path" || { echo "candidate scope: removed path still exists: $path" >&2; exit 1; }
done <"$removed"

for required in \
  schema/schemami-v1-core.schema.json \
  schema/schemami-v1-bundle.schema.json \
  conformance/schemami-v1/calculus.json \
  conformance/schemami-v1/canonicalization.json \
  conformance/schemami-v1/diff.json \
  conformance/schemami-v1/resource-budgets.json \
  conformance/schemami-v1/structured-calculus.json \
  conformance/schemami-v1/validation.json \
  sdk/go/api.go \
  sdk/swift/Package.swift \
  sdk/typescript/package.json \
  tools/schemami/main.go \
  tools/viewer/dist/index.html \
  release/schemami-v1.0.0/contract-map.json; do
  grep -Fqx "$required" "$scope" || { echo "candidate scope: required path omitted: $required" >&2; exit 1; }
done

if rg -n '(^|/)(rcplint|registry|i18n|docsite)(/|$)|\.rcp\.|PRD-00[1-6]|SPEC-00[1-6]|PLAN-rcp' "$scope"; then
  echo "candidate scope: historical implementation entered the release candidate" >&2
  exit 1
fi

echo "schemami candidate scope: $(wc -l <"$scope" | tr -d ' ') retained files and $(wc -l <"$removed" | tr -d ' ') removals; historical dirty work excluded"

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
    git -C "$root" ls-files --error-unmatch "$path" >/dev/null 2>&1 && {
      echo "candidate scope: removed path remains tracked at HEAD: $path" >&2
      exit 1
    }
  done <"$removed"
  while IFS=$'\t' read -r status path; do
    case "$status" in
      D)
        grep -Fqx "$path" "$removed" || {
          echo "candidate scope: current commit removes an unreviewed path: $path" >&2
          exit 1
        }
        ;;
      A|M|T)
        grep -Fqx "$path" "$scope" || {
          echo "candidate scope: current commit includes an unreviewed path: $path" >&2
          exit 1
        }
        ;;
      *)
        echo "candidate scope: unsupported commit change $status for $path" >&2
        exit 1
        ;;
    esac
  done < <(git -C "$root" diff-tree --no-commit-id --name-status -r HEAD)
  echo "schemami candidate scope: all retained and removed release paths are committed at HEAD; unrelated worktree changes ignored"
elif [ "$#" -ne 0 ]; then
  echo "usage: $0 [--committed]" >&2
  exit 64
fi
