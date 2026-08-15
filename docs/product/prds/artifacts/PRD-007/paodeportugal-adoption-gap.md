---
title: "PRD-007 Pão de Portugal adoption gap"
date: 2026-08-10
status: verified-adoption-evidence-not-release-input
source: "Pão de Portugal repository: experiments/recipe-rcp-parity/"
---

# PRD-007 Pão de Portugal adoption gap

This record preserves evidence from the existing disposable RCP parity spike.
It does not create Schemami-release requirements, modify the Pão de Portugal
repository, or accept the current experiment as production adoption evidence.
ADR-006 explicitly removes Pão adapter work from Schemami v1 release scope.

## What already works

The current adapter proves useful, real boundary evidence:

1. `examples/alentejano.rcp.yaml` projects exactly to Pão's current formula.
2. Pão de Mafra serializes to an RCP Model 1 document and projects back to the
   same formula and staged method.
3. Pão-specific editorial/UI behaviour—phases, gestures, action grouping,
   duration labels and timer identity—can be compared without claiming that
   those fields are protocol semantics.
4. A Today record with no culinary content is excluded rather than fabricated
   as a recipe document.

## Current assumptions a future Pão adapter must revisit

| Current adapter behaviour | Why it is insufficient | Future Pão integration direction |
|---|---|---|
| Requires `rcp: 1`, optional `lang`, locale maps, and `x-pao-de-portugal`. | Legacy-only wire form; mixes content language and Pão overlay in one document. | Consume Schemami wire v1 directly if/when Pão adopts it. Content-language and Pão-only display data follow the field register and ADR-004 boundary. |
| `ITEM_TO_FIELD` maps RCP registry IDs to Pão formula fields. | This is good app-owned resolution, but its role is undocumented and conflated with central registry admission. | Keep Pão's map as explicit application resolution context. It must not rewrite a Schemami source term or make a global equivalence claim. |
| `registryFinding` warns that a missing RCP ID must be added through registry governance before publication. | Directly conflicts with ADR-005 and blocks unfamiliar/local terms on central curation. | A known Pão mapping may operate on a recipe-local term without a central registry entry. An unknown term is readable; only the Pão formula projection refuses if Pão has no mapping. |
| `item: string` is assumed for every ingredient. | Cannot represent a recipe-local definition, optional external reference, or resolution status honestly. | Map the later Schemami recipe-local term shape without treating central registry membership as admission. |
| `x-pao-de-portugal.stageOverlays` is carried inside the RCP document. | Pão UI/editorial state becomes a protocol extension and can be mistaken for portable culinary semantics. | Store overlay data in Pão's application-owned snapshot/envelope keyed to the Schemami document identity/revision. The Schemami document remains portable without it. |
| Unknown ingredient causes `RCP_INGREDIENT_UNSUPPORTED` blocker. | Correctly refuses the Pão formula projection, but currently makes central registry absence look like the reason. | Return a diagnostic that names the unsupported **Pão mapping** and source/local term; do not demand an RCP/Schemami central entry. |
| All Pão quantities are grams. | It proves only one quantity form. | Preserve the gram projection proof while adding a separate conversion capability proof; Pão must not trigger unit inference or mass-volume conversion. |

## Useful future adoption corpus (not a release gate)

If Pão chooses to adopt Schemami, these cases are useful evidence. They are not
part of the Schemami release candidate or clean-clone gate:

1. **Alentejano source conversion:** Pão converts its own known recipe source
   to Schemami v1 and projects it to the Pão formula.
2. **Mafra local vocabulary:** Pão writes a Schemami v1 snapshot containing at
   least one term not in the legacy central seed. Pão's reviewed local mapping
   projects it correctly without requiring a seed-registry addition.
3. **Unknown-to-Pão local term:** Schemami validates/renders the recipe, while
   Pão formula projection returns an explicit app-mapping refusal and preserves
   the source/local term.
