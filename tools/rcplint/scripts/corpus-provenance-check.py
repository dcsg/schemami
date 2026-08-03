#!/usr/bin/env python3
"""Published corpus provenance check (pre-flight security #3).

The existing gates catch binary media and base64 payloads. They do NOT
catch PROSE: the cheapest way to author a new published collection is to
copy documents out of the private collection, and book-derived step text
in examples/ would sail through every check green.

This asserts the boundary the other gates cannot see: no document in the
published corpus may name a provenance source that appears ONLY in the
private collection. When private/collection/ is absent (a clean clone),
the check reports SKIP-WITH-NOTICE — it cannot compare against something
that is not there, and says so rather than passing silently.

Usage: corpus-provenance-check.py <repo-root>
"""

import glob
import os
import sys

try:
    import yaml
except ImportError:
    print("corpus-provenance-check: PyYAML unavailable — SKIP", file=sys.stderr)
    sys.exit(0)


def source_labels(doc: dict) -> set[str]:
    """Every source label/work a document names in its provenance."""
    out: set[str] = set()
    prov = doc.get("provenance") or {}
    for s in prov.get("sources") or []:
        if isinstance(s, dict):
            for key in ("label", "work"):
                v = s.get(key)
                if isinstance(v, str) and v.strip():
                    out.add(v.strip().lower())
    return out


def load_docs(pattern: str) -> list[tuple[str, dict]]:
    docs = []
    for path in sorted(glob.glob(pattern, recursive=True)):
        with open(path, encoding="utf-8") as f:
            for d in yaml.safe_load_all(f):
                if isinstance(d, dict):
                    docs.append((path, d))
    return docs


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    private_dir = os.path.join(root, "private", "collection")
    if not os.path.isdir(private_dir):
        print("corpus-provenance-check: private collection absent — SKIP-WITH-NOTICE "
              "(cannot compare; this covers LESS than a local run)")
        return 0

    private_sources: set[str] = set()
    for _, d in load_docs(os.path.join(private_dir, "**", "*.rcp.yaml")):
        private_sources |= source_labels(d)

    published = load_docs(os.path.join(root, "examples", "**", "*.rcp.yaml"))
    violations = []
    for path, d in published:
        shared = source_labels(d) & private_sources
        for s in sorted(shared):
            violations.append(f"{os.path.relpath(path, root)}#{d.get('id')}: "
                              f"names provenance source {s!r}, which appears in the private collection")

    for v in violations:
        print(f"CORPUS PROVENANCE FAIL: {v}", file=sys.stderr)
    if violations:
        print("\nA published document must be authored from own or public-domain sources. "
              "Book-derived prose passes every other gate — this is the one that sees it.",
              file=sys.stderr)
        return 1

    print(f"corpus provenance clean: {len(published)} published documents, "
          f"none sharing a source with the private collection")
    return 0


if __name__ == "__main__":
    sys.exit(main())
