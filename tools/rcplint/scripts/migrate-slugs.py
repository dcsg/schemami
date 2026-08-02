#!/usr/bin/env python3
"""One-shot slug migration (CMP-REG-003 / DECISIONS #23): rewrite every
registry reference in examples/ from bare to kind-prefixed form.
Context-aware — technique vocab (e.g. technique: stir) and local ids
(replaces/uses/safety_refs) are NOT registry refs and stay untouched.
The defect trio (mm-feed basis / calda / ganache version) is out of scope
by construction: none is a registry reference."""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
ING = {p.stem.removeprefix("ingredient.") for p in (ROOT / "registry/entries/ingredient").glob("*.yaml")}
PRIM = {p.stem.removeprefix("primitive.") for p in (ROOT / "registry/entries/primitive").glob("*.yaml")}
EQ = {p.stem.removeprefix("equipment.") for p in (ROOT / "registry/entries/equipment").glob("*.yaml")}

def migrate(text):
    # 1. ingredient refs: item: <slug>  (ingredients, garnish, requires_additions)
    def ing_sub(m):
        slug = m.group(2)
        return m.group(1) + ("ingredient." + slug if slug in ING else slug)
    text = re.sub(r'(item: )([a-z0-9][a-z0-9.-]*)', ing_sub, text)
    # 2. substitution/override targets that are classes (dotted => registry ref)
    def with_sub(m):
        slug = m.group(2)
        return m.group(1) + ("ingredient." + slug if slug in ING else slug)
    text = re.sub(r'(with: )([a-z0-9][a-z0-9.-]*)', with_sub, text)
    # 3. primitives: primitive: { id: <slug>
    def prim_sub(m):
        slug = m.group(2)
        return m.group(1) + ("primitive." + slug if slug in PRIM else slug)
    text = re.sub(r'(primitive: \{ id: )([a-z0-9.-]+)', prim_sub, text)
    # 4. trigger actions
    text = re.sub(r'(action: )(burp)\b', r'\1primitive.\2', text)
    # 5. equipment lists + serving.ice
    def eq_token(m):
        slug = m.group(0)
        return "equipment." + slug if slug in EQ else slug
    def eq_list(m):
        inner = re.sub(r'[a-z0-9][a-z0-9.-]*', eq_token, m.group(2))
        return m.group(1) + inner + m.group(3)
    text = re.sub(r'(equipment: \[)([^\]]*)(\])', eq_list, text)
    text = re.sub(r'(ice: )([a-z0-9.-]+)', lambda m: m.group(1) + ("equipment." + m.group(2) if m.group(2) in EQ else m.group(2)), text)
    return text

if __name__ == "__main__":
    for path in sorted((ROOT / "examples").glob("*.rcp.yaml")):
        t = path.read_text()
        nt = migrate(t)
        path.write_text(nt)
        print(f"migrated {path.name}: {sum(1 for a, b in zip(t.splitlines(), nt.splitlines()) if a != b)} lines changed")
