---
title: "Schemami v1 structured method wire proposal"
date: 2026-08-11
status: accepted
implements: [FR-METHOD-002, FR-VARIATION-001, FR-COMPOSITION-001, FR-LINEAGE-001]
---

# Schemami v1 structured method wire proposal

This is the accepted Phase 7 wire artifact under ADR-015. It defines the
canonical JSON shape implied by ADR-014. ADR-016 now closes its deterministic
Calculus behavior; Phase 9 may implement both accepted authorities. The current
runtime remains the verified `da8449f` baseline until then.

## Decision package

1. Replace root `steps` with `method.sequence`. `sequence` recursively contains
   only `section` and `step` nodes.
2. Require section `id`, source-language `name`, and non-empty `sequence`.
3. Require step `id` and exactly one of source-language `instruction` or a
   non-empty ordered `actions` array. Every action requires `id` and
   `instruction`; step/action `name` is optional when the source has a heading
   or action verb. Step `uses`/`produces` is authoritative for inter-step flow;
   actions may preserve a subset as fine-grained attribution but never own
   `after` or `duration`. Only the containing step is a dependency or scheduling
   unit.
4. Declare source-authored variation at root `parameters`. Parameter kinds are
   `choice`, `toggle`, and `measurement`; only an authored `default` selects
   implicitly.
5. Attach a closed `activation` predicate to an ingredient, component,
   equipment declaration, section, step, or action. Predicate kinds are
   `choice_is`, `toggle_is`, `measurement_compare`, `all`, `any`, and `not`.
   There is no expression string or extension-defined operator.
   Parameter bindings are operation/execution context and are not written back
   into the canonical recipe; declared defaults are the sole exception because
   they are authored recipe facts.
6. Model a strict same-quantity ingredient alternative through an ingredient
   `alternatives` object. Its ordered `options` are symmetric; optional
   `default` is present only when the source selects one. Quantity and formula
   participation belong to the ingredient slot and therefore cannot diverge by
   option.
7. Use `completion` only on steps and actions. Completion kinds are
   `observation`, `measurement`, `all`, and `any`. Observation carries `cue`;
   measurement carries source-language `name` plus typed `target`.
   Separately, ordered `guidance` preserves authored human cue/response pairs
   as `cue` plus `instruction`. Guidance is never an activation predicate or
   completion assertion.
8. Preserve an authored `environment` on a section, step, or action. It may
   contain source-language `location` and ordered `measurements`; it contains no
   biological model, recommendation, live reading, or timer policy. Section
   environment/timing describes that section and never implicitly inherits,
   merges into, or overrides descendant steps.
9. Preserve authored phase timing as `relative_timing`, anchored to an exact
   step. Its offset is either fixed `elapsed` duration or integer
   `calendar_days`, with explicit `before`/`after` relation. Calendar-day
   interpretation needs an application-supplied date and timezone.
10. Keep raw ingredients and referenced recipe `components` as separate input
    collections. Formula terms use a typed `input` reference so both can
    participate without overloading one ID namespace.
11. Replace singular root `formula` with ordered `formulas`. Every formula has
    a recipe-local `id` and optional source-language `name`, allowing independent
    dough, filling, topping, or feed groups. An ingredient/component may occur
    in at most one formula across the document and cannot also carry explicit
    quantity.
12. Declare intermediate `preparations` and externally consumable `outputs`.
    `uses` references an ingredient, component, or preparation; `produces`
    references a preparation or output. No flow is inferred from prose/order.
13. A component pins `recipe` by collection, id, revision, and JCS SHA-256 and
    names one required child `output`. Its required amount comes from exactly
    one parent authority: explicit `quantity` or a formula term. The child may
    declare measured `yield`; dependent scaling refuses when it is absent.
14. Replace the lock-only pack with one `.schemami-bundle.json` document. A
    bundle declares one exact `root` recipe reference and embeds exactly the
    deduplicated component closure of every declared branch under
    `documents[].document`; every `sha256` is computed from that document's
    independent RFC 8785 JCS bytes. Missing, duplicate, or unrelated extra
    documents are invalid.
15. Root `lineage.derived_from` contains one or more exact recipe references.
    It is canonical provenance and is never interpreted as a patch.

### Identifier scopes

- section and step IDs share one recipe-wide method-node namespace; duplicate
  IDs at any recursive depth are invalid;
- action IDs are unique inside their containing step;
- ingredient, component, preparation, output, technique, equipment, parameter,
  and formula IDs are unique inside their respective recipe collections;
- choice option IDs are unique inside their parameter; ingredient-alternative
  option IDs are unique inside their ingredient slot; and
- every reference carries enough type context to select exactly one namespace.

### Common structural rules

