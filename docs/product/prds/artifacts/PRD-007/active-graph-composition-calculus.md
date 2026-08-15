---
title: "Schemami v1 active-graph and composition Calculus contract"
date: 2026-08-11
status: accepted
implements: [FR-VARIATION-001, FR-COMPOSITION-001, FR-CALC-006]
---

# Schemami v1 active-graph and composition Calculus contract

This is the accepted Phase 8 operation and test-design authority under
ADR-016. It closes the behavior intentionally left open by ADR-014 and
ADR-015. Schema, Go, TypeScript, viewer, and corpus implementation begins only
in Phase 9.

## Public operation set

Schemami v1 has exactly six public Recipe Calculus operations:

1. `resolve_selection`
2. `resolve_formula`
3. `scale`
4. `convert_quantity`
5. `reading_order`
6. `schedule`

`resolve_selection` is the only added operation. It returns a deterministic
selection report and active identifiers; it never returns a rewritten recipe.
No operation returns content that carries the `schemami` marker, title, method,
or other fields that could masquerade as a newly publishable recipe.

## Closed operation requests

Every recipe operation request contains exactly one of `recipe` or `bundle`
and a closed `arguments` object. A bundle request evaluates its exact root.
Standalone `convert_quantity` instead contains only its closed `arguments`
because it has no recipe identity or selection context.

```json
{
  "bundle": {},
  "arguments": {
    "selections": [
      {
        "component_path": [],
        "bindings": {
          "fermentation-mode": "cold",
          "include-seeds": true
        },
        "alternatives": {
          "salt": "fine-sea-salt"
        }
      },
      {
        "component_path": ["levain"],
        "bindings": {
          "feed-mode": "one-two-two"
        }
      }
    ]
  }
}
```

The empty `bundle` above is only an abbreviation that keeps the request-shape
example focused on selections. A valid request contains the complete bundle
defined by ADR-015; every conformance fixture uses complete admitted bytes.

`component_path` is an ordered array of component IDs, never recipe IDs and
never an RFC 6901 pointer. Empty path identifies the root. Each following ID
selects one component declaration in its parent recipe, so two references to
the same child document remain distinct instances. Duplicate paths refuse.

`bindings` is an object keyed by parameter ID. Choice values are option-ID
strings, toggle values are booleans, and measurement values are scalar measured
quantities. `alternatives` is an object keyed by ingredient ID whose value is
an option ID from that ingredient's strict alternatives. Dynamic maps occur
only in operation arguments; ordered result summaries use arrays.

A supplied component path is resolved structurally through the exact bundle,
including when its branch is inactive. Its supplied values must still be valid,
but an inactive instance contributes no effective selection or result. Unknown
paths, parameters, ingredients, options, wrong value kinds, incompatible
measurement units, and duplicate paths refuse rather than being ignored.

Problem pointers address the complete request object. Examples include
`/arguments/factor`, `/recipe/ingredients/0/quantity`, and
`/bundle/documents/1/document/outputs/0/yield`.

## Effective selection

An explicitly supplied binding overrides an authored default. An authored
default applies only when the request omits that value. Array position, an
application default, display state, and an ingredient alternative's first
option never select implicitly.

Missing values are operation-dependent:

- `resolve_selection` requires every value that affects the complete active
  report and every strict alternative needed for the selected cooking view;
- `scale` requires only values that can change active quantity inputs or
  component instances;
- `resolve_formula` requires only values that can change that formula's active
  inputs or its component resolution;
- `reading_order` and `schedule` require only values that can change their
  active method/composition graph; and
- a method-only parameter never blocks formula scaling, while a formula-only
  parameter never blocks method scheduling.

A missing consequential value refuses with `missing-binding`. An invalid
supplied value refuses with `invalid-binding`.

Every successful recipe or bundle operation carries non-publishable evaluation
metadata:

```json
{
  "evaluation": {
    "recipe": {
      "collection": "paodeportugal",
      "id": "pao-de-massa-mae",
      "revision": 2,
      "sha256": "3333333333333333333333333333333333333333333333333333333333333333"
    },
    "bundle_sha256": "4444444444444444444444444444444444444444444444444444444444444444",
    "selections": [
      {
        "component_path": [],
        "bindings": [
          {
            "parameter": "fermentation-mode",
            "value": "cold",
            "source": "argument"
          }
        ],
        "alternatives": [
          {
            "ingredient": "salt",
            "option": "fine-sea-salt",
            "source": "argument"
          }
        ]
      }
    ]
  }
}
```

