#!/usr/bin/env python3
"""Gap ledger (the consolidation gate between ingestion and minting).

Scans the private collection for unresolved imports (item: null), groups
them by normalized surface form, deduplicates ACROSS recipes, and checks
each against the existing registry (ids, display names, aliases) so the
steward reviews ONE consolidated mint-or-alias proposal instead of
per-recipe fragments. Extraction never mints; this ledger is how gaps
travel to governance (registry-governance directive: additions via PR
stating which recipe demanded the entry)."""
import re, sys, pathlib, difflib
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[3]
COLLECTION = ROOT / "private/collection"
ENTRIES = ROOT / "registry/entries/ingredient"

def normalize(raw):
    s = raw.lower()
    s = re.sub(r"\d+(\.\d+)?\s*(g|ml|tsp|tbsp|kg|l)\b", "", s)   # strip quantities
    s = re.sub(r"\b(\d+/\d+|\d+)\b", "", s)
    s = re.sub(r"\b(room.temperature|melted|unsalted|for the (moulds?|tins?)|small|large|about)\b", "", s)
    s = re.sub(r"[^a-z ]", " ", s)
    return " ".join(s.split())

def main():
    registry = {}
    for p in sorted(ENTRIES.glob("*.yaml")):
        e = yaml.safe_load(p.read_text())
        names = [e["id"]] + list(e.get("display_name", {}).values()) + e.get("aliases", [])
        registry[e["id"]] = [n.lower() for n in names]

    gaps = {}   # normalized -> {raws: set, recipes: set, roles: set}
    for p in sorted(COLLECTION.glob("*.rcp.yaml")):
        doc = yaml.safe_load(p.read_text())
        for ing in doc.get("ingredients", []):
            if ing.get("item") is not None:
                continue
            raw = ing.get("raw", ing.get("id", "?"))
            key = normalize(raw)
            g = gaps.setdefault(key, {"raws": set(), "recipes": set(), "roles": set()})
            g["raws"].add(raw)
            g["recipes"].add(doc["id"])
            g["roles"].update(ing.get("roles", []))

    print(f"GAP LEDGER — {len(gaps)} distinct classes from "
          f"{sum(len(g['raws']) for g in gaps.values())} raw occurrences "
          f"across {len(list(COLLECTION.glob('*.rcp.yaml')))} private recipes\n")
    for key, g in sorted(gaps.items()):
        near = []
        for eid, names in registry.items():
            score = max(difflib.SequenceMatcher(None, key, n).ratio() for n in names)
            if score > 0.55:
                near.append((score, eid))
        near.sort(reverse=True)
        print(f"■ {key or '(unnormalizable)'}")
        print(f"    raws:    {sorted(g['raws'])}")
        print(f"    demanded by: {sorted(g['recipes'])}   roles: {sorted(g['roles'])}")
        if near:
            print(f"    NEAR-MATCHES (alias instead of mint?): "
                  + ", ".join(f"{eid} ({s:.0%})" for s, eid in near[:3]))
        else:
            print(f"    no near-match — likely a genuine MINT")
        print()

if __name__ == "__main__":
    main()