- Every protocol object is closed. It rejects unknown members except an
  `x-<owner>-*` extension member admitted by the existing extension contract.
  Extensions are preserved losslessly but cannot define a parameter kind,
  activation operator, completion kind, reference target, quantity authority,
  scheduling edge, or any other core behavior.
- Every new `name`, `instruction`, `cue`, `location`, and `notes` value is
  source-language content governed by the recipe's required
  `content_language`. No nested `lang`/`locale` alias or translation map is
  introduced.
- Authored arrays preserve source order. Arrays whose order has no authored
  meaning use the explicit deterministic rule stated for their type; they do
  not gain semantics merely from insertion order.
- Optional members are absent when unknown or inapplicable. `null`, empty
  strings, empty prose arrays, and placeholder objects do not stand for
  missing facts.
- Every ID and ID reference uses the accepted lowercase local-ID grammar. No
  reference is resolved by display name, translated text, mutable latest
  revision, filesystem path, or network lookup.
- Integrator extensions do not change protocol semantics, but they remain part
  of canonical JCS bytes and therefore change the exact content digest.

### Exact parameter union

The three parameter kinds are closed shapes rather than one bag of optional
members:

| Kind | Required | Optional | Forbidden from the other kinds |
|---|---|---|---|
| `choice` | `id`, `kind`, `name`, at least two ordered `options` | authored option-ID `default`, `notes` | `unit`, boolean/measurement default |
| `toggle` | `id`, `kind`, `name` | authored boolean `default`, `notes` | `options`, `unit`, option/measurement default |
| `measurement` | `id`, `kind`, `name`, UCUM `unit` | authored exact measurement `default`, `notes` | `options`, boolean/option default |

A measurement default repeats `unit` because it is an ordinary typed
measurement value; semantic validation requires it to be dimension-compatible
with the declared parameter unit. An activation leaf must reference the same
parameter kind implied by its predicate. These are document-validation errors,
not runtime false results.

### Exact activation union

| Kind | Required members |
|---|---|
| `choice_is` | `kind`, `parameter`, `option` |
| `toggle_is` | `kind`, `parameter`, `enabled` |
| `measurement_compare` | `kind`, `parameter`, `operator`, `measurement` |
| `all`, `any` | `kind`, at least two `conditions` |
| `not` | `kind`, one `condition` |

No leaf may carry composite members and no composite may carry leaf members.
Every declared branch is validated before any binding selects an active graph.

## Before: verified flattened candidate

```json
{
  "schemami": "1",
  "collection": "paodeportugal",
  "id": "pao-de-massa-mae",
  "revision": 1,
  "content_language": "pt-PT",
  "title": "Pão de massa-mãe",
  "ingredients": [
    {
      "id": "flour",
      "name": "Farinha de trigo T65",
      "quantity": {"kind": "measured", "value": "1000", "unit": "g"}
    }
  ],
  "steps": [
    {
      "id": "ferment",
      "instruction": "Fermente até a massa estar pronta.",
      "duration": {"minimum": "PT3H", "maximum": "PT12H"},
      "techniques": ["bulk-fermentation"]
    }
  ]
}
```

The candidate cannot state which duration belongs to cold versus ambient
fermentation, preserve “Na véspera”, preserve action/cue boundaries, or explain
which authored facts are inputs to the alternative.

## After: representative complete recipe

The following is valid JSON, not pseudocode. Digests use obvious placeholder
hex only because the referenced example bytes do not exist yet.