`evaluation.recipe.sha256` is SHA-256 over the admitted recipe's RFC 8785 JCS
representation. Optional `bundle_sha256` is present only for bundle input and
is computed over the admitted bundle's JCS representation. Submitted
whitespace, object-key order, and YAML spelling cannot change either value.
Selections are ordered by component instance preorder; bindings follow
parameter declaration order and alternatives follow ingredient declaration
order. `source` is `argument` or `default`.

Standalone `convert_quantity` carries no invented `evaluation` metadata.
Refused and `not_applicable` envelopes retain the ADR-011 shapes and do not
carry a success result.

## Active graph projection

Selection starts at the root and applies these rules in order:

1. An inactive section removes its complete descendant subtree.
2. An inactive step and all its actions disappear.
3. An active action-list step keeps only active actions and must retain at least
   one.
4. Inactive ingredients, components, and equipment disappear.
5. `after` edges whose source or target step is inactive disappear.
6. Step resource flow is authoritative. Action `uses` and `produces`, when
   present, remain subset attribution only.
7. An active step/action reference to an inactive ingredient, component, or
   equipment refuses with `inactive-reference`.
8. Resource flow never creates or repairs an `after` edge.

`resolve_selection.result.active_instances` is ordered component-instance
preorder. Each entry contains exact `component_path`, exact recipe reference,
ordered active ingredient/component/equipment IDs, ordered method nodes as
`{kind,id}`, and action entries as `{step, actions}`. It contains identifiers,
not copied canonical objects.

Preparations and outputs are single-assignment resources in each selected
graph. Every preparation/output has at most one active producer, and every one
consumed by an active step has exactly one. Multiple producers refuse with
`multiple-producers`; a consumed resource without a producer refuses with
`missing-producer`. An unused resource may have no producer.

## Admission across all reachable graphs

Admission validates all declared content, including inactive content. It then
evaluates every distinct reachable active graph induced by the closed
predicates:

- each choice option is a distinct candidate value;
- a toggle contributes `false` and `true`;
- measurement predicates partition exact values at every authored threshold
  into boundary points and the open regions between them;
- threshold normalization and comparison use exact rational UCUM conversion;
- Cartesian combinations across relevant parameters are explored or analyzed
  symbolically; and
- equivalent active graphs are deduplicated before graph invariants run.

Admission does not enumerate infinitely many measurement values. Within one
threshold region the predicate truth vector is constant. Deduplication uses the
complete active semantic graph: instance-scoped active entities/actions,
dependency edges, resource references/producers, and applicable formula terms.

Every reachable graph must satisfy action, reference, dependency-cycle,
relative-timing, producer, and component-cycle invariants. A dormant broken
branch therefore cannot be admitted. If exhaustive distinct-graph analysis
exceeds the accepted security budget, admission refuses with `resource-limit`;
it never silently skips combinations.

## Formula selection and optional terms

`resolve_formula.arguments.formula_id` is required and selects exactly one root
formula. Formula array position never selects implicitly.

Formula evaluation first computes every authored term exactly from the authored
anchor and then removes results whose typed inputs are inactive. It never
redistributes an inactive term's share:

- a ratio `1:2:1` with target 400 g computes 100 g, 200 g, and 100 g;
- if the last input is inactive, selected quantities remain 100 g and 200 g;
- the authored total remains 400 g and the selected total becomes 300 g; and
- if the author requires the selected formula to remain 400 g, the author must
  declare another formula/branch or the caller must explicitly scale the
  selected view.

The same filtering rule applies to percentages: active term quantities never
change merely because another term becomes inactive. A percentage formula with
an inactive basis and any other active term refuses with `inactive-reference`.
A formula with no active terms is `not_applicable` for direct resolution and is
ignored by whole-recipe scale.

Operations that actually evaluate formulas may return ordered
`formula_evaluations`; method-only operations omit it. Each entry contains
`component_path`, `formula_id`, `authored_total`, `selected_total`, and, for
`scale`, `scaled_total`. Root path is empty. Root formula evaluations precede
component-instance preorder; formula declaration order breaks ties.

Totals are positive scalar measured quantities computed from unquantized exact
term values. Public totals and line quantities are independently quantized
round-half-to-even. Public line quantities may therefore not sum byte-for-byte
to the independently quantized total. Schemami v1 never redistributes a
rounding residual to an ingredient.

`resolve_formula.result.quantities` follows selected term order and each entry
uses typed `input` plus measured `quantity`.

## Scale arguments and results

`scale.arguments` requires exactly one of:

```json
{"factor": "2"}
```

or:

```json
{
  "formula_target": {
    "formula_id": "dough",
    "quantity": {
      "kind": "measured",
      "value": "400",
      "unit": "g"
    }
  }
}
```

