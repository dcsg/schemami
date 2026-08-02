# RCP v0.1 — single validation entry point (SR-VAL-001/DS-VAL-005).
# L1 (shape) → L2 (semantic lint) → CUE (declarative bounds, DS-VAL-003).

CUE ?= $(shell command -v cue 2>/dev/null || echo $(HOME)/go/bin/cue)
FACTS := $(shell mktemp -t rcp-facts).json

.PHONY: validate
validate:
	cd tools/rcplint && go run . validate ../..
	cd tools/rcplint && go run . lint ../..
	cd tools/rcplint && go run . facts ../.. > $(FACTS) && $(CUE) vet ../../schema/constraints/bounds.cue $(FACTS) && echo "CUE VET GREEN" && rm -f $(FACTS)

.PHONY: accept
accept:
	bash tools/rcplint/scripts/accept.sh