```json
{
  "schemami": "1",
  "collection": "paodeportugal",
  "id": "pao-de-massa-mae",
  "revision": 2,
  "content_language": "pt-PT",
  "title": "Pão de massa-mãe",
  "parameters": [
    {
      "id": "fermentation-mode",
      "kind": "choice",
      "name": "Modo de fermentação",
      "options": [
        {"id": "ambient", "name": "Fermentação ambiente"},
        {"id": "cold", "name": "Fermentação a frio"}
      ]
    },
    {
      "id": "include-seeds",
      "kind": "toggle",
      "name": "Adicionar sementes"
    },
    {
      "id": "ambient-temperature",
      "kind": "measurement",
      "name": "Temperatura ambiente",
      "unit": "Cel"
    }
  ],
  "ingredients": [
    {
      "id": "flour",
      "name": "Farinha de trigo T65"
    },
    {
      "id": "water",
      "name": "Água"
    },
    {
      "id": "salt",
      "alternatives": {
        "options": [
          {"id": "fine-sea-salt", "name": "Sal marinho fino"},
          {"id": "fine-rock-salt", "name": "Sal-gema fino"}
        ]
      }
    },
    {
      "id": "seeds",
      "name": "Sementes",
      "quantity": {"kind": "measured", "value": "80", "unit": "g"},
      "activation": {
        "kind": "toggle_is",
        "parameter": "include-seeds",
        "enabled": true
      }
    }
  ],
  "components": [
    {
      "id": "levain",
      "name": "Levain",
      "recipe": {
        "collection": "paodeportugal",
        "id": "levain-de-trigo",
        "revision": 3,
        "sha256": "1111111111111111111111111111111111111111111111111111111111111111"
      },
      "output": "levain",
      "notes": ["A quantidade é determinada pela fórmula do pão."]
    }
  ],
  "preparations": [
    {"id": "mixed-dough", "name": "Massa misturada"},
    {"id": "fermented-dough", "name": "Massa fermentada"}
  ],
  "outputs": [
    {
      "id": "bread",
      "name": "Pão",
      "yield": {"kind": "measured", "value": "1", "unit": "1"}
    }
  ],
  "techniques": [
    {"id": "folding", "name": "Dobras"},
    {"id": "cold-fermentation", "name": "Fermentação a frio"}
  ],
  "equipment": [
    {"id": "refrigerator", "name": "Frigorífico"},
    {"id": "oven", "name": "Forno"}
  ],
  "formulas": [
    {
      "id": "dough",
      "name": "Massa",
      "kind": "percentage",
      "basis": {"kind": "ingredient", "id": "flour"},
      "terms": [
        {
          "input": {"kind": "ingredient", "id": "flour"},
          "percentage": "100"
        },
        {
          "input": {"kind": "ingredient", "id": "water"},
          "percentage": "75"
        },
        {
          "input": {"kind": "ingredient", "id": "salt"},
          "percentage": "2"
        },
        {
          "input": {"kind": "component", "id": "levain"},
          "percentage": "20"
        }
      ],
      "basis_quantity": {"kind": "measured", "value": "1000", "unit": "g"}
    }
  ],
  "method": {
    "sequence": [
      {
        "kind": "section",
        "id": "prepare-dough",
        "name": "Preparar a massa",
        "sequence": [
          {
            "kind": "step",
            "id": "mix",
            "actions": [
              {
                "id": "combine",
                "name": "Misturar",
                "instruction": "Misture a farinha, a água e o levain."
              },
              {
                "id": "add-salt",
                "name": "Juntar o sal",
                "instruction": "Junte o sal e amasse."
              }
            ],
            "uses": [
              {"kind": "ingredient", "id": "flour"},
              {"kind": "ingredient", "id": "water"},
              {"kind": "ingredient", "id": "salt"},
              {"kind": "component", "id": "levain"}
            ],
            "produces": [{"kind": "preparation", "id": "mixed-dough"}],
            "duration": {"target": "PT12M"}
          }
        ]
      },
      {
        "kind": "section",
        "id": "ambient-fermentation",
        "name": "Fermentação ambiente",
        "activation": {
          "kind": "choice_is",
          "parameter": "fermentation-mode",
          "option": "ambient"
        },
        "sequence": [
          {
            "kind": "step",
            "id": "ambient-proof",
            "instruction": "Fermente à temperatura ambiente.",
            "after": ["mix"],
            "uses": [{"kind": "preparation", "id": "mixed-dough"}],
            "environment": {
              "location": "Bancada",
              "measurements": [
                {
                  "name": "Temperatura ambiente",
                  "target": {"kind": "range", "minimum": "20", "maximum": "24", "unit": "Cel"}
                }
              ]
            },
            "duration": {"minimum": "PT3H", "target": "PT4H", "maximum": "PT5H"},
            "completion": {
              "kind": "observation",
              "cue": "A massa está aerada e aumentou visivelmente de volume."
            },
            "guidance": [
              {
                "cue": "A massa quase não cresceu ao fim de 4 horas.",
                "instruction": "Coloque-a num local mais quente e prolongue a fermentação."
              }
            ],
            "produces": [{"kind": "preparation", "id": "fermented-dough"}]
          }
        ]
      },
      {
        "kind": "section",
        "id": "cold-fermentation-phase",
        "name": "Na véspera — fermentação a frio",
        "activation": {
          "kind": "choice_is",
          "parameter": "fermentation-mode",
          "option": "cold"
        },
        "relative_timing": {
          "anchor_step": "bake",
          "relation": "before",
          "offset": {"kind": "calendar_days", "days": 1}
        },
        "sequence": [
          {
            "kind": "step",
            "id": "cold-proof",
            "instruction": "Fermente no frigorífico.",
            "after": ["mix"],
            "uses": [{"kind": "preparation", "id": "mixed-dough"}],
            "techniques": ["cold-fermentation"],
            "equipment": ["refrigerator"],
            "environment": {
              "location": "Frigorífico",
              "measurements": [
                {
                  "name": "Temperatura",
                  "target": {"kind": "range", "minimum": "3", "maximum": "5", "unit": "Cel"}
                }
              ]
            },
            "duration": {"minimum": "PT8H", "target": "PT12H", "maximum": "PT18H"},
            "produces": [{"kind": "preparation", "id": "fermented-dough"}]
          }
        ]
      },
      {
        "kind": "section",
        "id": "baking",
        "name": "Cozer",
        "sequence": [
          {
            "kind": "step",
            "id": "bake",
            "instruction": "Coza até o miolo atingir a temperatura indicada.",
            "after": ["ambient-proof", "cold-proof"],
            "uses": [{"kind": "preparation", "id": "fermented-dough"}],
            "produces": [{"kind": "output", "id": "bread"}],
            "equipment": ["oven"],
            "duration": {"minimum": "PT35M", "target": "PT40M", "maximum": "PT45M"},
            "completion": {
              "kind": "all",
              "conditions": [
                {
                  "kind": "observation",
                  "cue": "A côdea está bem dourada."
                },
                {
                  "kind": "measurement",
                  "name": "Temperatura interna",
                  "target": {"kind": "range", "minimum": "95", "maximum": "97", "unit": "Cel"}
                }
              ]
            }
          }
        ]
      }
    ]
  },
  "lineage": {
    "derived_from": [
      {
        "collection": "paodeportugal",
        "id": "pao-base",
        "revision": 4,
        "sha256": "2222222222222222222222222222222222222222222222222222222222222222"
      }
    ]
  }
}
```

