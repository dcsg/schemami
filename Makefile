TOOLCHAIN := ./tools/with-toolchain.sh

.PHONY: bootstrap toolchain-check sdk-resources go-sdk typescript-sdk validate conformance calculus viewer bundle cutover release-contract ci

bootstrap:
	bash tools/bootstrap.sh

toolchain-check:
	bash tools/schemami/check-toolchain.sh

sdk-resources:
	bash tools/schemami/check-sdk-resources.sh
	bash tools/schemami/check-swift-resources.sh

go-sdk:
	$(TOOLCHAIN) go -C sdk/go test -count=1 ./...

typescript-sdk:
	$(TOOLCHAIN) bun run --cwd sdk/typescript build
	$(TOOLCHAIN) bun test --cwd sdk/typescript

validate: schemami-schema schemami-canonical
	$(TOOLCHAIN) go -C tools/schemami run . validate ../../examples/pao-massa-mae.schemami.yaml
	$(TOOLCHAIN) go -C tools/schemami run . validate-bundle ../../examples/paodeportugal.schemami-bundle.json

conformance: schemami-calculus
	bash tools/schemami/check-quantity-vectors.sh
	bash tools/schemami/check-conversion-refusals.sh
	bash tools/schemami/check-local-entity-boundary.sh
	bash tools/schemami/check-evidence-boundary.sh
	bash tools/schemami/check-diagnostic-parity.sh

calculus: schemami-calculus

viewer:
	bash tools/schemami/check-viewer-boundary.sh
	$(TOOLCHAIN) bun run tools/viewer/build.ts
	bash tools/ci/dist-fresh-check.sh --build

bundle:
	bash tools/schemami/check-bundle-resolution.sh
	$(TOOLCHAIN) go -C tools/schemami run . validate-bundle ../../examples/paodeportugal.schemami-bundle.json

cutover:
	bash tools/schemami/check-clean-cutover.sh

release-contract:
	bash tools/schemami/check-release-contract-map.sh
	bash tools/schemami/check-candidate-scope.sh
	bash tools/schemami/check-publication-tree.sh

ci:
	bash tools/ci/run-gate-dag.sh

.PHONY: schemami-schema schemami-canonical schemami-calculus
schemami-schema:
	bash tools/schemami/check-schema-identity.sh

schemami-canonical:
	bash tools/schemami/check-canonical-wire.sh

schemami-calculus:
	bash tools/schemami/check-calculus.sh
