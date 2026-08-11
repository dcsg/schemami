# Schemami features

Source of truth: [features.yaml](./features.yaml). Traceability flows from each
feature to PRD-007 requirements, SPEC-007 rules, the release plan, and verified
implementation evidence.

## Schemami v1 release candidate

| Feature | Status | Requirement |
|---|---|---|
| Schemami wire identity and clean cutover | implemented; release proof pending | FR-NAME-001, FR-CUTOVER-001 |
| Audited semantic field contract | implemented | FR-MODEL-001 |
| Recipe-local ingredients, techniques, and equipment | implemented | FR-VOCAB-001 |
| Exact quantities, formulas, and five Recipe Calculus operations | implemented | FR-CALC-006 |
| Source evidence isolation and machine diagnostics | implemented | FR-EVIDENCE-001 |
| Offline pack identity and verification | implemented | FR-PORTABLE-001 |
| Pão-relevant registry-free adoption boundary | protocol proof implemented; app adoption external | FR-PAO-001 |
| Stable release conformance and publication | in progress | FR-REL-001 |

“Implemented” here means present and exercised in the current dirty worktree;
it does not mean committed, tagged, remotely published, or released. The final
release feature stays in progress until clean-clone and immutable-URL gates
pass.

## Explicitly external or deferred

- Pão de Portugal adapter, mappings, UI, and product model;
- AI/OCR/scraper source-to-candidate conversion;
- documentation/manual website;
- translations and localized presentation;
- recipe hosting, user accounts, collections, or publishing infrastructure;
- global vocabulary registry or catalog governance;
- mass/volume density conversion, substitution inference, structured readiness
  endpoints, and operations not defined by Recipe Calculus.

Historical feature ledgers describe the pre-publication predecessor and do not
define Schemami v1 behavior.