## Strict ingredient alternatives

The ingredient slot owns one quantity/formula position. Alternatives cannot
carry their own quantity, scaling, formula term, activation, or method patch:

```json
{
  "id": "sweetener",
  "alternatives": {
    "options": [
      {"id": "sugar", "name": "Açúcar"},
      {"id": "erythritol", "name": "Eritritol"}
    ]
  },
  "quantity": {"kind": "measured", "value": "50", "unit": "g"}
}
```

If erythritol requires a different quantity, more liquid, or another method,
this shape is invalid for that source. The recipe must use a typed branch with
all changed facts stated explicitly or publish a complete derived recipe.

## Parameter declarations and activation

### Choice

```json
{
  "id": "fermentation-mode",
  "kind": "choice",
  "name": "Modo de fermentação",
  "options": [
    {"id": "ambient", "name": "Ambiente"},
    {"id": "cold", "name": "Frio"}
  ],
  "default": "cold"
}
```

### Toggle

```json
{
  "id": "include-seeds",
  "kind": "toggle",
  "name": "Adicionar sementes",
  "default": false
}
```

### Measurement

```json
{
  "id": "ambient-temperature",
  "kind": "measurement",
  "name": "Temperatura ambiente",
  "unit": "Cel",
  "default": {"kind": "measured", "value": "22", "unit": "Cel"}
}
```

The optional default is canonical only when present in the authored source.
Array order never selects a default.

### Closed predicates

```json
{
  "kind": "all",
  "conditions": [
    {
      "kind": "choice_is",
      "parameter": "fermentation-mode",
      "option": "ambient"
    },
    {
      "kind": "measurement_compare",
      "parameter": "ambient-temperature",
      "operator": "greater_than_or_equal",
      "measurement": {"kind": "measured", "value": "20", "unit": "Cel"}
    },
    {
      "kind": "not",
      "condition": {
        "kind": "toggle_is",
        "parameter": "include-seeds",
        "enabled": true
      }
    }
  ]
}
```

`measurement_compare.operator` is one of `equal`, `less_than`,
`less_than_or_equal`, `greater_than`, or `greater_than_or_equal`. Comparison
uses exact compatible UCUM conversion; dimension mismatch refuses resolution.

`all` and `any` require at least two conditions. Recursive predicates have no
arbitrary schema depth cap; deterministic implementations may return
`resource-limit` under the Phase 8 contract.

## Completion

```json
{
  "kind": "any",
  "conditions": [
    {"kind": "observation", "cue": "A cebola está dourada."},
    {
      "kind": "measurement",
      "name": "Temperatura do centro",
      "target": {"kind": "measured", "value": "75", "unit": "Cel"}
    }
  ]
}
```

`all`/`any` require at least two conditions. `not` is intentionally absent
from completion: an authored positive completion condition should say what is
true when work is complete. Observation prose remains human-evaluated.

## Human cue and response guidance

```json
{
  "guidance": [
    {
      "cue": "A água fica em poças e a massa não a absorve.",
      "instruction": "Amasse mais 3–5 minutos antes de adicionar mais água."
    }
  ]
}
```

This preserves Pão's authored cue condition/action pair without pretending the
validator can observe dough or execute a branch. If the source states a true
method alternative, it uses typed `parameters` and `activation` instead.

## Relative timing

Fixed elapsed lead time:

```json
{
  "anchor_step": "bake",
  "relation": "before",
  "offset": {"kind": "elapsed", "duration": "PT12H"}
}
```

Relative calendar phase:

