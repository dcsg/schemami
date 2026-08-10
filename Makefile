# RCP v0.1 — single validation entry point (SR-VAL-001/DS-VAL-005).
# L1 (shape) → L2 (semantic lint) → CUE (declarative bounds, DS-VAL-003).

CUE ?= $(shell command -v cue 2>/dev/null || echo $(HOME)/go/bin/cue)
FACTS_TEMP := $(shell mktemp -t rcp-facts.XXXXXX)
FACTS := $(FACTS_TEMP).json

.PHONY: validate
validate:
	cd tools/rcplint && go run . validate ../..
	cd tools/rcplint && go run . lint ../..
	cd tools/rcplint && go run . facts ../.. > $(FACTS) && ( $(CUE) vet ../../schema/constraints/bounds.cue $(FACTS) && echo "CUE VET GREEN" && python3 scripts/explain-bounds.py --advisories $(FACTS) && rm -f $(FACTS) $(FACTS_TEMP) || ( python3 scripts/explain-bounds.py $(FACTS); rm -f $(FACTS) $(FACTS_TEMP); exit 1 ) )

.PHONY: accept
accept:
	bash tools/rcplint/scripts/accept.sh

.PHONY: conformance
conformance:
	cd tools/rcplint && go run . vectors ../.. ../viewer/conformance/vectors
	cd tools/viewer && mise exec -- bun install --frozen-lockfile && mise exec -- bun test

.PHONY: calculus
calculus:
	cd tools/rcplint && go run . calc-vectors ../.. ../../calculus/vectors
	cd tools/rcplint && go test -count=1 -run 'TestCalcCoverage|TestCalcVectors|TestWE|TestSpec|TestR_' ./...
	cd tools/viewer && mise exec -- bun install --frozen-lockfile && mise exec -- bun test conformance/calculus-replay.test.ts

.PHONY: resolve
resolve:
	cd tools/rcplint && go run . resolve ../.. --reconcile
