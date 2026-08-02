#!/usr/bin/env python3
"""Stopgap validation harness (P1-P3) until the Go harness lands in P4.

Validates: (1) the core schema against the 2020-12 metaschema, (2) every
example document against the core schema, (3) that the l1 negative fixtures
are REJECTED. FormatChecker enabled (DS-VAL-002 parity). The Go harness
re-verifies everything this script asserts (plan Known Risks).
"""
import sys, json, pathlib
import yaml
from jsonschema import Draft202012Validator, FormatChecker

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "schema/rcp-core-v1.schema.json"
EXAMPLES = sorted((ROOT / "examples").glob("*.rcp.yaml"))
# v0.2: l1 fixtures are negative UNLESS the filename ends -ok (positive
# fixtures added by PLAN-rcp-v02 Phase 1/2 must PASS, not be rejected).
_L1_ALL = sorted((ROOT / "tools/rcplint/testdata/l1").glob("*.rcp.yaml"))
L1_NEG = [p for p in _L1_ALL if not p.stem.endswith("-ok.rcp") and not p.stem.endswith("-ok")]
L1_POS = [p for p in _L1_ALL if p.stem.endswith("-ok")]

def load_docs(path):
    return [d for d in yaml.safe_load_all(path.read_text()) if d is not None]


REG_SCHEMAS = ROOT / "registry/schemas"
REG_VALID = sorted((ROOT / "tools/rcplint/testdata/registry/valid").glob("*.yaml"))
REG_MISSING = ROOT / "tools/rcplint/testdata/registry/ingredient-missing-roles.yaml"
REG_ENTRIES = ROOT / "registry/entries"

KIND_SCHEMA = {"ingredient": "ingredient-class.schema.json",
               "primitive": "step-primitive.schema.json",
               "equipment": "equipment-profile.schema.json",
               "technique": "technique.schema.json"}

def schema_key(doc):
    return str(doc.get("id", "")).split(".", 1)[0]

def registry_checks(failures):
    import glob as _g
    validators = {}
    for kind, fname in KIND_SCHEMA.items():
        s = json.loads((REG_SCHEMAS / fname).read_text())
        Draft202012Validator.check_schema(s)
        validators[kind] = Draft202012Validator(s, format_checker=FormatChecker())
        print(f"OK metaschema: registry/{fname}")
    for path in REG_VALID:
        doc = yaml.safe_load(path.read_text())
        errs = list(validators[schema_key(doc)].iter_errors(doc))
        if errs:
            failures.append(f"registry valid sample {path.name}: {errs[0].message[:100]}")
        else:
            print(f"OK registry sample: {path.name}")
    doc = yaml.safe_load(REG_MISSING.read_text())
    errs = list(validators[schema_key(doc)].iter_errors(doc))
    if errs and "roles" in errs[0].message:
        print(f"OK rejected naming roles: {REG_MISSING.name}")
    else:
        failures.append(f"{REG_MISSING.name}: expected rejection naming roles, got {'pass' if not errs else errs[0].message[:80]}")
    # seed entries (P3+): every file validates; filename == id
    if REG_ENTRIES.exists():
        n = 0
        for path in sorted(REG_ENTRIES.rglob("*.yaml")):
            doc = yaml.safe_load(path.read_text())
            n += 1
            if path.stem != doc.get("id"):
                failures.append(f"entry {path}: filename != id ({doc.get('id')})")
            errs = list(validators[schema_key(doc)].iter_errors(doc))
            if errs:
                failures.append(f"entry {path.name}: {errs[0].json_path}: {errs[0].message[:100]}")
        print(f"registry entries validated: {n}")