```json
{
  "anchor_step": "bake",
  "relation": "before",
  "offset": {"kind": "calendar_days", "days": 1}
}
```

`calendar_days` is intentionally not encoded as `P1D`: Schemami's existing
elapsed profile defines `P1D` as exactly 86,400 seconds, while a previous local
calendar day depends on the date and timezone supplied by an application.
`days` is a positive JSON integer and direction comes only from `relation`;
zero and signed values are invalid.

## Exact recipe references and outputs

```json
{
  "id": "levain",
  "name": "Levain",
  "recipe": {
    "collection": "paodeportugal",
    "id": "levain-de-trigo",
    "revision": 3,
    "sha256": "1111111111111111111111111111111111111111111111111111111111111111"
  },
  "output": "levain",
  "quantity": {"kind": "measured", "value": "200", "unit": "g"}
}
```

The referenced recipe must contain:

```json
{
  "outputs": [
    {
      "id": "levain",
      "name": "Levain",
      "yield": {"kind": "measured", "value": "500", "unit": "g"}
    }
  ]
}
```

The required 200 g therefore selects an exact scale factor of 0.4. No density,
name mapping, registry, or network lookup participates.

## Multiple formula groups

```json
{
  "formulas": [
    {
      "id": "dough",
      "name": "Massa",
      "kind": "percentage",
      "basis": {"kind": "ingredient", "id": "flour"},
      "terms": [
        {"input": {"kind": "ingredient", "id": "flour"}, "percentage": "100"},
        {"input": {"kind": "ingredient", "id": "water"}, "percentage": "75"}
      ],
      "basis_quantity": {"kind": "measured", "value": "1000", "unit": "g"}
    },
    {
      "id": "topping",
      "name": "Cobertura",
      "kind": "ratio",
      "terms": [
        {"input": {"kind": "ingredient", "id": "sesame"}, "parts": "2"},
        {"input": {"kind": "ingredient", "id": "poppy"}, "parts": "1"}
      ],
      "target": {"kind": "measured", "value": "60", "unit": "g"}
    }
  ]
}
```

Formula array order and term order are authored order. One typed input cannot
occur in both groups or also carry explicit quantity. ADR-016 requires a
formula ID for `resolve_formula`; it never silently picks the first group.

## Self-contained bundle

The old pack is lock-only and cannot satisfy offline resolution. The proposed
bundle embeds each document while preserving independent canonical identity:

```json
{
  "schemami": "1",
  "root": {
    "collection": "paodeportugal",
    "id": "pao-de-massa-mae",
    "revision": 2,
    "sha256": "3333333333333333333333333333333333333333333333333333333333333333"
  },
  "documents": [
    {
      "sha256": "3333333333333333333333333333333333333333333333333333333333333333",
      "document": {"schemami": "1", "collection": "paodeportugal", "id": "pao-de-massa-mae", "revision": 2, "content_language": "pt-PT", "title": "Pão de massa-mãe", "ingredients": [], "method": {"sequence": []}}
    },
    {
      "sha256": "1111111111111111111111111111111111111111111111111111111111111111",
      "document": {"schemami": "1", "collection": "paodeportugal", "id": "levain-de-trigo", "revision": 3, "content_language": "pt-PT", "title": "Levain de trigo", "ingredients": [], "method": {"sequence": []}}
    }
  ]
}
```

The abbreviated embedded documents above illustrate the envelope only and are
not schema-valid complete recipes. Normative bundle vectors use complete valid
documents and verified digests.

`documents[0]` is always the exact `root`. Remaining component dependency
documents are sorted by the ASCII tuple `(collection, id, revision, sha256)`;
array order is therefore deterministic and never presentation-authored. The
bundle includes exactly the deduplicated transitive component dependency
closure from every declared branch, not only the current selection and not
lineage parents, evidence sources, translations, or application overlays.
Duplicate, missing, or unrelated extra documents are invalid. A standalone
`.schemami.json` remains sufficient when no component logic needs other bytes.
Transport streaming, compression, caching, and HTTP range behavior are
integrator concerns; the protocol guarantees only that complete export can be
one self-contained JSON download.

## Minimal required-field rule

Require only what identifies an object, distinguishes its closed kind, makes
authored content readable, or supplies the one authority the object promises.
Every other registered member is optional and absent when unknown. Closed
unions reject wrong-kind members without repeating a forbidden-field matrix.

