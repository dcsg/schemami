# BoK architecture review — RCP protocol architecture

- **Playbook**: `architecture-review`
- **Run ID**: `019fc270-0933-7ad8-96db-11bed71ca980`
- **Target**: RCP protocol architecture
- **Architecture type**: hexagonal/DDD published-language
- **Date**: 2026-08-02
- **Status**: analysis complete, **not stored** (gate held per task instructions — no `store_artifact` call made, run not marked completed)

Sources read: `docs/product/research/recipe-protocol/07-brainstorm-deep-dives.md` (§A, §D), `docs/product/research/recipe-protocol/DECISIONS.md`. No prior artifacts existed for this target (`get_prior_artifacts` returned empty — first analysis).

---

## Architecture description analyzed

RCP is the Published Language of a Recipe Catalog bounded context, shared with Execution (Kitchen), Registry, Ingestion, and Publishing/Heritage contexts. Two-layer validation (JSON Schema 2020-12 shape + CUE-flavoured semantic linter for DAG/reference/ratio/safety checks) runs BE/CI-side only; apps decode only, via quicktype-generated Swift Codable and TS types, plus a generated Zod validator at the Sanity CMS boundary. YAML is the git-reviewed human authoring surface, compiled to a canonical JSON envelope in CI. Sanity is Publishing-context infrastructure that emits RCP as JSON. Registries (IngredientClass/Product, StepPrimitive, EquipmentProfile, Units/Stages) are separately-versioned upstream documents. Publish resolves and embeds version-pinned component/registry references into self-contained offline snapshots. Execution sessions are separate append-only documents referencing recipe id+version, holding readings/actuals while the recipe holds only measurement *targets*. Three consumer stacks: TS (web/site), Swift (iOS, local-first SQLite via `RecipeSnapshot` ACL), Go/Postgres (API).

---

## Findings

### 1. Layer boundary violations — mostly clean, one soft violation

**Severity: info.** The design largely respects the Published Language / decode-only boundary: apps never validate, Execution never mutates Catalog recipes (snapshots at plan time via the existing iOS `RecipeSnapshot` ACL), Execution references Catalog by `recipe id + version` (identity-only reference, matching the DDD rule "reference other aggregates by identity only"). No control-flow violation (outer layer importing inner domain logic) is evident from the description.

**Soft violation**: the semantic linter (Layer 2) is described as living conceptually inside Catalog's CI, but it must read Registry documents directly to check "registry references (items, primitives, equipment) exist in the catalogs." That means Catalog's build pipeline has a direct, unmediated dependency on Registry's raw document shape rather than going through a stable interface. It is a *pull* integration (acceptable per DDD heuristic — pulling data beats sharing a database or synchronous calls), but it is still a context boundary crossed without an abstraction in between. See Finding 3.

### 2. Coupling — the codegen toolchain is more load-bearing than the schema itself

