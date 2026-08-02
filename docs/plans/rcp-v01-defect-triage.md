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
