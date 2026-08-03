# The Recipe Calculus — normative specification v1

**Status:** NORMATIVE. This document and `calculus/vectors/` are part
of the RCP protocol surface, beside `schema/` and `registry/` — shape,
vocabulary, computation. Any implementation, in any language, is
conformant when it replays the complete vector set within the tolerances
of the Numeric discipline below; a disagreement between implementations
is an implementation bug unless this document changes. Reference
implementations exist in the RCP repository (informative, not part of
the protocol). Development provenance and traceability for this document
are maintained project-side, not here.

The Calculus is the one library of cook-time pure functions every surface
computes with. Purity is law: no IO, no clock, no randomness, no locale —
every function is a deterministic map from document values to values. Wall-clock anchoring, prep aggregation and presentation are
consumer concerns, never Calculus concerns.

Inputs are ADMITTED documents (L1-valid against core ∧ profile). The
Calculus does not re-validate shape; it MUST however treat any value
outside its stated domain as *unresolvable* (never as zero, never as a
guess) — uncertainty flows to `enforceConstraints`, where critical
severity refuses — the fail-closed principle: a safety bound that cannot
be verified behaves as violated.

## Identifiers

Every normative rule in this document carries a stable id, cited by
conformance vectors and implementation tests: **R-<FN>-n** for rules (per-function Edges and the shared models),
**N-n** for numeric-discipline rules, **WE-<FN>-n** for worked examples
(each becomes a verbatim table test citing its id). Ids are append-only:
a changed rule keeps its id with the change versioned; a removed rule's
id is never reused. Conformance vectors reference rule ids in a
`rules: []` field alongside `edge_classes`.

## Numeric discipline

- **N-1** — Internal arithmetic: IEEE-754 binary64 (float64/JS number).
- **N-2** — **Vector comparison tolerance:** numeric fields agree when
  `|a − b| ≤ 1e−9 × max(1, |a|, |b|)` (relative-absolute hybrid).
  Integer-valued fields (counts, indices) must match exactly.
- **N-3** — **Display rounding is a consumer concern.** Vectors and inter-function
  values are NEVER pre-rounded. Where this SPEC shows a rounded number in
  prose it is presentation, not semantics.
- **N-4** — Durations compute in **seconds** (integers where the source grammar
  allows only whole units; the `s|m|h|d|w` grammar admits decimals, so
  duration arithmetic is float64 seconds under the same tolerance).
- **N-5** — Division by zero, and any operation on an unresolvable operand, yields
  *unresolvable* — a first-class outcome, not NaN propagation.

## Scaling model (shared by several functions)

A **scale transformation** with factor `k > 0` maps quantities:

- **R-MODEL-1** — `{value, unit}` amounts: `value → value × k`, unless the amount carries
  `scaling: fixed`, in which case `value → value` (the **fixed-quantity
  asymmetry** — the one thing uniform scaling cannot keep safe).
- **R-MODEL-2** — `{ratio, of}` amounts: unchanged (`ratio` is dimensionless against a
  basis that itself scales — **ratio invariance**).
- **R-MODEL-3** — `{parts}` amounts: unchanged (ratio-first documents scale as a whole;
  parts have no mass semantics).
- **R-MODEL-4** — `to_consistency` and other sensory quantities: unchanged (they are
  tests, not numbers).
- **R-MODEL-5** — `k ≤ 0`, non-finite `k`: outside the domain — unresolvable.

## fn: scale

### Domain
An admitted document (root or component scope) and a factor `k` with
`0 < k < ∞`. Modes: **uniform** (every scalable quantity in the scope and
its inline components transforms by `k`) and **pivot** (`scaling.pivot`
names a declared basis; `k` is derived as `target ÷ resolveBases(pivot)`
then applied uniformly — pivot scaling is uniform scaling with a computed
factor).

### Units
Unit-preserving: scaling never converts units. `{value: 250, unit: g} ×2
= {value: 500, unit: g}`. Non-numeric quantities pass through unchanged.

### Edges
- **R-SCALE-1** — `scaling: fixed` quantities do not transform (asymmetry — see
  `enforceConstraints` for why this can refuse).
- **R-SCALE-2** — Maintenance components (`maintenance: true`) are **drawn from, not
  multiplied**: their internal quantities do not transform; the parent's
  *draw* of their output scales. `minBatchFloor` guards the draw.