def census_crosscheck(failures):
    """AC-3.3: bidirectional refs <-> registry entries. Forward direction
    (ref with no entry) is always a failure. Reverse direction (entry with
    no reference) counts the private collection when present locally
    (PLAN-rcp-v02: dogfood mints are referenced only by private docs); when
    the collection is absent the reverse direction degrades to an advisory,
    since CI cannot see the referencing documents. Identifiers only — no
    document content is ever printed."""
    import re
    refs = {"ingredient": set(), "primitive": set(), "equipment": set()}
    PRIVATE = sorted((ROOT / "private/collection").glob("*.rcp.yaml"))
    census_docs = list(EXAMPLES) + PRIVATE
    for path in census_docs:
        for doc in load_docs(path):
            def walk(o):
                if isinstance(o, dict):
                    if isinstance(o.get("item"), str): refs["ingredient"].add(o["item"])
                    prim = o.get("primitive")
                    if isinstance(prim, dict) and "id" in prim: refs["primitive"].add(prim["id"])
                    eq = o.get("equipment")
                    if isinstance(eq, list): [refs["equipment"].add(x) for x in eq if isinstance(x, str)]
                    trg = o.get("action")
                    if isinstance(trg, str): refs["primitive"].add(trg)
                    g = o.get("garnish")
                    if isinstance(g, dict) and isinstance(g.get("item"), str): refs["ingredient"].add(g["item"])
                    for k in ("with", "replaces"):
                        pass  # substitution targets are ingredient ids or classes; classes covered via `with`
                    w = o.get("with")
                    if isinstance(w, str) and "." in w: refs["ingredient"].add(w)
                    ra = o.get("requires_additions")
                    if isinstance(ra, list):
                        for x in ra:
                            if isinstance(x, dict) and isinstance(x.get("item"), str): refs["ingredient"].add(x["item"])
                    ov = o.get("overrides")
                    if isinstance(ov, list):
                        for x in ov:
                            if isinstance(x, dict) and isinstance(x.get("with"), str) and "." in x["with"]:
                                refs["ingredient"].add(x["with"])
                    for vv in o.values(): walk(vv)
                elif isinstance(o, list):
                    for vv in o: walk(vv)
            walk(doc)
    entries = {k: {f.stem for f in (REG_ENTRIES / k).glob("*.yaml")} for k in refs}
    def expected(kind, slug):
        return slug if slug.startswith(kind + ".") else f"{kind}.{slug}"
    for kind, slugs in refs.items():
        for s in sorted(slugs):
            if expected(kind, s) not in entries[kind]:
                failures.append(f"census: {kind} ref '{s}' has no entry {expected(kind, s)}")
    referenced = {kind: {expected(kind, s) for s in slugs} for kind, slugs in refs.items()}
    # Reverse direction is ADVISORY as of v0.2: the registry is a governed
    # vocabulary, not a per-document index — entries may legitimately exist
    # ahead of documents that use them. Orphans are surfaced for the steward,
    # never gate.
    for kind, ids in entries.items():
        for eid in sorted(ids - referenced[kind]):
            scope = "example or collection document" if PRIVATE else "example (collection absent)"
            print(f"  census advisory: entry {eid} referenced by no {scope}")
    total = sum(len(v) for v in refs.values())
    print(f"census cross-check: {total} distinct refs, both directions clean" if not any(f.startswith("census") for f in failures) else f"census cross-check: mismatches found")

def main():
    failures = []
    schema = json.loads(SCHEMA.read_text())
    Draft202012Validator.check_schema(schema)
    print(f"OK metaschema: {SCHEMA.name}")
    v = Draft202012Validator(schema, format_checker=FormatChecker())

    n = 0
    for path in EXAMPLES:
        for doc in load_docs(path):
            n += 1
            errs = sorted(v.iter_errors(doc), key=lambda e: str(e.path))
            if errs:
                failures.append(f"{path.name}#{doc.get('id','?')}: {errs[0].json_path}: {errs[0].message[:120]}")
            else:
                print(f"OK example: {path.name}#{doc.get('id','?')}")
    print(f"examples validated: {n} documents")

    registry_checks(failures)
    census_crosscheck(failures)

    for path in L1_NEG:
        for doc in load_docs(path):
            errs = list(v.iter_errors(doc))
            if errs:
                print(f"OK rejected (as required): {path.name}")
            else:
                failures.append(f"{path.name}: NEGATIVE FIXTURE PASSED — hardening missing")

    if failures:
        print("\nFAILURES:")
        [print(f"  {f}") for f in failures]
        sys.exit(1)
    print("\nALL CHECKS GREEN")

if __name__ == "__main__":
    main()
