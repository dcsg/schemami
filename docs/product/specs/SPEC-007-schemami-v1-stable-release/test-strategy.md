# SPEC-007 test strategy

## Principle

Conformance proves public behavior, not internal implementation similarity.
Every normative operation and refusal replays one shared JSON corpus in Go and
TypeScript. Schema-only rules have positive and nearest-negative fixtures; no
broad passing suite substitutes for the named release gates below.

## Evidence matrix

| Surface | Positive proof | Negative/adversarial proof |
|---|---|---|
| Wire identity | `schemami: "1"`, immutable schema ID, owner extension round-trip | numeric marker, unknown model, RCP marker, active `x-rcp-*`, extension alters logic |
| Serialisation | JSON/YAML parse to equal I-JSON and equal JCS bytes | duplicate keys, non-string YAML key, non-finite number, invalid Unicode, unregistered media claim |
| Language/prose | `pt-PT`, `en-GB`, source-language strings | absent/malformed language, locale map, country used as language |
| Local identity | unknown ingredient/technique/equipment validates and renders; lowercase kebab/snake/UUID/128-character local IDs resolve exactly; step works from local `id`, `instruction`, and explicit structured fields | uppercase/dot/space/tilde/non-ASCII/129-character ID, silent normalization, duplicate local ID, broken local reference, UUID-specific behavior, app mapping embedded canonically, mandatory primitive/action reference, primitive params, prose activating logic |
| Quantity/formula | measured/range/open plus `1:2:2`, `1:15`, 75%, 1.8%, and 16-total-digit canonical decimals | missing/unknown kind, mixed members, decimal-ratio multiplier, percentage normalization, JSON number, non-canonical decimal, 17-digit decimal |
| Unit conversion | exact mass, volume, regional, and C/F vectors at the accepted numeric bounds | bare/unknown unit, cross-dimension, g/mL, unsupported kind, 17-digit decimal |
| Duration | `PT8M`, `PT1H10M`, `P2D`, `P1W`; minimum/target/maximum scheduling parity | compact `8m`/`1h10m`, negative, year/month, min/max aliases, inconsistent window |
| Evidence | valid source and RFC 6901 target with raw disagreement | broken pointer/source, duplicate ID, evidence used as calculation input |
| Diagnostics | stable operation/status/type/pointer in both languages | human prose parsed, HTTP status conflation, unstable problem URI |
| Pack/resolution | two explicit collections with colliding recipe IDs remain scoped | global search fallback, missing pin, manifest/document conflict hidden |
| Cutover | clean Schemami read/write | RCP accepted, aliased, migrated, or emitted |

## Deterministic decimal arithmetic

The corpus includes zero, negative temperature, non-integer decimal, very large
allowed value, fifth-digit-below/above/tie cases, and repeating affine
conversion cases. Implementers may use arbitrary-precision rationals or decimal
arithmetic internally. Public results are canonical decimal strings with at
most 16 total digits (excluding decimal point and permitted minus sign) and
four fractional digits. Result comparison is byte-for-byte; no tolerance or
rational-object output is accepted.

The shared corpus MUST include exact round-half-to-even boundaries in both
directions, including `1.23445` → `1.2344` and `1.23455` → `1.2346`, plus
values immediately below and above each midpoint. Implementations may not use
binary floating-point tolerance to classify a tie.

The 16-digit decimal cap is a normative operation input. Both implementations
must refuse a 17-digit decimal before allocating unbounded work. Other resource
limits, if any, require their own explicit accepted bounds before vectors land.

## Field-name and schema review

The final field register is generated/reviewed from every public schema and
operation result, then joined against the accepted register. The gate fails on
an unregistered path, alias, same-scope semantic collision, undocumented default,
or standard-backed value without its pinned authority/version.

## Clean-cutover audit

The cutover check classifies every remaining `RCP`, `rcp`, `.rcp.*`,
`x-rcp-*`, `rcp.invalid`, package/module name, and generated artifact. Only
historical documentation and named unsupported-legacy fixtures are allowlisted.
An empty search alone is insufficient: the allowlist and active-surface inventory
must reconcile to the candidate tree.

## Release proof

The release DAG runs from a fresh clone at the candidate commit, provisions its
pinned toolchain, validates every schema/example, replays all shared vectors,
builds/tests the viewer, checks generated artifacts, verifies immutable HTTPS
normative URLs, and reproduces the release manifest. It does not read a Pão de
Portugal checkout or any user-owned dirty overlay.