| Object | Required members |
|---|---|
| Section | `kind`, `id`, `name`, `sequence` |
| Step | `kind`, `id`, exactly one of `instruction`/`actions` |
| Action | `id`, `instruction` |
| Choice parameter | `id`, `kind`, `name`, `options` |
| Toggle parameter | `id`, `kind`, `name` |
| Measurement parameter | `id`, `kind`, `name`, `unit` |
| Ingredient | `id`, exactly one of `name`/`alternatives` |
| Ingredient alternative option | `id`, `name` |
| Component | `id`, `name`, `recipe`, `output`, exactly one quantity authority |
| Preparation | `id`, `name` |
| Output | `id`, `name` (`yield` remains optional captured data) |
| Ratio formula | `id`, `kind`, `terms` (`target` is optional) |
| Percentage formula | `id`, `kind`, `basis`, `terms` (`basis_quantity` is optional) |
| Guidance entry | `cue`, `instruction` |
| Environment measurement | `name`, `target` |
| Recipe reference | `collection`, `id`, `revision`, `sha256` |

## Exact member register

| Scope | Members | Rules |
|---|---|---|
| Recipe additions | `parameters`, `components`, `preparations`, `outputs`, `formulas`, `method`, `lineage` | Optional except required `method`; root `steps` and singular `formula` are removed, not aliased. |
| Method | `sequence` | Required ordered array; root may be empty for honest partial capture, while method-dependent operations report missing facts. |
| Section | `kind`, `id`, `name`, `sequence`, `activation`, `environment`, `relative_timing`, `notes` | `kind: section`; non-empty sequence; no dependency or duration. |
| Step | `kind`, `id`, `name`, exactly one of `instruction`/`actions`, `after`, `uses`, `produces`, `duration`, `techniques`, `equipment`, `completion`, `guidance`, `environment`, `activation`, `relative_timing`, `notes` | Only scheduling/dependency unit; name is an optional source heading. |
| Action | `id`, `name`, `instruction`, `uses`, `produces`, `techniques`, `equipment`, `completion`, `guidance`, `environment`, `activation`, `notes` | Ordered inside step; optional source verb/heading; action flow must be a subset of authoritative step flow and never creates dependency/schedule semantics; no `kind`, `after`, or `duration`. |
| Parameter | common `id`, `kind`, `name`, `default`, `notes`; choice `options`; measurement `unit` | Closed discriminated union. Defaults are optional and source-authored. |
| Activation | common `kind`; leaf fields shown above; composite `conditions` or `condition` | Closed recursive union; no expression text. |
| Ingredient alternatives | `alternatives.options`, `alternatives.default`; option `id`, `name`, `notes`, `external_references` | Exactly one of ingredient `name` or `alternatives`; at least two options; shared quantity/formula position; array order is not a default. |
| Measurement | `kind`, `value` or `minimum`/`maximum`, `unit` | Closed signed `measured`/`range` union reuses the accepted quantity member meanings; ordered range; pinned UCUM unit required. Ingredient quantities and yields remain positive. |
| Completion | observation `kind`, `cue`; measurement `kind`, `name`, `target`; composites `kind`, `conditions` | Closed observation/measurement/all/any union; human-evaluated and distinct from duration. |
| Environment | `location`, `measurements`; measurement entry `name`, `target` | At least one of location/measurements; authored facts only; section values do not inherit into descendants. |
| Guidance | entry `cue`, `instruction`, `notes` | Ordered, source-authored, human-evaluated cue/response pairs; no unused identity and no Calculus or activation effect. |
| Relative timing | `anchor_step`, `relation`, `offset`; offset is elapsed `duration` or positive integer `days` | Relation is `before`/`after`; no wall-clock timestamp/timezone. |
| Input reference | `kind`, `id` | Kind is `ingredient` or `component`. Used by formulas and effective quantity results. |
| Formula | `id`, `name`, existing kind-specific members; terms use typed `input`, percentage `basis` is also typed | Ordered root `formulas`; input has only one quantity authority across all groups. Multiple allocations of one culinary ingredient use separate local input IDs. |
| Resource reference | `kind`, `id` | `uses`: ingredient/component/preparation. `produces`: preparation/output. |
| Preparation | `id`, `name`, `notes` | Recipe-local intermediate resource. |
| Output | `id`, `name`, `yield`, `notes` | Yield is optional captured data but must be scalar measured for cross-recipe scaling. |
| Component | `id`, `name`, `recipe`, `output`, `quantity`, `activation`, `notes` | Exact offline child output required by parent. Quantity is optional when formula authority supplies it; the two authorities are mutually exclusive. |
| Recipe reference | `collection`, `id`, `revision`, `sha256` | Exact immutable identity; no URI/network resolution. |
| Lineage | `derived_from` | Non-empty unique exact references; provenance only. |
| Bundle | `schemami`, `root`, `documents`; entry `sha256`, `document` | Root is first; remaining all-branch component closure is deduplicated and tuple-sorted; no missing/extra documents; each digest matches independent JCS bytes. |

## Field-name collision audit