**Severity: warning.** `quicktype` sits on the critical path for two of three consumer stacks (Swift Codable + TS types). JSON Schema 2020-12 features the protocol needs for guard-combination modeling (`oneOf`, `if`/`then`/`else`, discriminated unions for variant/guard branches) do not always round-trip faithfully through quicktype into Swift `Codable` — known gaps exist around optionality, enum exhaustiveness, and conditional schemas. Because apps "never validate," a codegen fidelity bug produces documents that *decode successfully but wrongly* (e.g., a field silently becomes optional-when-it-shouldn't, or a discriminated union collapses to the wrong case), with no validation layer downstream to catch it. The codegen step has effectively become as load-bearing as the schema contract, but nothing in the description mentions a round-trip/golden-fixture test verifying "for schema example X, quicktype's Swift and TS output decode to the same logical value the schema author intended."

Also unclear: **which of the three stacks is the write-time enforcement point?** Decision 8 says validation runs "BE/CI-side only" — presumably meaning the Go/Postgres API is the actual write-time gate, with web and iOS as pure read/decode clients. This should be an explicit, named invariant ("Go API is the only write path; all other writes go through it"), not an implicit consequence of the prose — otherwise a future contributor could add a write path (e.g., a web-based authoring UI) that bypasses Layer 1/2 validation entirely.

### 3. Missing abstraction layer — no port between the linter and Registry

**Severity: warning.** Unlike Ingestion→Catalog (explicit ACL via `ImportDraft` + `unverified` status gate) and Execution→Catalog (explicit ACL via `RecipeSnapshot`), there is no described abstraction between the Layer 2 linter and Registry's document store. Recommend a thin `RegistryLookup` port ("given class/primitive/equipment id + version, does it exist and what's its current status") that the linter depends on, rather than depending on Registry's file/document layout directly. This keeps a future Registry storage change (e.g., moving registries from YAML files to Sanity too) from touching linter code.

**Severity: warning — missing compatibility abstraction for offline decode.** Nothing in the description names an explicit mechanism for the exact failure mode SPEC-008 already worries about ("data outlives code"): an iOS app installed years ago, holding self-contained offline snapshots, encountering a recipe published under a later schema revision, or vice versa. Kleppmann's backward/forward-compatibility framing applies directly and is unaddressed as a named mechanism:
- **Forward compatibility** (old app code reading data written by a newer schema): requires quicktype-generated Swift types to tolerate unknown fields and unknown enum cases by default. Swift `Codable` enums are *not* forward-compatible out of the box — an unrecognized case throws a decode error unless every generated enum has a catch-all `.unrecognized(String)` case. This needs to be an explicit codegen convention, not an assumption.
- **Backward compatibility** (new app code reading old snapshots frozen at an old schema/registry version): requires the protocol rule "never add a required field without a default" to be enforced mechanically (e.g., a Layer 1 CI check diffing schema versions), not just followed by discipline.

Neither direction is called out as a tested, gated mechanism in the current description — this is the single highest-value abstraction missing from the design, precisely because it's the one failure mode that can't be fixed after the fact (frozen, immutable, offline documents, per the project's own "data outlives code" principle in `notes` / SPEC-008).

### 4. Deployment risks

**Severity: warning — CUE toolchain bus factor compounds an already-solo-maintainer project.** DECISIONS.md #8 already self-flags "accepted risk: CUE is niche tooling," which is good practice, but the review should make the compounding risk explicit: this is a single-maintainer project (per project context) adding a second specialized, low-adoption dependency (CUE) on top of an already-thin bus factor. Because the linter is described as running "in CI on YAML sources **and at API write time**," a CUE toolchain break (Go-version incompatibility, upstream breaking release, or simply the maintainer forgetting CUE syntax after months away) can block *publishing entirely* — not a degraded-mode failure, a hard stop. Given the doc's own analysis (§A) already shows the DAG/reference/cycle checks are "ordinary code," consider narrowing CUE's scope to literally only the constraints that are awkward in general-purpose code (ratio bounds, field relations) and keeping a documented fallback: those same constraints re-expressed as plain Go/TS assertions, so CUE can be dropped without touching the recipe corpus if it ever becomes unmaintainable.

**Severity: warning — publish-time reference resolution is an unrecoverable single point of failure.** Because resolved snapshots are immutable and offline-first ("data outlives code," no server round-trip to fix things later), a bug in the resolver that embeds a wrong-but-schema-valid value at publish time ships silently and is *permanently* wrong for every device that already synced that snapshot. This is the one component in the whole architecture where a defect is irreversible by design. Recommend: (a) embed a `resolver_version` + content hash of each resolved reference in the snapshot envelope, so a later audit can identify "snapshots built by resolver v1.2, which had bug X" and trigger a republish; (b) treat the resolver as the most heavily tested component in the system, disproportionate to its LOC, precisely because its failures are the least recoverable ones.

**Severity: info — Sanity CMS schema drift.** Sanity's own content schema must track RCP's JSON Schema; a new required RCP field needs a coordinated Sanity schema migration, and existing draft content in Sanity may not conform. Since this is vendor infrastructure outside the org's release cadence, recommend explicitly validating Sanity's emitted JSON against Layer 1 before treating it as trusted RCP — i.e., Sanity is a producer like any other, not a privileged source that's assumed correct because "it's the CMS."

### 5. Scalability bottlenecks — schema evolution, registry skew, unbounded resolution

**Severity: warning — schema-evolution risk across offline iOS clients** (asked for explicitly). Combines Findings 2 and 3: quicktype-generated Swift types must be both forward-tolerant (new schema, old app) and the protocol must guarantee backward-compatible reads (old snapshot, new app) — see Finding 3 for the concrete mechanisms missing. Recommend a CI gate that runs the *previous N schema versions'* fixture documents through the *current* generated decode types (and vice versa: current fixtures through an old, pinned decoder) as an explicit compatibility test, not just a shape-validity test.

**Severity: warning — registry/schema version skew has no visibility mechanism.** Recipes pin Registry entries by id+version, embedded permanently at publish. But nothing describes how to find "which published recipes reference `flour.wheat.T65@v2` " when v2 turns out to be wrong (mislabeled, needs correction). Without a registry-usage index, a Registry correction has no way to assess downstream impact, and the "closed to invention, open for growth" governance model (DECISIONS.md, §B6 in the deep-dive) has no feedback loop back to already-published content. Recommend a lightweight reverse-index (recipe-version → registry-refs used) maintained at publish time, even if it's just a derived table, not part of the protocol itself.

**Severity: info — unbounded publish-time resolution depth/size.** The linter already checks component references for existence, publication status, and cycles (per §A) — good — but nothing caps resolution *depth* or resulting *snapshot size* when components reference components reference components. As the shared-component graph grows, self-contained snapshots could grow superlinearly, working against the "self-contained, offline-decodable on mobile" goal. Recommend a soft depth/size cap enforced by the linter, symmetric to the existing "max 3 options per recipe" cap mentioned for guard combinatorics (§B5).

---

## What's working well (worth naming, not just risks)

- **Execution as a separate bounded context is correctly justified**, not just asserted: different lifecycle (immutable-versioned vs. append-only), different invariants, different consistency needs. This matches the DDD trap-avoidance heuristic "avoid dissecting an aggregate into two different bounded contexts" — Execution and Catalog were never one aggregate to begin with, so no dissection occurred.
- **The iOS `RecipeSnapshot`/`payloadJSON` pattern is a textbook ACL that already existed before this exercise** — strong evidence the boundaries are real rather than academically imposed.
- **Registry-by-identity-and-version reference** (not embedding-by-default, resolved only at publish) matches the DDD rule "reference other aggregates by identity only" and keeps Registry's own evolution decoupled from Catalog's day-to-day authoring.
- **Two-layer validation with clearly separated concerns** (shape vs. semantics) matches the pattern the docs cite from BeerJSON and is consistent with how Kleppmann and the API-design literature describe schema evolution: additive-safe Layer 1, explicit-versioned Layer 2.

---

## Recommendations

| Priority | Action | Rationale |
|---|---|---|
| high | Define and test an explicit forward/backward decode-compatibility contract for offline iOS snapshots (unknown-field tolerance, catch-all enum cases in codegen, no-new-required-fields-without-default as a CI-enforced rule) | This is the one class of bug that can't be fixed post-hoc, per the project's own "data outlives code" principle; currently unaddressed as a named, tested mechanism |
| high | Add a `resolver_version` + reference content-hash to the publish-time snapshot envelope, and prioritize test coverage on the reference-resolution pipeline above all other components | Resolution bugs ship silently, are schema-valid, and are permanent on already-synced offline devices |
| medium | Introduce a `RegistryLookup` port between the semantic linter and Registry's document store instead of a direct file/document dependency | Keeps a future Registry storage change from touching linter code; mirrors the ACL pattern already used elsewhere (Ingestion, Execution) |
| medium | Narrow CUE's scope to only the constraints general-purpose code handles awkwardly (ratio bounds, field relations), and keep a documented plain-code fallback for those same constraints | Reduces compounding bus-factor risk for a solo-maintainer project; CUE outage currently blocks publishing entirely, not just degrades it |
| medium | Add a registry-usage reverse-index (recipe-version → registry-refs used), even as a derived/non-protocol artifact | Without it, a Registry correction has no way to assess downstream impact on already-published, immutable recipes |
| medium | Make explicit (as an ADR/invariant, not implicit prose) which single stack is the write-time Layer 1/2 enforcement point (presumably Go/Postgres API), and that all other write paths must route through it | Prevents a future authoring surface from bypassing validation by accident |
| low | Add golden round-trip fixtures verifying quicktype's Swift and TS output decode schema examples identically, especially for `oneOf`/`if-then-else`/discriminated-union guard constructs | Codegen fidelity is now as load-bearing as the schema itself, since apps never validate independently |
| low | Cap publish-time reference-resolution depth/snapshot size, symmetric to the existing "max 3 options per recipe" guard-combinatorics cap | Keeps self-contained snapshots practical for mobile storage/decode as the shared-component graph grows |
| low | Validate Sanity's emitted JSON against Layer 1 schema before treating it as trusted RCP, rather than assuming CMS output is correct by virtue of its source | Sanity's release cadence is outside the org's control; treat it as a producer like any other |

---

## Concepts and heuristics consulted

- `get_concept_synthesis`: Bounded Context, Aggregate, Dependency Inversion, Hexagonal Architecture, Ports and Adapters, Clean Architecture layers (not found in KB)
- `search_bok`: published language schema evolution/versioning/coupling; anti-corruption layer + offline-first schema migration for mobile clients; generated code multi-language-target consistency drift; reference resolution/embedding at publish time and inter-context coupling
- `search_heuristics`: no direct hits for "schema versioning breaking changes distributed consumers," "bus factor tooling risk," "niche tooling dependency risk," "code generation shared schema types across languages" — heuristics search came up empty on these queries; synthesis + search_bok results were used instead
- Key sources drawn on: *Domain-Driven Design* (Evans) — Published Language, aggregate reference-by-identity, splinter recognition; *Strategic Monoliths and Microservices* (Vernon) — Published Language forms, schema registries, decoupling by identity reference; *Designing Data-Intensive Applications* (Kleppmann) — Encoding and Evolution chapter, backward/forward compatibility, "data outlives code"; *Patterns for API Design* (Wahner) — versioning/compatibility management; *Building Evolutionary Architectures* (Ford) — evolving schemas, fitness functions

---

## Ready to store (gate held — do not execute)

The gate instruction says: do not call `store_artifact`, do not mark the run completed. The exact call that *would* store this analysis, if and when the gate is lifted, is:

```json
{
  "tool": "mcp__bok__store_artifact",
  "input": {
    "artifact_type": "architecture-review",
    "target": "RCP protocol architecture",
    "team": "software-architect",
    "playbook_run_id": "019fc270-0933-7ad8-96db-11bed71ca980",
    "summary": "RCP as Published Language of the Recipe Catalog context is soundly bounded (Execution/Registry/Ingestion separation holds up under DDD scrutiny, existing iOS RecipeSnapshot is a genuine ACL). Highest risks are operational, not structural: no named forward/backward decode-compatibility contract for immutable offline iOS snapshots, an unrecoverable single point of failure in the publish-time reference-resolution pipeline, a CUE toolchain that compounds solo-maintainer bus factor, and no visibility mechanism for registry/schema version skew across already-published recipes.",
    "findings": [
      {"area": "layer-boundaries", "severity": "info", "detail": "Design largely respects decode-only/Published Language boundaries; soft violation is the Layer 2 semantic linter reading Registry documents directly without a mediating abstraction."},
      {"area": "coupling", "severity": "warning", "detail": "quicktype codegen is load-bearing for two of three consumer stacks; JSON Schema 2020-12 constructs used for guard/variant modeling (oneOf, if/then/else) do not always round-trip faithfully to Swift Codable, and apps never independently validate, so codegen bugs produce silently-wrong-but-decodable documents. Also unclear which single stack is the write-time enforcement point."},
      {"area": "missing-abstraction", "severity": "warning", "detail": "No RegistryLookup port between the linter and Registry's document store, unlike the explicit ACLs already present for Ingestion and Execution."},
      {"area": "missing-abstraction", "severity": "warning", "detail": "No named forward/backward decode-compatibility mechanism for offline iOS snapshots against schema evolution: unknown-field/unknown-enum-case tolerance and no-new-required-fields-without-default are assumed, not tested or mechanically enforced."},
      {"area": "deployment-risk", "severity": "warning", "detail": "CUE toolchain is a second niche dependency compounding an already-solo-maintainer bus factor; it sits on the critical path for both CI linting and API write-time validation, so a toolchain break is a hard publish stop, not a degradation."},
      {"area": "deployment-risk", "severity": "warning", "detail": "Publish-time reference-resolution pipeline is an unrecoverable single point of failure: bugs ship silently as schema-valid documents permanently embedded in immutable offline snapshots already synced to devices."},
      {"area": "deployment-risk", "severity": "info", "detail": "Sanity CMS schema must track RCP's JSON Schema on a vendor release cadence outside org control; emitted JSON should be validated against Layer 1 rather than trusted by source."},
      {"area": "scalability", "severity": "warning", "detail": "Schema-evolution risk across offline iOS clients is the compounded effect of the codegen and compatibility-contract gaps above; needs an explicit bidirectional compatibility test suite, not just shape validation."},
      {"area": "scalability", "severity": "warning", "detail": "No registry-usage reverse-index exists, so a Registry correction cannot assess downstream impact on already-published, immutable recipes referencing the corrected version."},
      {"area": "scalability", "severity": "info", "detail": "Publish-time reference-resolution has no described depth/size cap, risking superlinear snapshot growth as the shared-component graph deepens, working against the self-contained-offline-mobile goal."}
    ],
    "recommendations": [
      {"priority": "high", "action": "Define and CI-test an explicit forward/backward decode-compatibility contract for offline iOS snapshots (unknown-field tolerance, catch-all enum cases in codegen, no-new-required-fields-without-default enforced mechanically).", "rationale": "This is the one class of bug that can't be fixed post-hoc given the project's own 'data outlives code' principle; currently unaddressed as a named, tested mechanism."},
      {"priority": "high", "action": "Add a resolver_version plus reference content-hash to the publish-time snapshot envelope, and prioritize test coverage on the reference-resolution pipeline above all other components.", "rationale": "Resolution bugs ship silently, are schema-valid, and are permanent on already-synced offline devices."},
      {"priority": "medium", "action": "Introduce a RegistryLookup port between the semantic linter and Registry's document store instead of a direct file/document dependency.", "rationale": "Mirrors the ACL pattern already used for Ingestion and Execution; keeps a future Registry storage change from touching linter code."},
      {"priority": "medium", "action": "Narrow CUE's scope to only the constraints general-purpose code handles awkwardly, keeping a documented plain-code fallback for the same constraints.", "rationale": "Reduces compounding bus-factor risk for a solo-maintainer project; a CUE outage currently blocks publishing entirely rather than degrading it."},
      {"priority": "medium", "action": "Add a registry-usage reverse-index (recipe-version to registry-refs used), even as a derived/non-protocol artifact.", "rationale": "Without it, a Registry correction has no way to assess downstream impact on already-published, immutable recipes."},
      {"priority": "medium", "action": "Make explicit as an ADR/invariant which single stack is the write-time Layer 1/2 enforcement point, and that all other write paths must route through it.", "rationale": "Prevents a future authoring surface from bypassing validation by accident."},
      {"priority": "low", "action": "Add golden round-trip fixtures verifying quicktype's Swift and TS output decode schema examples identically, especially for oneOf/if-then-else/discriminated-union guard constructs.", "rationale": "Codegen fidelity is now as load-bearing as the schema itself, since apps never validate independently."},
      {"priority": "low", "action": "Cap publish-time reference-resolution depth/snapshot size, symmetric to the existing max-3-options-per-recipe guard-combinatorics cap.", "rationale": "Keeps self-contained snapshots practical for mobile storage/decode as the shared-component graph grows."},
      {"priority": "low", "action": "Validate Sanity's emitted JSON against Layer 1 schema before treating it as trusted RCP.", "rationale": "Sanity's release cadence is outside org control; treat it as a producer like any other, not a privileged source."}
    ],
    "concepts_used": ["Bounded Context", "Aggregate", "Dependency Inversion", "Hexagonal Architecture", "Ports and Adapters"],
    "syntheses_used": ["Bounded Context", "Aggregate", "Dependency Inversion", "Hexagonal Architecture", "Ports and Adapters"]
  }
}
```
