#!/usr/bin/env python3
"""i18n coverage check (AC-I18N-001-1; SR-I18N-001). Every taxonomy slug
(category, subcategory) and tag used across examples/ and the private
collection has a pt-PT display term in i18n/pt-PT.yaml. Failures name only
the missing slug — never document content.

Two modes (pre-flight criteria fix, 2026-08-02): when the collection path
does not exist (CI, fresh clone) the census covers examples only and says
so; locally it is the full census. --collection-path exists so tests can
exercise the absent branch against a nonexistent directory instead of
moving real local data."""
import argparse, pathlib, sys
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[3]

def used_slugs(paths):
    used = set()
    for p in paths:
        for d in yaml.safe_load_all(p.read_text()):
            if not d:
                continue
            tax = d.get("taxonomy") or {}
            if tax.get("category"):
                used.add(("taxonomy", tax["category"]))
            for s in tax.get("subcategory") or []:
                used.add(("taxonomy", s))
            for s in d.get("tags") or []:
                used.add(("tags", s))
    return used

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--collection-path", default=str(ROOT / "private/collection"))
    args = ap.parse_args()

    vocab = yaml.safe_load((ROOT / "i18n/pt-PT.yaml").read_text())
    docs = sorted((ROOT / "examples").glob("*.rcp.yaml"))
    coll = pathlib.Path(args.collection_path)
    if coll.is_dir():
        docs += sorted(coll.glob("*.rcp.yaml"))
        mode = "full census (examples + collection)"
    else:
        mode = "examples only — collection absent, SKIP-WITH-NOTICE (local run covers the rest)"

    missing = sorted(f"{sec}:{slug}" for sec, slug in used_slugs(docs)
                     if slug not in (vocab.get(sec) or {}))
    print(f"i18n coverage [{mode}]: {len(used_slugs(docs))} slugs checked")
    if missing:
        for m in missing:
            print(f"  MISSING pt-PT term: {m}")
        sys.exit(1)
    print("  all covered")

if __name__ == "__main__":
    main()
