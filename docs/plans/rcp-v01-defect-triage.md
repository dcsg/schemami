# Defect triage — Phase 8 evidence protocol (AC-VAL-002-1/2)

## Pre-fix lint report (committed BEFORE any fix — AC-8.1)

Example file hashes at report time (end-of-P7 state):
```
98336cada5561655146e392b153d695650014c1106866c4954d7eded91622ca2  examples/alentejano.rcp.yaml
109f506cc395c27d5789c778315284a80852ff548783f2d7d53c2493d4a71c34  examples/other-categories.rcp.yaml
```

Lint errors on the unmodified examples:
```
LINT alentejano.rcp.yaml#pao-alentejano/massa-mae: ingredient "mm-seed" amount `of: mm-feed` references undeclared basis
LINT alentejano.rcp.yaml#pao-alentejano/massa-mae: ingredient "mm-flour" amount `of: mm-feed` references undeclared basis
LINT alentejano.rcp.yaml#pao-alentejano/massa-mae: ingredient "mm-agua" amount `of: mm-feed` references undeclared basis
LINT other-categories.rcp.yaml#negroni: guard combination {options: map[], mode: "batch"}: step "stir" depends on inactive step "build" — disconnected path (AC-VAL-002-3)
LINT other-categories.rcp.yaml#pasteis-de-nata: component "calda" is produced but never consumed — orphan intermediate
LINT other-categories.rcp.yaml#brownie-ganache: component "cobertura" pins version against target "ganache-chocolate" which declares no version
```

## Post-fix dispositions (AC-VAL-002-2 — each defect fixed or waived, none silent)

| # | Defect | Disposition |
|---|--------|-------------|
| 1 | `of: mm-feed` undeclared basis (alentejano/massa-mae) | **FIXED** — the 1:5:5 feed parts sum was referenced but never declared; `bases: { mm-feed: { sum: ingredients } }` added to the component. Zero information loss. |
| 2 | `calda` produced but never consumed (nata) | **FIXED** — the syrup joins the assembly step's `uses:`; it was always consumed in the real method, the document just never said so. |
| 3 | `version: 1` pin against unversioned ganache | **FIXED, with a core schema addition** — componentRef always pinned a version but no field existed for a document to declare one; core gains optional `version` (integer ≥1) and the ganache declares `version: 1`. Additive, pre-freeze. |
| 4 | **NEW (found by the linter, not in the research inventory):** negroni `stir` active in batch mode but depends on single-mode-only `build` | **FIXED** — `when: { execution_mode: single }` on the stir step; batch was never meant to stir. First proof of the guard-combination DAG check paying for itself. |

Full harness (L1 + L2 + CUE) green after all four fixes: `make validate` exits 0.
CUE-layer scope note: v0.1 checks amounts already expressed as ratios of a
basis; gram-to-basis resolution needs preferment decomposition — Recipe
Calculus work (FEAT-CALC-001), deliberately not faked.