| Chosen name | Rejected alternatives | Reason |
|---|---|---|
| `method.sequence` | root `steps`, `items`, `children` | `sequence` is already owner-approved and describes ordered mixed section/step nodes without calling sections steps or exposing schema terminology. |
| `section` / `step` | `group`, `stage`, `phase`, `item` | Matches the established HowTo/recipe distinction; phase is represented by a section name/timing, not a separate node ontology. |
| action `name` + `instruction` | `verb` + `body`, `title`, concatenated prose | Preserves Pão without importing Portuguese/source-specific vocabulary; `name` is the short authored heading and `instruction` is the executable prose consistently across step/action scopes. |
| `parameters` | `inputs`, `options`, `variables`, `settings` | Avoids collision with culinary inputs and avoids claiming every declaration is a choice or an app preference. Values are bound only for resolution/execution. |
| `activation` | `when`, `condition`, `guard`, `if` | Explicitly names the machine effect and cannot be confused with human completion/guidance, temporal phase, or old Model 1 guards. |
| `completion` | `endpoint`, `until`, `done_when`, `readiness` | Names the semantic boundary without implying a network endpoint, prose loop, UI state, or sensor assertion. |
| `guidance` with `cue`/`instruction` | `conditions`, `tips`, `rules` | Preserves authored human cue/response pairs while remaining visibly non-executable and distinct from activation/completion. |
| `environment` | `conditions`, `context`, `location` alone | Groups explicitly authored surrounding facts while leaving live bake context and application models out. |
| `relative_timing` | `phase`, `schedule`, `when` | Distinguishes authored relation from section label, calculated schedule, and wall-clock presentation. |
| `components` | `subrecipes`, `includes`, `dependencies` | A referenced recipe output is a culinary component; dependency is a resolution consequence and include suggests textual embedding. |
| `preparations` | `resources`, `intermediates`, `products` | Culinary term for recipe-local material produced/consumed between steps; `outputs` remains separately externally consumable. |
| `outputs[].yield` | `quantity`, `amount`, `servings` | `yield` is established recipe terminology and precisely means amount produced; the value itself is a measured quantity. |
| `formulas` | singular `formula`, `formula_groups` | Ordinary plural collection supports independent authored groups; each local formula ID supplies stable selection without another wrapper term. |
| typed `input` reference | `ingredient`, `item`, `term`, generic string ID | Formula input can be an ingredient or component; explicit kind prevents namespace collision and central-registry semantics. |
| `.schemami-bundle.json` | pack, archive, companion | Bundle promises embedded self-contained bytes; pack was lock-only, archive implies compression/container, and companion recreates multi-download ownership. |
| `lineage.derived_from` | `parent`, `variant`, `source`, patch | Supports more than one exact provenance parent without implying runtime inheritance, app variant taxonomy, acquisition evidence, or executable mutation. |

Repeated `id`, `name`, `kind`, `notes`, `instruction`, `quantity`, and `unit`
retain the same meaning inside their typed containing objects. No convenience
alias is proposed.

## Nearest invalid neighbours

The conformance corpus must reject or refuse all of these deliberately:

- root `steps` beside or instead of `method`;
- unknown method node kind, empty section sequence, or an action in `sequence`;
- step with both/neither `instruction` and `actions`, or an empty actions array;
- action with `after` or `duration`, or action resource flow treated as an
  independent scheduling dependency, or action flow not declared by its step;
- duplicate step IDs anywhere in the recursive method;
- parameter without a binding/default when an operation depends on it;
- choice default/activation option not declared by that parameter;
- predicate kind used with the wrong parameter kind;
- arbitrary predicate string/operator or owner-extension predicate semantics;
- invalid content hidden only in an inactive branch;
- a selected action-list step with zero active actions, or an active consumed
  resource with zero/multiple active producers;
- ingredient alternative carrying its own quantity, scaling, activation, or
  formula term;
- completion with empty/single-child `all`/`any`, `not`, or duration as a cue;
- guidance without both cue and instruction, parsed as a predicate, or allowed to
  alter the active graph or schedule;
- environment measurement treated as a live reading or schedule duration;
- `calendar_days` encoded as a duration string or used without an anchor step;
- formula input whose typed namespace/ID does not resolve;
- duplicate formula ID, one input in multiple formulas, or an input carrying
  both explicit quantity and formula authority;
- component missing exact recipe pin, child output, sole quantity authority,
  loaded bytes, matching digest, or a compatible yield on that child output;
- active dependency/reference cycle or excessive recursive/branch expansion;
- bundle missing root/dependency bytes, containing a mismatched digest, or
  duplicate/unrelated extra bytes, excluding a dependency from an inactive
  declared branch, or requiring network access; and
- lineage containing a patch, JSON Pointer mutation, URI-only parent, or a
  reference to mutable/latest revision or the document itself.

## Verified adopter fit

