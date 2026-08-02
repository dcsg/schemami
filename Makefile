# RCP v0.1 — single validation entry point (SR-VAL-001/DS-VAL-005).
# L2 (lint) and CUE join this target in Phase 8.

.PHONY: validate
validate:
	cd tools/rcplint && go run . validate ../..
