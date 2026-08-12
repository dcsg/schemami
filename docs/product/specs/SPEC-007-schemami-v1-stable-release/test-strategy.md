# SPEC-007 test strategy

## Principle

Conformance proves public behavior, not internal implementation similarity.
Every normative operation/refusal replays the shared Calculus JSON corpus, and
document admission plus dogfood regressions replay the shared validation JSON
corpus in Go and TypeScript. No broad passing suite substitutes for the named
release gates below.

## Evidence matrix

| Surface | Positive proof | Negative/adversarial proof |
|---|---|---|
| Wire identity | `schemami: "1"`, immutable schema ID, owner extension round-trip | numeric marker, unknown model, RCP marker, active `x-rcp-*`, extension alters logic |
| Serialisation | JSON/YAML parse to equal I-JSON and equal JCS bytes | duplicate keys, non-string YAML key, non-finite number, invalid Unicode, unregistered media claim |
| Language/origin/prose | `pt-PT`, `en-GB`, source-language strings; `PT`/`PT-11`/`Mafra` origin | absent/malformed language, locale map, country used as language, subdivision-country mismatch, extension-only origin |
| Local identity | unknown ingredient/technique/equipment validates and renders; lowercase kebab/snake/UUID/128-character local IDs resolve exactly; step works from local `id`, `instruction`, ordered unique `techniques`, and explicit structured fields | uppercase/dot/space/tilde/non-ASCII/129-character ID, silent normalization, duplicate local ID, broken local reference, UUID-specific behavior, singular/sorted/duplicate technique references, app mapping embedded canonically, mandatory primitive/action reference, primitive params, prose activating logic |
| Method hierarchy | recursive `sequence` preserves sections, steps, actions, authored order, dependencies, and explicitly authored techniques | mixed/unknown nodes, empty actions, instruction plus actions, action-owned dependency/duration, recursion/resource exhaustion, app workflow `stepType` promoted to technique |
| Variation | `resolve_selection`; instance-scoped choice/toggle/measured bindings; exact threshold boundary/interval regions; equivalent-graph deduplication; optional content and strict substitutions remain same recipe | duplicate/unknown nested path, missing/invalid consequential binding, arbitrary operator, implicit app default, dormant invalid branch/cycle, active step with no action, active reference to inactive content, excessive distinct graphs |
| Completion/guidance/environment | observation, measurement, `all`/`any`, stage/action names, human cue/response guidance, authored cold/ambient fermentation, location, and target temperature survive | guidance parsed as activation, completion treated as duration, sensor truth claimed, app workflow labels or fermentation heuristics made canonical |
| Composition/lineage | single-assignment resources; exact child output and compatible yield scale offline; nested/sibling instances; composed reading/schedule placement; one JSON bundle contains closure; derived recipe is complete with lineage | zero/multiple producer, network/name lookup, missing/mismatched digest/output/yield, incompatible/range/open/density conversion, component cycle, incomplete bundle, lineage patch, source mutation |
| Cross-product adapter parity | Pão and Fornada consume the same committed candidate and shared vectors; portable facts survive each adapter; protocol validity agrees while app projection may independently refuse | adapter validates different bytes, leaks product policy into canonical content, silently drops valid unfamiliar content, or conflates protocol validity with app projectability |
| Quantity/formula | measured/range/open plus multiple typed formula groups; optional terms retain authored amounts without redistribution; authored/selected/scaled totals; factor XOR root formula target; repeating exact factor; 16-total-digit decimals | both/neither scale authorities, inactive percentage basis, zero/unresolved/incompatible target, fixed-anchor retarget, singular legacy formula, duplicate formula/input authority, recursive guide, invalid basis, decimal-ratio multiplier, JSON number, non-canonical/17-digit decimal, residual rounding assignment |
| Unit conversion | exact unity, mass, volume, regional, and C/F vectors at the accepted numeric bounds | unity-to-mass/volume, bare/unknown unit, cross-dimension, g/mL, unsupported kind, 17-digit decimal |
| Duration | `PT8M`, `PT1H10M`, `P2D`, `P1W`; minimum/target/maximum scheduling parity | compact `8m`/`1h10m`, negative, year/month, min/max aliases, inconsistent window |
| Evidence | valid non-empty source, RFC 6901 target, and standard-backed W3C video fragments with raw disagreement | empty URI, broken pointer/source, duplicate ID, malformed/inverted media interval, selector timing used as culinary duration or calculation input |
| Diagnostics | stable operation/status/type/request-pointer; independent blocker aggregation, cascade suppression, deduplication, ordering; JCS recipe/bundle evaluation identity | human prose parsed, HTTP status conflation, unstable/synonymous problem URI, submitted whitespace/key order changes digest, method-only operation requires formula binding |
| Bundle/resolution | two explicit collections with colliding recipe IDs remain scoped; all-branch exact closure and instance paths survive | global search fallback, missing pin, duplicate path, manifest/document conflict hidden, unrelated extra document |
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
must refuse a 17-digit decimal before allocating unbounded work. ADR-016 pins a
minimum logical capacity of 64 recursive levels, 10,000 evaluated semantic
object/reference occurrences, 1,024 embedded documents, and 1,024 selected
component instances. ADR-017 separately pins the reference SDK profile to
10,000 request-scoped canonical residual analysis states. Boundary vectors must
prove that partial states do not consume semantic occurrences, bundle documents
share one analysis counter, a 14+14 vector-equality expression refuses at the
default analysis ceiling, and the same document proceeds when that ceiling is
raised. Evaluation is iterative/stack-safe and cycle-safe; exhaustion returns
explicit `resource-limit`, never silent truncation.

## Field-name and schema review

The final field register is generated/reviewed from every public schema and
operation result, then joined against the accepted register. The gate fails on
an unregistered path, alias, same-scope semantic collision, undocumented default,
or standard-backed value without its pinned authority/version.

ADR-015 closes the structured-method wire and ADR-016 closes every operation
request/result/refusal. The Phase 9 gate joins schemas and implementations
against both accepted artifacts and fails any unregistered alias, field,
operation token, result member, problem type, ordering rule, or resource count.

## Phase 8 mandatory vector groups

- dormant broken branch/reference/cycle and mutually exclusive valid producers;
- choice/toggle combinations plus measurement threshold points/open regions;
- equivalent active-graph deduplication and deterministic resource refusal;
- root/nested selection paths, defaults, duplicate paths, and dependency-
  sensitive missing bindings;
- optional ratio/percentage terms with authored and selected totals and no
  redistribution;
- factor XOR formula target, exact 400/300 scaling, other-formula scaling,
  independent half-even totals/lines, and no residual assignment;
- exact UCUM component yield, nested and sibling reuse, missing/mismatched child
  facts, and component cycles;
- composed reading/schedule placement, common zero shift, and explicit
  `not-consumed` component reporting;
- relative-timing self/inactive anchor, cycle, and direct conflict while proving
  it never alters earliest-start offsets;
- multi-problem cascade suppression, deduplication, ASCII pointer/type order;
  and
- evaluation recipe/bundle digests over admitted JCS, independent of submitted
  JSON spelling.

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