| Observed source fact | Proposed lossless target | Boundary |
|---|---|---|
| Pão 117 stage titles | optional step `name` inside recursive sections | Does not become a technique or scheduler by its wording. |
| Pão 226 action verb/body pairs | ordered action `name` + `instruction` | No concatenation required. |
| Pão 37 cue condition/action pairs | ordered `guidance` cue + instruction | Human guidance, never executable activation. |
| Pão 105 duration labels, including two conditional labels | step `duration`, or separate activated steps when alternatives are truly authored | Adapter never chooses a branch or invents a number. |
| Pão 7 phase-bearing stages | section `name` and, only when stated, `relative_timing` | A phase label alone carries no calendar arithmetic. |
| Pão 31 formula-only records | required `method` with empty `sequence` | Honest partial capture; method operations report missing facts. |
| Fornada exact gram formula | one locally identified ratio inside `formulas` | Existing values remain exact; general multi-formula import may exceed its legacy projection. |
| Fornada workflow `stepType` | app overlay unless the source explicitly authors a technique | No application primitive leaks into Schemami. |
| Fornada timer/notification/fermentation heuristics | no canonical target | Application policy and bake state remain outside the protocol. |
| Fornada unknown ingredient/multiple-technique projection | retain valid Schemami bytes and return app refusal | Protocol validity remains distinct from app projectability. |

### First interoperability success measure

Phase 11 succeeds when both products implement adapters against the same
committed candidate bytes and demonstrate all of the following:

1. Pão de Portugal preserves its promoted editorial method, action, cue,
   formula, source, and evidence facts without adding Pão-owned aggregate data
   to Schemami.
2. Fornada losslessly exchanges the portable subset while retaining baking
   heuristics, timer policy, execution state, and reviewed local mappings in
   its own domain.
3. The same unfamiliar but valid Schemami content remains readable in both
   products even when either application refuses its own richer projection.
4. Each adapter reports the same protocol-validity result for the permanent
   shared vectors; application projectability remains a separate result.

This is evidence of cross-product protocol fit because the two products have
different aggregates and responsibilities. It is not yet evidence of
independent-owner adoption, broad ecosystem demand, or a global registry need.

## Standards fit

| Concern | Authority | Decision |
|---|---|---|
| Canonical bytes | RFC 8785 JCS over admitted I-JSON | Hash each recipe independently; array order is never changed by canonicalization. |
| Digest | SHA-256 lowercase hexadecimal | Reuse existing `sha256`; do not invent a digest URI grammar in v1. |
| Evidence paths | RFC 6901 JSON Pointer | New semantic nodes remain targetable through their exact paths. |
| Units | pinned UCUM 2.2 | Ingredient quantities, measurement parameters, completion targets, environment measurements, and yields use UCUM identities. |
| Elapsed duration | strict positive RFC 5545 section 3.3.6 lexical profile | Preserve existing fixed elapsed Schemami semantics. |
| Calendar-relative phase | no adopted portable recipe standard found | Use explicit integer `calendar_days`; never overload fixed elapsed `P1D`. |
| Language | BCP 47/IANA Language Subtag Registry | Every new authored prose field uses root `content_language`. |
| Recursive schema | JSON Schema Draft 2020-12 | Use recursive `$ref` with semantic resource limits; no arbitrary schema depth maximum. |
| Predicate language | no general expression standard adopted | Use the closed typed union above; JSONPath/JSON Logic/code strings are deliberately not embedded. |
| Recipe instruction hierarchy | Schema.org `recipeInstructions` permits ordered `HowToStep`/`HowToSection` content | Preserve the same section/step distinction, but do not reuse its free-form/SEO interchange shape as deterministic method semantics; Schemami's accepted ordered field remains `sequence`. |
| Bundle schema | `https://schemami.dev/schema/schemami/1/bundle.schema.json` | Replaces the unpublished lock-only pack schema; interoperable media type remains `application/json`. |

## Calculus closure

Approval of this artifact closed field naming and JSON shape. ADR-016 and
`active-graph-composition-calculus.md` now close parameter bindings, selected
active graphs, inactive edges, output ordering, strict alternatives, component
scale/refusal, cycles/resources, operation tokens, results, and problem
pointers. Schema/runtime implementation begins in Phase 9.

## Accepted authority changes

ADR-015:

- make the exact members and invariants in this artifact normative for the
  replacement Schemami v1 candidate;
- supersede only ADR-012's singular-root-`formula` shape while retaining its
  one-authority/no-precedence invariant across the new `formulas` collection;
- supersede the lock-only pack envelope with the embedded bundle contract,
  while retaining exact JCS digest identity and offline-only resolution;
- leave ADR-014's product boundary and ADR-011's scheduling definition in
  force, with scheduling applied to the selected active graph under ADR-016;
  and
- require corresponding accepted updates to SPEC-007 and the field register
  before schema, Go, TypeScript, viewer, or corpus implementation begins.

ADR-016 is the accepted Phase 8 authority for schema/runtime work.
