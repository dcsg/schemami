# Schemami v1.0.0 pre-tag checklist

**Release date:** 2026-08-15  
**Target tag:** `v1.0.0`  
**Publication shape:** one public root commit  
**Rule:** do not create or push the stable tag until every required item below is checked from the exact release commit.

## 1. Public source identity

- [ ] The public `main` branch contains exactly one root commit.
- [ ] The root commit subject is `Schemami v1.0.0 — 2026-08-15`.
- [ ] The root commit author and committer dates are 2026-08-15 in Europe/Lisbon.
- [ ] The complete previous history remains available only through the local branch `archive/pre-public-history-2026-08-15` and a separately verified local Git bundle.
- [ ] No remote branch, tag, release, pull-request ref, or release asset intentionally exposes the predecessor history.
- [ ] The repository is public and its license, security policy, contribution boundary, and supported-version policy are visible.

## 2. Version and date consistency

- [ ] TypeScript package version is `1.0.0` and it is no longer marked private.
- [ ] Go, Swift, and TypeScript changelogs contain `1.0.0 — 2026-08-15` entries.
- [ ] README, status, feature, roadmap, SDK, AI, and website pages describe a stable public v1 release rather than a private prerelease or release candidate.
- [ ] Historical documents retain their real historical dates and are clearly non-current; they are not mechanically rewritten to the release date.
- [ ] No active installation example or release document refers to `v1.0.0-rc.0`.
- [ ] Schema model markers remain `schemami: "1"`; package/tag versioning remains SemVer `1.0.0`.

## 3. Normative artifacts and immutable URLs

- [ ] Core and bundle schemas use their final `https://schemami.dev/schema/schemami/1/...` identities.
- [ ] All six conformance corpora are byte-identical across the authority tree and SDK copies.
- [ ] The contract map contains every normative schema, corpus, and stable problem URI.
- [ ] Human-readable pages exist for all 18 currently emitted problem codes:
  `ambiguous-unit`, `dependency-cycle`, `dimension-mismatch`,
  `duplicate-object-member`, `inactive-reference`, `invalid-decimal`,
  `invalid-document`, `invalid-json`, `invalid-operation-arguments`,
  `invalid-reference`, `missing-fact`, `missing-producer`,
  `multiple-producers`, `relative-timing-conflict`, `resource-limit`,
  `unknown-unit`, `unresolved-reference`, `unsupported-legacy`, and
  `unsupported-quantity-kind`.
- [ ] The publication-tree check derives its expected route/file count from the contract map instead of a stale hard-coded count.
- [ ] The versioned release manifest is generated from the final root commit, records its exact tree/commit identity and artifact digests, and is not copied from the previous candidate output.
- [ ] Every manifest URL resolves over HTTPS with the declared media type and exact SHA-256 bytes.

## 4. Documentation website

- [ ] The RCP-era documentation spike is not deployed as the Schemami website.
- [ ] The accepted site is built from current Schemami v1 sources and uses Schemami branding and terminology throughout.
- [ ] The landing page clearly offers two supported entry paths: use Schemami directly with a user-selected AI, or integrate through an SDK.
- [ ] Current pages cover: quick start, recipe document model, bundles, all six Calculus operations, Diff, problems, conformance, AI conversion, and Go/TypeScript/Swift installation.
- [ ] The direct-AI guide links to a downloadable immutable schema and explains deterministic admission/repair.
- [ ] The SDK pages contain tested copy-paste installation and minimal admission examples.
- [ ] The validator/playground runs against the exact released TypeScript SDK and does not claim that AI output is automatically valid.
- [ ] Internal links, anchors, canonical URLs, language metadata, accessibility, responsive layout, and not-found behavior pass automated and browser checks.
- [ ] Cloudflare deployment is GitHub-controlled; no manual upload is required.
- [ ] A preview of the exact release commit is reviewed before the stable tag is created.

## 5. SDK distribution

- [ ] `@schemami/sdk@1.0.0` is ready for npm trusted publishing and its tarball contents, license, notices, exports, declarations, and provenance are verified.
- [ ] The Go module is consumable from the public repository with the correct submodule tag `sdk/go/v1.0.0` and a clean external-consumer test.
- [ ] SwiftPM has an approved public package URL whose `Package.swift`, products, resources, dependency locks, platform minimums, license, and exact tag work from a disposable consumer.
- [ ] TypeScript, Go, and Swift replay the shared validation, canonicalization, calculus, structured-calculus, resource-budget, and Diff corpora.
- [ ] Package documentation keeps application mappings, provider credentials, OCR, storage, and presentation policy outside the SDKs.

## 6. AI conversion kit

- [ ] `/ai` is the current human/AI bootstrap and `/ai/v1` is an immutable,
  digest-pinned workflow for Schemami wire model `1`.
- [ ] The direct-AI workflow works using only a recipe source, the immutable core schema, and the published prompt.
- [ ] The minimal interview asks only about illegible, materially ambiguous, or
  required facts; accepts honest unresolved answers; and never asks the user to
  guess.
- [ ] The prompt preserves source-language facts, forbids invention, treats source instructions as data, and does not claim conformance.
- [ ] The deterministic repair loop uses stable problem types and RFC 6901 pointers.
- [ ] Markdown and HTML recipe previews keep the exact JSON authoritative; the
  self-contained template labels candidates unverified and has no network,
  storage, inference, or validation behavior.
- [ ] `bash tools/acquisition-harness/check-ai-kit.sh` passes from the exact
  release commit and verifies every kit/dependency digest.
- [ ] The optional source-to-candidate request/report/repair contract and examples validate against their published schemas.
- [ ] Documentation states that Schemami hosts no model, OCR, recipe database, user source, or provider credentials.

## 7. Verification and release

- [ ] Secret, private-data, generated-cache, personal-path, and license scans pass on the exact public tree.
- [ ] `make ci` passes from a clean clone with the locked mise/Bun/Go toolchain.
- [ ] Swift release build/tests pass on the pinned Xcode/Swift environment.
- [ ] Disposable npm, Go, and Swift consumers pass without access to the development checkout.
- [ ] The generated website and release artifacts are reproducible from the exact root commit.
- [ ] GitHub Actions is green for the exact root commit.
- [ ] Pao de Portugal and Fornada evidence is pinned to that commit or explicitly recorded as a non-blocking post-release adoption task.
- [ ] Daniel reviews this completed ledger and explicitly approves stable tagging.
- [ ] Only then create and push `v1.0.0`, publish packages, publish immutable HTTPS artifacts, and create the stable GitHub release.