`formula_target.formula_id` identifies a root formula. After selection that
formula must be active, applicable, scalar measured, linearly scalable, and
have a positive non-zero selected total. The requested quantity must be
positive measured and dimension-compatible. Compatible units are converted
using the pinned exact UCUM 2.2 profile. Range, open, ambiguous, unknown,
cross-dimension, density-dependent, and mass-volume targets refuse.

The formula-target factor is the exact rational target divided by the exact
unquantized selected total. The factor is never rounded or emitted as a
downstream calculation input. It applies once to every active root input and
composes once into each active component instance. A fixed target/basis anchor
cannot be changed by `formula_target`; a different target refuses. Other active
formulas and explicit linear quantities receive the same factor, while fixed
quantities remain fixed under their accepted rule.

The targeted formula's exact computational `scaled_total` equals the converted
requested target. Other formula evaluations report totals under the same
factor. No rounded factor or rounded intermediate result is ever reused.

`scale.result.quantities` is ordered as active root ingredients in declaration
order followed by active root components in declaration order. Each entry has
typed `input` and effective `quantity`. `component_instances` follows depth-
first parent component declaration order. Each entry carries `component_path`,
the exact child recipe reference, selected `output`, required effective
`quantity`, and that instance's ordered calculated quantities. It never embeds
a rewritten child recipe.

If the selected recipe has no active quantity-bearing input, `scale` is
`not_applicable`. Any active input lacking quantity authority refuses with
`missing-fact`.

## Component scaling

For each active component instance:

1. Resolve its effective required amount from exactly one parent authority:
   explicit quantity or one active formula term.
2. Load the exact child document from the request bundle and verify collection,
   ID, revision, and JCS digest.
3. Resolve the selected child output and its positive scalar measured `yield`.
4. Convert the required amount to the yield unit through exact compatible UCUM
   conversion.
5. Divide required amount by unquantized yield to obtain the exact child factor.
6. Apply that factor once to the selected child inputs and recurse through
   active child components.

Range/open amounts, absent/non-positive yield, incompatible dimensions,
density conversion, missing bytes, digest/output mismatch, and component cycles
refuse without partial success. Reusing the same child document in sibling
component paths is valid; revisiting an ancestor document through its
descendant closure is a component cycle.

## Reading order

`reading_order` topologically orders selected active steps. Recursive authored
step order supplies the stable tie break; sections and actions do not become
step results. A composed bundle includes a used component's active child steps
before the parent consumer because the exact selected child output and explicit
parent `uses` relation establish that placement. This derived composition
placement does not create a canonical `after` edge.

Each `reading_order.result.steps` entry contains `component_path` and `id`.
An active component with no parent step that explicitly uses it is excluded and
reported in `unplaced_components` with closed reason `not-consumed`. An empty
root method refuses with `missing-fact` at its method sequence.

## Schedule

`schedule` retains ADR-011's earliest-start behavior over selected explicit
`after` edges. It adds exact component placement only when all three facts are
present:

1. a child step explicitly produces the component's selected output;
2. a parent step explicitly uses that component; and
3. both recipes and selections resolve from the request.

The child output producer's end aligns with the earliest parent consumer's
start. Ties use composed reading order. Nested component placement recurses.
After placement, every offset is shifted by one common exact amount so the
earliest scheduled step begins at `PT0S`; no signed public duration is needed.
Child steps after the selected output producer remain scheduled because they
are authored active work.

Each `schedule.result.steps` entry contains `component_path`, `id`, `start`,
`duration`, and `end`. An active component with no explicit parent consumer is
not placed and appears in `unscheduled_components` with reason `not-consumed`.
This is successful but explicitly incomplete composition information, not a
top-level problem or silent omission.

Missing duration/target, missing or multiple active output producer, unresolved
child bytes, or other required composition fact refuses the schedule. Formula-
only bindings never become schedule prerequisites.

`relative_timing` is preserved and validated but is not a v1 `schedule` input.
Calendar wording such as “Na véspera” remains application presentation.
Self-anchors, inactive anchors for active timed nodes, relative-timing cycles,
and a direct `before` contradiction with an explicit `after` relation refuse or
reject as appropriate. Section timing never inherits into descendant steps.
Real future schedule lag requires a separately accepted explicit lag contract;
it is never inferred from section names or editorial prose.

## Diagnostics

The Phase 8 problem additions are:

- `https://schemami.dev/problems/missing-binding`
- `https://schemami.dev/problems/invalid-binding`
- `https://schemami.dev/problems/inactive-reference`
- `https://schemami.dev/problems/missing-producer`
- `https://schemami.dev/problems/multiple-producers`
- `https://schemami.dev/problems/dependency-cycle`
- `https://schemami.dev/problems/component-cycle`
- `https://schemami.dev/problems/relative-timing-conflict`

