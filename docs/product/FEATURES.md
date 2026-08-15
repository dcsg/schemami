# Schemami features

Source of truth: [features.yaml](./features.yaml). Traceability flows from each
feature to PRD-007 requirements, SPEC-007 rules, the release plan, and verified
implementation evidence.

## Schemami v1.0.0

| Feature | Status | Requirement |
|---|---|---|
| Schemami wire identity and clean cutover | shipped | FR-NAME-001, FR-CUTOVER-001 |
| Audited semantic field contract | implemented | FR-MODEL-001 |
| Recipe-local ingredients, techniques, and equipment | implemented | FR-VOCAB-001 |
| Exact quantities, formulas, and six Recipe Calculus operations | implemented | FR-CALC-006 |
| Source evidence isolation and machine diagnostics | implemented | FR-EVIDENCE-001 |
| Offline bundle identity and verification | implemented | FR-PORTABLE-001 |
| Pão-relevant registry-free adoption boundary | protocol proof implemented; app adoption external | FR-PAO-001 |
| Stable source release and conformance | shipped; package publication follows | FR-REL-001 |

“Shipped” means part of the v1.0.0 release contract and exercised by the shared
release gates. Application adoption remains owned and versioned by each
consumer.

## Explicitly external or deferred

- Pão de Portugal adapter, mappings, UI, and product model;
- hosted AI/OCR/scraper capture or source storage;
- translations and localized presentation;
- recipe hosting, user accounts, collections, or publishing infrastructure;
- global vocabulary registry or catalog governance;
- mass/volume density conversion, substitution inference, structured readiness
  endpoints, and operations not defined by Recipe Calculus.

Historical feature ledgers describe the pre-publication predecessor and do not
define Schemami v1 behavior.
