---
title: "PRD-007 local identifier runtime audit"
date: 2026-08-11
status: accepted-evidence
scope: "Recipe-local identifiers in repository examples and rcplint YAML fixtures"
---

# PRD-007 local identifier runtime audit

## Finding

The accepted local-vocabulary architecture needs exact-match identifiers inside
one recipe, but it does not need global slugs or ontology-shaped names. Model 1
reuses one permissive slug grammar across local and global scopes. Schemami v1
must choose local-ID portability deliberately rather than inherit that global
history.

## Measured corpus

The audit recursively inspected `id` members in `examples/*.{yaml,yml}` and
`tools/rcplint/testdata/**/*.{yaml,yml}`, then classified IDs inside ingredient,
step, technique, equipment, component, and option collections.

| Measure | Observed value |
|---|---:|
| YAML files inspected | 56 |
| all `id` occurrences | 306 |
| recipe-local `id` occurrences | 162 |
| unique recipe-local values | 79 |
| maximum local-ID length | 21 |
| local IDs containing `.` | 0 |
| local IDs containing `_` | 0 |
| local IDs outside Model 1 lowercase ASCII slug grammar | 0 |

The longest observed value is `misturar-pos-autolise` at 21 characters. This
is evidence about the current corpus, not proof that every integrator should be
limited to Portuguese/English ASCII kebab case.

## Runtime assumption audit

- Local ingredient, component, step, produced-intermediate, dependency, and
  schedule resolution uses exact string keys. It does not split local IDs into
  namespaces or derive behavior from their spelling.
- Dot-segment extraction in `tools/rcplint/mentions.go`, kind-prefix checks in
  `tools/rcplint/lint.go`, and the current lowercase slug freeze tests serve
  Model 1 registry/global-slug behavior. They are cutover work, not a reason to
  retain a global identifier convention in Schemami v1.
- The viewer's registry fallback treats dotted IDs as display vocabulary. That
  path disappears with mandatory registry presentation; local entity names and
  step instructions become the authored display source.
- No retained Recipe Calculus operation was found to branch on letter case,
  punctuation, a dot segment, or a language-derived local-ID token.

Consequently, widening local IDs does not remove a proven calculation
capability. Conformance must still prove exact case-sensitive reference
resolution and reject broken references after the clean cutover.

## Required semantics regardless of grammar

- A local ID is unique only in its containing entity collection and recipe.
- References compare the exact serialized string; display names are separate.
- A local ID is not a URI, UUID, registry key, taxonomy path, language tag, or
  globally resolvable identifier.
- Changing a local ID requires changing every reference in that document and
  changes canonical bytes.
- The grammar must exclude empty values and values that are unsafe or
  surprising in JSON, YAML, RFC 6901 diagnostics, and application mapping keys.
- Length and character bounds are resource/interoperability rules, not claims
  of universal identity.

## Accepted owner decision

Daniel accepted `^[a-z0-9][a-z0-9_-]*$` on 2026-08-11: lowercase ASCII
letters/digits plus hyphen and underscore, beginning with an alphanumeric
character. Equality is exact and case-sensitive; readers reject rather than
normalize uppercase. Lowercase UUID-shaped strings are admitted as ordinary
local IDs and gain no special semantics. Daniel also accepted a maximum length
of 128 characters. The cap preserves UUIDs (36 characters) and leaves ample
room for integrator-defined opaque IDs while bounding parser, map, and
diagnostic resource use.

## Alternatives considered

### Lowercase kebab token only

Example: `misturar-pos-autolise`.

This exactly fits the current corpus and is visually predictable, but it
imposes transliteration and a house style on integrators. No general identifier
standard requires this spelling.

### Broader portable unreserved-character token

Examples: `mix-dough`, `Mix_Dough`, `stage.2`, `starter~feed`.

Restrict characters to a standards-derived URI-unreserved ASCII set while
keeping the value recipe-local and non-URI. This permits integrator conventions
without whitespace, quoting, escaping, or Unicode-confusable problems. Case is
significant. The accepted maximum is 128 characters.

### Opaque non-empty Unicode string

Examples: `misturar massa`, `misturar-massa`, `混合`.

This maximizes integrator freedom but creates normalization, invisible-space,
confusable, copy/paste, and cross-language comparison requirements that the
protocol would need to specify. Treating it as "free-form" does not avoid a
contract; it makes the contract larger.

## Audit command

The evidence was produced with a recursive Ruby/YAML scan of repository-owned
examples and fixtures. The final conformance gate should replace this ad-hoc
audit with a checked field-register extractor and positive/negative vectors.

This audit supplies evidence for the accepted decision recorded normatively in
ADR-008 and SPEC-007.