The existing `resource-limit`, `unresolved-reference`, `missing-fact`,
`dimension-mismatch`, `unsupported-quantity-kind`, and
`invalid-operation-arguments` identities remain. No synonymous
`resource-limit-exceeded` identity is introduced.

An operation returns every independent blocker it can establish without using
missing/invalid prerequisite facts. Causal descendants are suppressed,
identical `(type,pointer)` pairs are deduplicated, and remaining problems sort
by ascending ASCII pointer and then type URI. Success has no problems; schedule
placement notices live only in the closed result fields described above.

HTTP status, RFC 9457 serialization, authentication, rate limiting, body-size
limits, and localized messages are integration/deployment concerns.

## Resource capacity and analysis safety

A conforming implementation must not refuse solely because one of these
logical capacity counters is at or below its floor:

- 64 recursive levels;
- 10,000 evaluated protocol semantic object/reference occurrences across
  admission and the operation;
- 1,024 embedded bundle documents; and
- 1,024 selected component instances in one operation.

A recursive level is one edge through recursive method `sequence`, activation
`condition`/`conditions`, or completion `conditions`; each family is measured
from its own root. A semantic object/reference occurrence is one JSON object
admitted as a registered protocol shape, including each typed local or recipe
reference once. It counts once during static admission and once for each
deduplicated reachable active graph in which it participates; arrays and scalar
members do not count separately. A symbolic implementation charges the same
logical occurrences as enumeration, so algorithm choice cannot change the
portable floor. Embedded documents count `bundle.documents` entries. A
selected component instance is one distinct `component_path` reached during
the operation, including siblings that pin the same recipe.

Partial symbolic/solver states do not consume semantic occurrences. They use a
separate positive `analysisStates` safety budget under ADR-017. A canonical
analysis state is the next authored parameter index plus the simplified
residual vector of all normative activations. The counter is shared across one
request, including every embedded document or operation stage that performs
activation analysis, and equivalent states count once. The Schemami v1
reference SDK profile defaults to 10,000 analysis states.

Implementations may support more logical capacity or analysis states. Exceeding
either an applicable logical floor or the declared analysis-state ceiling may
return `resource-limit`; that outcome is not a claim that the document is
intrinsically invalid. Analysis-state exhaustion may occur even when completed
graphs remain below the semantic floor. Evaluation must be iterative or
otherwise stack-safe, cycle-safe, exact, and bounded. Deployment request-size
and abuse protections do not become recipe semantics.

## Identity and lineage

Selection, formula resolution, scaling, reading order, and scheduling are
derived evaluations. They do not change canonical recipe/bundle bytes,
`(collection,id,revision)`, JCS digest, or lineage. Persisting a change outside
the source-authored parameter/alternative space requires a complete new recipe
with non-executable lineage under ADR-014.

## Mandatory Phase 9/10 vectors

The shared Go/TypeScript corpora must cover at least:

- dormant malformed references and dormant dependency cycles;
- exact measurement threshold boundary points and adjacent regions;
- equivalent-graph deduplication and deterministic resource-limit refusal;
- duplicate/unknown/nested component selection paths;
- dependency-sensitive missing bindings and authored defaults;
- active action-list steps reduced to zero actions;
- active reference to inactive content;
- zero, missing, and multiple producers plus mutually exclusive valid producers;
- optional ratio/percentage terms without redistribution;
- authored versus selected formula totals and independent quantization;
- factor XOR formula target, repeating exact factors, fixed-anchor refusal,
  incompatible target, and other-formula scaling;
- component compatible-unit yield scaling, nested/sibling reuse, missing yield,
  missing bytes, digest mismatch, and component cycle;
- composed reading/schedule order, earliest consumer placement, common zero
  shift, and explicit unplaced/unscheduled components;
- relative-timing inactive anchor, self-reference, cycle, and direct conflict;
- deterministic multi-problem ordering, deduplication, and cascade suppression;
  and
- JCS-derived recipe/bundle evaluation identity unaffected by submitted key
  order or whitespace.

## Accepted owner review

Daniel approved the complete contract after independent review by Pão de
Portugal and Fornada. Both adopters selected `1A, 2A, 3A, 4B, 5A, 6A, 7A, 8A,
9A, 10B refined, 11A, 12A` and approved `scale` with exactly one `factor` or
root `formula_target`. Application aggregates, HTTP behavior, presentation,
timer policy, and baking intelligence remain outside this authority.