- **R-SCALE-3** — Component references (`ref`) are boundary-crossing: the referenced
  document scales by the SAME factor composed with the reference's own
  quantity relationship (the referencing document owns *how much*; the
  referenced document owns *how*).
- **R-SCALE-4** — `k = 1` is the identity for every quantity, fixed or not.

### Worked example (WE-SCALE-1)
Chucrute-shaped scope: cabbage `{value: 1000, unit: g}`, salt
`{ratio: 0.02, of: veg}` where basis `veg` sums role `substrate`.
`scale(doc, 0.6)` → cabbage `600 g`; salt ratio **unchanged at 0.02**
(ratio invariance); resolved salt mass = `0.02 × 600 = 12 g`. Every
critical bound expressed as a ratio holds automatically — this is why
uniform scaling of fully-ratio documents is safe by construction.

## fn: resolveBases

### Domain
A document scope's `bases` map. Each basis `{sum: ingredients, where:
{roles: [...]}, include_components?}` resolves to a total quantity in a
single unit, or *unresolvable*.

### Units
A basis is resolvable only when every contributing amount is
gram-valued (`unit: g`). Mixed or non-mass contributions make the basis
unresolvable — never a partial sum (refusing beats under-counting).

### Edges
- **R-BASIS-1** — Role filter: an ingredient contributes when its `roles` intersect
  `where.roles`; an empty filter matches all ingredients.
- **R-BASIS-2** — **`include_components: true`:** the basis additionally
  includes matching ingredients of every INLINE component in the scope,
  recursively. Component REFERENCES (`ref`) contribute only when the
  referenced document is available to the computation with a resolvable
  same-named basis or matching ingredients; an unavailable reference
  makes the basis unresolvable — refusing beats under-counting.
- **R-BASIS-3** — `scaling: fixed` contributions: a basis total under a scale
  transformation sums TRANSFORMED amounts — fixed contributions do not
  scale, so the basis total is scale-dependent when any contributor is
  fixed (this is exactly what breaks fixed-quantity ratios).
- **R-BASIS-4** — Zero total (no contributors, or all zero): the basis resolves to 0;
  any ratio against it is *unresolvable* (division guard).

### Worked example (WE-BASIS-1)
Massa-folhada scope: farinha `{500 g, roles: [flour]}`; basis `flour`
sums role `flour`, no include_components → **500 g**. Água
`{ratio: 0.55, of: flour}` resolves to `275 g`; sal `{ratio: 0.02}` to
`10 g`.

## fn: selectGuardPath

### Domain
A document's `steps` (with `when` guards), its `options` (toggles and
choices), and a **selection** (a value per option; defaults apply where
the selection is silent).

### Units
None — pure step-set computation.

### Edges
- **R-GUARD-1** — A step is active when it has no `when`, or its `when` is satisfied by
  the selection (guard grammar per core `$defs/guard`).
- **R-GUARD-2** — Every selection MUST yield a connected, terminating DAG — admission
  (semantic validation) guarantees this for authored documents; the Calculus
  assumes it and MUST NOT re-verify (purity of concern), but an
  unsatisfiable selection (unknown option id, out-of-enum choice) is
  *unresolvable*, never an empty path.
- **R-GUARD-3** — Steps of inactive paths contribute nothing downstream (their produces
  never anchor).

### Worked example (WE-GUARD-1)
Options `[{id: autolise, kind: toggle, default: true}]`; steps s1
(no guard), s2 `{when: {option: autolise, is: true}}`, s3
`{when: {option: autolise, is: false}}`, s4 (no guard).
Selection `{}` (defaults) → active path **s1, s2, s4**. Selection
`{autolise: false}` → **s1, s3, s4**.

## fn: enforceConstraints

### Domain
An admitted scope, a scale transformation result, and the scope's
ingredient `constraints`. Produces refusals (critical) and advisories
(warn) — never mutations.

### Units
Ratio bounds (`min_ratio`/`max_ratio`) compare dimensionless resolved
ratios. Absolute bounds (`min_value`/`max_value`) compare in the
amount's own unit AFTER transformation.

### Edges
- **R-ENFORCE-1** — **Fail-closed:** an unresolvable resolved-value under
  a critical constraint REFUSES, carrying the kind of uncertainty and
  the authored reason. Warn severity surfaces an advisory instead.
  Uncertainty kinds (normative strings): `missing amount`,
  `ratio without basis`, `basis "<name>" unresolvable`,
  `no basis named`, `basis "<name>" not gram-resolvable`,
  `parts-based (ratio-first): no gram semantics`,
  `quantity form not resolvable`.
- **R-ENFORCE-2** — Resolved ratio of a `{ratio, of}` amount is the ratio itself
  (invariant). Of a gram amount vs a gram basis:
  `(value × fixedAwareFactor) ÷ (basisTotal under the same transform)`.
- **R-ENFORCE-3** — Absolute bounds move with scale: `min_value`/`max_value` compare the
  TRANSFORMED amount (fixed quantities transform by 1).
- **R-ENFORCE-4** — **Authored reasons are opaque pt/en strings** — passed through
  verbatim, never generated, never translated by the Calculus.
- **R-ENFORCE-5** — Severity routing: only `critical` refuses; `warn` advises;
  absent severity defaults to warn (advisory).

### Worked example (WE-ENFORCE-1)
Fixed-salt chucrute: cabbage `1000 g` (scalable), salt
`{value: 20, unit: g, scaling: fixed}` with critical
`{min_ratio: 0.018, of: veg}` (authored reason attached).
`scale ×2`: cabbage → `2000 g`; salt stays `20 g`; resolved ratio
`20 ÷ 2000 = 0.010 < 0.018` → **REFUSED**, message carrying the authored
pt/en reason. At `k = 1`: `20 ÷ 1000 = 0.020` — within bounds, accepted.
(The fixed-quantity asymmetry is the canonical refusal.)

## fn: minBatchFloor

### Domain
Component scopes with `maintenance: true` and a `min_batch` quantity,
under a scale factor `k`.

### Units
`min_batch`'s own unit (grams in practice).

### Edges
- **R-MINBATCH-1** — Maintenance cultures are drawn from, not multiplied (see `scale`).
- **R-MINBATCH-2** — **The floor guards the draw:** `k < 1` implies a draw below the
  minimum viable batch → REFUSE (you cannot build 3 g of levain).
  `k ≥ 1` never violates the floor (the culture is not multiplied; a
  larger draw is bounded by the culture's actual batch, an execution
  concern outside the Calculus).
- **R-MINBATCH-3** — Non-maintenance `min_batch` components: the floor compares the
  component's scaled output against `min_batch` directly.

### Worked example (WE-MINBATCH-1)
Massa-mãe `maintenance: true, min_batch: {value: 100, unit: g}`;
`scale(doc, 0.05)` → implied draw `5 g < 100 g` → **REFUSED** with the
min_batch floor message. `scale(doc, 3)` → no floor violation.

## fn: fixedQuantityTransform

### Domain
Any quantity under a scale transformation (the asymmetry rule factored
as its own function so both implementations share one definition).

### Units
Preserving.

### Edges
`scaling: fixed` → factor 1; otherwise → factor k. This function is
TOTAL (every quantity form has a defined outcome: numeric transforms,
non-numeric passes through). It exists so `scale`, `resolveBases` and
`enforceConstraints` provably share one asymmetry rule.

### Worked example (WE-FIXED-1)
`{value: 20, unit: g, scaling: fixed}` under k=2 → `20 g`.
`{value: 1000, unit: g}` under k=2 → `2000 g`.
`{ratio: 0.02, of: veg}` under any k → unchanged.

## fn: reestimateDurations

### Domain
Step `duration` windows under a scale factor. v1 posture: durations DO
NOT scale — cook time is dominated by geometry and thermodynamics, not
mass; doubling a cake does not double its bake time.

### Units
Seconds internally; the document's duration grammar externally.

### Edges
- **R-DUR-1** — **R-FIXED-1** — v1: identity on every window; the function exists as the NAMED
  extension point so a future geometry-aware model changes this SPEC,
  not call sites.
- **R-DUR-2** — **R-FIXED-2** — Windows never invert (min ≤ target ≤ max holds by admission; identity
  preserves it).

### Worked example (WE-DUR-1)
`{min: 25m, target: 30m, max: 35m}` under k=2 → unchanged
`{min: 25m, target: 30m, max: 35m}` (advisory territory: the renderer
may flag that scaled geometry can shift bake behaviour — presentation,
not Calculus).

## fn: readingOrder

### Domain
An admitted document: its inline components and its method (steps).

### Units
None.

### Edges
- **R-ORDER-1** — Mise-en-place projection (DECISIONS #26 glossary; the v0.2 viewer's
  order, now specified): every inline component's method precedes the
  parent method that consumes it.
- **R-ORDER-2** — Component order among themselves: dependency order when one component
  `uses` another's output; declaration order otherwise (stable).
- **R-ORDER-3** — Component references (`ref`) contribute a placeholder position (their
  method lives in the referenced document).

### Worked example (WE-ORDER-1)
Torta: components [ganache-cobertura, calda-cafe], parent steps s1–s5
with s5 `uses: [ganache-cobertura, calda-cafe]` →
**ganache-cobertura, calda-cafe, then s1…s5**.

## fn: interleave

### Domain
The active step set (post-`selectGuardPath`) across a document and its
inline components, with each step's optional `track`.

### Units
None.

### Edges
- **R-INTERLEAVE-1** — Steps without `track` inherit their scope's implicit track (one per
  component, one for the parent).
- **R-INTERLEAVE-2** — Output: a topological order of ALL active steps respecting `after`
  and produced-intermediate anchoring, annotated with track lanes —
  steps on different tracks with no dependency path between them are
  concurrent ("meanwhile" pairs).
- **R-INTERLEAVE-3** — Determinism: ties break by (track declaration order, then step
  declaration order) — the same document always interleaves
  identically.

### Worked example (WE-INTERLEAVE-1)
Tracks A: a1→a2, B: b1→b2, with a2 `after: [b1]` →
order `a1, b1, {a2 ∥ b2}` where a2/b2 are concurrent; rendered as
"meanwhile" in consumers.

## fn: schedule

### Domain
An admitted document with durations on its steps/components. Produces
`[{item, start_offset: Window, duration: Window}]` — offsets from t0
(never wall-clock; anchoring is a presentation transform).

### Units
Seconds internally (window fields are duration windows).

### Edges
- **R-SCHED-1** — **Window arithmetic:** `target` propagates by scalar arithmetic
  (start = max over predecessors of (their start.target + their
  duration.target)). `min`/`max` propagate as CONSERVATIVE interval
  bounds: earliest possible start = max over predecessors of
  (start.min + duration.min); latest = max of (start.max +
  duration.max). Missing `min`/`max` on a source window inherit its
  `target` (a point window). A step with NO duration contributes zero
  time (point event) — its window is `{0,0,0}` for propagation.
- **R-SCHED-2** — Prerequisite placement: a component consumed by step S starts early
  enough that its own schedule completes by S's start — component
  start_offset = S.start − component total duration (window-wise, same
  conservative rule). Offsets MAY therefore be negative relative to the
  parent method's t0; consumers render "the day before" from exactly
  this.
- **R-SCHED-3** — Cycles cannot occur (admitted documents are DAG-checked at L2).
- **R-SCHED-4** — Steps excluded by guard selection do not appear.

### Worked example: window-propagation (WE-SCHED-1)
s1 duration `{min: 10m, target: 12m, max: 15m}`; s2 after s1, duration
`{target: 30m}` (point window 30/30/30). s2.start = `{min: 600s,
target: 720s, max: 900s}`; s2 end = `{min: 2400s, target: 2520s,
max: 2700s}`.

### Worked example: prerequisite-placement (WE-SCHED-2)
Torta: s5 (assemble) start.target computed from s1–s4 = say `T`. Calda
total duration `{target: 20m}` → calda start_offset.target = `T − 1200s`
(before the parent's later steps — and if a component outlasts the lead
time, its offset goes negative: start the day before; the entremet
fixture exercises multi-day negatives across tracks).

## Edge-class enumeration

Coverage tooling parses this block; every class MUST have conformance
vectors.

```rcp-edge-classes
class: unit-boundaries
class: guard-combinations
class: fixed-quantity-refusals
class: min-batch
class: ratio-invariance
class: timeline-arithmetic
```

- `unit-boundaries`: mixed/non-gram bases, zero totals, unit
  preservation under scale.
- `guard-combinations`: toggle/choice selections, defaults,
  unsatisfiable selections.
- `fixed-quantity-refusals`: the asymmetry — fixed amounts under scale
  breaking ratio and absolute bounds; authored-reason passthrough.
- `min-batch`: maintenance draws below the floor; k ≥ 1 non-violation.
- `ratio-invariance`: uniform scaling of ratio/parts documents leaving
  every resolved ratio unchanged.
- `timeline-arithmetic`: window propagation, point windows,
  prerequisite placement incl. negative offsets, track concurrency.

---

*Changing ANY semantics in this document requires regenerating
`calculus/vectors/` in the same change, and is a versioned protocol
change per `schema/VERSIONING.md`: additive first, breaking never
silent.*