4. **Overlay separation:** Pão stage overlay data survives its own snapshot
   round trip but is absent from the canonical Schemami document and does not
   affect Schemami validation or Calculus results.
5. **Today stub:** a Pão record without actual culinary formula/method remains
   excluded and never produces an admitted Schemami document.
6. **Quantity boundary:** the adapter accepts explicit supported gram values;
   an ambiguous or physical conversion request receives the Schemami refusal
   rather than a Pão approximation.

## Future compatibility report

If Pão implements an adapter, it may produce a content-free report that
that separates:

- Schemami model/wire version;
- Schemami document identity/revision;
- application mapping decision and evidence identifier, if any;
- fields preserved in the Schemami snapshot;
- Pão-only overlay fields retained outside it;
- operations supported, refused, or not applicable and their stable codes;
- known loss or an explicit refusal.

The report is Pão application evidence. It is not a new Schemami recipe field,
translation artifact, account record, or hosted service.

## Verified post-correction adoption evidence — 2026-08-11

Two independent application experiments were replayed against the corrected
unpublished Schemami v1 candidate. Neither application worktree is a release
input and neither result expands the canonical schema.

### Pão de Portugal complete-recipe replay

- The durable corpus query reports 49 formulas, 18 method-bearing recipes, 117
  authored stages, 226 named actions, 37 conditional cues, 41 technique
  references, and 105 authored duration labels.
- The real adapter validates 49/49 formula documents and 18/18 method documents.
  It preserves all 117 stage occurrences and all 41 technique references.
- 103 duration labels map losslessly to one exact value or ordered duration
  window. Two conditional/alternative labels deliberately remain app-owned and
  portable `duration` is omitted.
- The fit findings confirm the v1 boundary: `instruction` is the smallest
  portable method unit; named sub-actions and structured conditional cues are
  not canonical v1 members. A Schemami document is the normalized culinary and
  computational backbone, not a lossless Pão editorial/UI snapshot.

Reproduced command:

```sh
SCHEMAMI_WORKTREE_ROOT=/path/to/schemami \
  docs/product/specs/SPEC-013-schemami-v1-candidate-dogfood/run-working-tree-adapter-replay.sh
```

Observed result: the three selected adapter tests passed; corpus replay reported
`schemami_valid=49`, `schemami_invalid=0`, `method_documents=18`,
`promoted_method_stages=117`, and `scheduled_method_stages=103`.

### Fornada Swift boundary replay

- All 20 current system bread formulas export to Schemami and project exactly
  back into the existing Fornada snapshot model.
- Unknown local ingredients remain valid Schemami data while the app projection
  refuses until a reviewed mapping exists.
- A ratio whose target would require fractional redistribution refuses rather
  than rounding into Fornada's integer-gram model.
- App lifecycle, timers, variants, mappings, UI state, and the legacy method
  snapshot remain in a separate Fornada-owned overlay.
- Eight focused Swift adapter tests pass and the independently generated
  Alentejano fixture is accepted by the Go reference validator.

Production overlay and mapping bindings MUST use the published document
identity `(collection, id, revision, JCS SHA-256 digest)`, not only the first
three members. The digest prevents changed bytes under a reused revision from
inheriting stale app mappings, timer data, or other overlay meaning.

These results support a future protocol-owned Swift SDK that shares the v1
conformance corpus. Codable model generation alone is not conformance: the SDK
also needs semantic validation, exact decimals, canonicalization/digests, pack
verification, stable diagnostics, extension preservation, and all five Recipe
Calculus operations.

## Boundary after ADR-006

- The Pão and Fornada experiment worktrees are dirty and are not Schemami
  clean-clone release inputs.
- The Schemami repository owns Schemami schemas, Calculus, conformance vectors,
  and protocol diagnostics. It proves ADR-005 without a Pão checkout.
- The Pão repository owns any future adapter, application mappings, UI
  overlays, aggregate identity, and compatibility-report storage.
- Browser screenshots and executable adapter parity are Pão product evidence,
  never a Schemami v1 release gate.
