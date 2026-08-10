# Competitive audit: RCP, Cooklang, Cookpit and Soustack

**ProductResearcher working report · 10 August 2026**<br>
**Scope:** product, protocol, implementation, ecosystem, governance and positioning<br>
**Evidence cutoff:** 10 August 2026; repository and ecosystem counts are time-sensitive

> **Bottom line:** RCP has credible technical differentiation, but not yet credible market differentiation. It is deeper than the three alternatives in deterministic recipe computation, authored transformation constraints, category-aware semantics, provenance and lineage. Soustack is nevertheless a very close architectural competitor; Cooklang is far ahead in authoring experience and ecosystem; Cookpit tells a much clearer AI-ingestion-to-trusted-execution story. RCP's next release should concentrate on licensing, public documentation, SDKs, mappings and real integrations—not more protocol surface.

## Executive decision

RCP should continue, but its public category and promise need to become narrower and more defensible.

The recommended category is **executable recipe protocol**. The recommended promise is:

> **Model the method. Compute without guessing.**

The longer positioning statement is:

> RCP is an executable recipe protocol for software that must preserve a recipe's method, constraints and provenance while adapting it. Unlike prose-first recipe markup or shallow interchange schemas, RCP defines deterministic calculation, category-aware validation and explicit refusal semantics.

This is supportable by the repository today, with three qualifications:

1. “Category-aware” currently means three hardened profiles and five draft profiles, not proven coverage of every recipe category.
2. “Safe” means a transformation stays inside authored, machine-checkable constraints; it does not mean general food-safety certification.
3. “Protocol” is accurate as a product category. “Open standard” is not accurate until the project has a license, governance, a stable public namespace and independent implementation evidence.

## The competitive answer in one table

| If the job is… | Best current fit | Why |
|---|---|---|
| Write and maintain recipes as pleasant plain text | **Cooklang** | Its `.cook` syntax keeps ingredients, cookware and timers inside readable prose, with editors, parsers and applications already available. |
| Add progressively stronger structured-recipe capabilities to web and JavaScript products | **Soustack** | Its Schema.org bridge, small JSON envelope, capability stacks, profiles and npm runtime reduce adoption friction. |
| Convert source material with an LLM into an authenticated live-cooking plan | **Cookpit** | Its product is explicitly designed around generation, staged validation, source fingerprints, signatures, alarms and a prescribed execution model. |
| Build an application that must calculate complex transformations consistently and refuse unsupported ones | **RCP** | RCP has the deepest normative calculus, authored constraints, basis resolution, scheduling vectors, category profiles and provenance/lineage model in this comparison. |

The projects are adjacent, not interchangeable. Cooklang is primarily an authoring language and ecosystem. Cookpit is an opinionated generation and live-execution contract. Soustack and RCP are the closest direct competitors.

## What was audited

### RCP

The audit inspected the repository's schemas, profiles, registries, examples, PRDs, roadmap, decisions, Go validator and calculus, TypeScript viewer engine, conformance vectors, documentation prototype and git history. It also ran the available local verification commands.

### External projects

Only first-party material was used for technical claims:

- [Cooklang specification](https://cooklang.org/docs/spec/), [developer documentation](https://cooklang.org/docs/for-developers/), [CLI documentation](https://cooklang.org/cli/commands/) and the official [Cooklang GitHub organization](https://github.com/cooklang).
- [Cookpit v3.2 reference](https://cookpit.org/v3.2/reference/), [AI conversion workflow](https://cookpit.org/v3.2/ai/), [JSON Schema](https://cookpit.org/v3.2/schema.json) and [rules](https://cookpit.org/v3.2/rules).
- [Soustack website](https://soustack.org/), [specification repository](https://github.com/RichardHerold/soustack-spec), [core runtime](https://github.com/RichardHerold/soustack-core), [conformance runner](https://github.com/RichardHerold/soustack-conformance) and [ingestion tooling](https://github.com/RichardHerold/soustack-ingest).
- [Schema.org Recipe](https://schema.org/Recipe) as the shared web baseline used by Cookpit and Soustack.

Public claims were compared with actual schemas and code where source was reachable. Marketing copy alone was not treated as proof of implementation or adoption.

## RCP's current evidence baseline

### What is demonstrably shipped

The repository tags and roadmap record v0.1 through v0.4 as shipped. The current implementation contains:

| Surface | Audited state |
|---|---|
| Core model | JSON Schema 2020-12 with 34 top-level properties and 30 reusable definitions |
| Category profiles | 8 total: bread, pastry, dish, component, ferment, preserve, drink and coffee |
| Profile maturity | Bread and pastry hardened with category semantics; dish technically hardened but closed-empty from two documents; 5 profiles explicitly draft |
| Governed registry | 109 entries: 61 ingredients, 24 primitives, 14 techniques and 10 equipment entries |
| Corpus | 9 recipe documents represented across 8 files |
| Recipe Calculus | Scaling, basis resolution, guard selection, constraints, minimum-batch floors, fixed-quantity transforms, duration re-estimation, reading order, interleaving and scheduling |
| Conformance | 10 vector groups containing 23 test cases |
| Reference tooling | Go validator/calculus and CLI; TypeScript viewer implementation |
| Distribution model | Recipe documents, collections/packs, verified references, revisions, lineage and variants |
| Trust model | Provenance, source disagreement, media licensing, publish-time reference resolution and deterministic canonical JSON |

The implementation is more than a schema. Its strongest asset is the combination of a domain model with executable, replayable behavior.

### Verification performed for this audit

- `go test ./...` passed for all packages under `tools/rcplint` with an isolated Go cache.
- Level-one schema validation passed over the local recipe corpus and all 109 registry entries.
- Semantic lint returned **0 errors and 3 warnings**: unresolved `carne`, unresolved `pao-ralado`, and an unanchored `roux`.
- The aggregate validation command could not complete because the expected local `cue` binary was not installed at the configured path.
- Viewer tests were not rerun because the viewer's dependencies were not installed in this worktree.

The honest status is therefore **core Go tests green; aggregate repository validation partially re-verified**, not a blanket “all checks passed.”

### Public-readiness gaps

These are material protocol risks:

1. **No project license was found.** Code can be visible without being legally reusable. This blocks an “open source” or “open standard” claim.
2. **Canonical schema IDs still use `https://rcp.invalid/`.** The repository documents this correctly as a placeholder, but public consumers need permanent, resolvable identifiers.
3. **The public documentation release is not deployed.** PRD-005 correctly identifies that an external implementer cannot yet understand or use the protocol without cloning the repository.
4. **There is no packaged SDK.** The Go implementation and TypeScript viewer engine are useful internals, but neither is yet presented as a stable, versioned integration product.
5. **There is no independent adopter.** Pão de Portugal and the iOS micro-bakery application are valuable dogfood, but both are founder-controlled.
6. **The evidence corpus is small.** Nine documents and three hardened profiles do not demonstrate “any recipe from any archetype.”
7. **Strategy documents disagree.** The founder interview establishes a developer-first protocol, while older material sometimes calls RCP consumer-first or frames integration as post-v1. Public positioning and the roadmap need one source of truth.

## Shared baseline: Schema.org Recipe

Schema.org is not a full computational recipe protocol, but it is the web's default vocabulary baseline. Its `Recipe` type provides ingredients, instructions, yield, time, nutrition, cuisine, category and diet fields. Ingredients and instructions may still be free text, and it does not define interoperable scaling, scheduling, constraint enforcement or culinary registries. Its own usage page reports the type on tens of thousands of domains, making compatibility strategically valuable even when its semantics are insufficient for RCP's goals. See [Schema.org Recipe](https://schema.org/Recipe).

Cookpit uses JSON-LD and Schema.org as its vocabulary base. Soustack explicitly describes itself as an “intelligence layer” above Schema.org. RCP currently chooses a purpose-built strict domain model. That produces deeper semantics but raises migration cost.

The implication is not that RCP should replace its core with Schema.org. It should provide a documented, tested **Schema.org import/export boundary** so integrators can enter and leave the protocol without rewriting their entire content pipeline.

## Competitor deep dive: Cooklang

### Product thesis

[Cooklang](https://cooklang.org/) is a human-readable recipe markup language. A recipe remains prose, while `@ingredients`, `#cookware` and `~timers` become machine-addressable. YAML front matter holds metadata. Sections, inline preparation, referenced recipes and scaling conventions add structure without turning authoring into form filling.

The most important strategic fact is that Cooklang has made the recipe file itself pleasant to own. RCP has not yet solved authoring; it has solved representation and computation.

### Technical and ecosystem evidence

- The language has a published [specification](https://cooklang.org/docs/spec/) and canonical parser cases.
- The official Rust implementation adds rich errors, unit conversion, scaling and extensions such as intermediate preparations and ranges in [cooklang-rs](https://github.com/cooklang/cooklang-rs).
- [CookCLI](https://github.com/cooklang/cookcli) supports rendering, scaling, shopping lists, search, a local server, static-site generation, AI import, pantry and reports.
- The [Cooklang organization](https://github.com/cooklang) contains parsers or integrations across Rust, JavaScript, Go, Python, Swift and TypeScript, plus editors, an Obsidian plugin and applications.
- At the audit date, the official organization showed materially more public activity and attention than the other projects in this comparison. Star counts are not adoption metrics, but they are evidence of community reach.
- The specification and primary implementations use the MIT license.

### Where Cooklang leads RCP

1. **Author experience.** A `.cook` file is approachable, diffable and useful without an application.
2. **Ecosystem and memory.** The syntax, “Cooklang” name and visible tools form a coherent category.
3. **Language coverage.** Multiple independent parsers are a stronger interoperability signal than two implementations maintained inside one project.
4. **Immediate utility.** The CLI and apps turn the format into meals, shopping lists and sites without requiring integrators to build the first useful surface.
5. **Legal and community clarity.** MIT licensing and public contribution paths make experimentation low-risk.

### Where RCP leads Cooklang

1. **Domain semantics.** RCP models bases, role-tagged ingredients, components, category profiles, execution modes, substitutions, constraints and provenance as protocol concepts.
2. **Normative computation.** RCP defines and tests a broader deterministic calculus. Cooklang scaling is useful but intentionally simpler; unit-based yield scaling remains marked experimental in the specification.
3. **Safety refusal.** RCP can carry authored bounds and reasons, then refuse a transform. Cooklang is not designed as a safety-constrained computation contract.
4. **Identity and lineage.** RCP collections, revisions, verified references, variants and publish-time resolution are substantially deeper.
5. **Governed vocabulary.** RCP's registry provides stable culinary identities and multilingual labels rather than relying primarily on author text.

### Risk to RCP

Cooklang is not the closest schema competitor, but it can make a deeper protocol irrelevant by winning the authoring and community layer. If an app team can import Cooklang and implement the small amount of computation it needs, RCP's additional rigor may look like cost rather than value.

### Recommended relationship

Treat Cooklang as a source and authoring companion, not an enemy format. Publish a converter with an explicit loss report:

- Cooklang → RCP can preserve prose, ingredients, cookware, timers, sections and most metadata.
- RCP → Cooklang must declare which constraints, provenance, lineage, profiles and calculus semantics cannot be represented.

Do not create an RCP-specific prose syntax before observing real authoring friction in the first integrations.

## Competitor deep dive: Cookpit

### Product thesis

[Cookpit v3.2](https://cookpit.org/v3.2/reference/) is an LLM-first JSON-LD format and production pipeline. The user attaches source material to an AI chat, applies a large conversion prompt, validates the generated file, authenticates it with Ed25519 and consumes it in an application. The lifecycle is unusually explicit: generation, validation, attestation and app consumption.

Cookpit is “optimal, closed and static” by design. It turns a recipe into a prescribed live-cooking plan with three phases—`prepCook`, `preCook` and `liveCook`—plus course lanes, tasks, processes and alarms.

### Technical and product evidence

- The [v3.2 schema](https://cookpit.org/v3.2/schema.json) is JSON Schema 2020-12 and uses JSON-LD/Schema.org vocabulary.
- The [extended reference](https://cookpit.org/v3.2/reference/) defines deterministic IDs, task/process structure, timing bases, course lanes and generation rules.
- Its validation system names hard, soft and informational criteria across lifecycle stages.
- Quantitative source fingerprints and source tokenization make fidelity to imported material a first-class concern.
- Signed `.A.jsonld` artifacts establish a formal attestation stage.
- The [AI workflow](https://cookpit.org/v3.2/ai/) is a concrete onboarding story rather than a vague promise that AI may help later.
- The site publishes the format as CC0 and describes a beta consumer application, CookChow.

### Where Cookpit leads RCP

1. **Source-to-artifact workflow.** The ingestion story is immediately understandable and directly connected to validation.
2. **Source fidelity.** Quantitative fingerprints and attestation make “what did the model omit or alter?” more operational than RCP's current import metadata alone.
3. **Trust ceremony.** Validation and signatures produce a clear authenticated artifact state.
4. **Live execution opinion.** Phases, lanes and alarms make it easy for an application to know what experience to build.
5. **Public packaging.** Versioned schemas, reference material and a CC0 declaration are reachable on a live domain.

### Where RCP leads Cookpit

1. **Representational flexibility.** RCP's method, components, profiles and execution modes do not force every recipe into one three-phase/course-lane worldview.
2. **Decentralized identity and lineage.** RCP's collection, reference, version and variant model is better suited to distributed recipe libraries and editorial histories.
3. **Runtime independence from AI.** RCP deliberately keeps the normative core deterministic and LLM-free; AI can be an ingestion adapter without becoming part of conformance.
4. **Category semantics and governed vocabularies.** Cookpit is deeply structured for execution, but RCP has stronger category-profile and culinary-registry machinery.
5. **Transformation calculus.** RCP specifies more reusable scaling, guard, constraint, minimum-batch, interleaving and scheduling behavior.

### Risks and uncertainties

Cookpit's strong opinion is also its largest constraint. “Any recipe” is difficult to reconcile with fixed phases, lanes and a required editorial voice. Its “rebel chef” lexicon is part of soft validation, which makes the format culturally and stylistically prescriptive.

The official website links to an [official Cookpit repository](https://github.com/BroadbaseAi/cookpit), but that repository was not publicly reachable during the audit. The schema and bundle are public, so the format can be inspected; the inaccessible source repository makes implementation history, contribution mechanics and independent governance less clear.

### Recommended relationship

Do not copy Cookpit's prescribed execution model. Borrow two ideas instead:

- Add a source-coverage/fidelity report to the planned ingestion layer.
- Define optional signing/attestation over RCP's existing canonical JSON rather than inventing a separate authenticated document shape.

Cookpit should be described as a specialized conversion and execution peer, not as proof that RCP must become LLM-first.

## Competitor deep dive: Soustack

### Product thesis

[Soustack](https://soustack.org/) is a composable JSON recipe standard. It starts with a minimal Schema.org-aligned envelope and adds capabilities through versioned **stacks**. Human-facing **profiles** describe the guarantees an application can rely on. Its public story—small start, incremental upgrade, computational recipes—is very close to RCP's.

This is the highest-overlap competitor and the one RCP must answer directly.

### Technical and ecosystem evidence

- The [specification repository](https://github.com/RichardHerold/soustack-spec) publishes JSON Schemas, profiles, stack contracts, conformance rules and fixtures.
- Seven public profiles cover Lite, Base, Timed, Scalable, Illustrated, Equipped and Prepped.
- Thirteen stacks cover compute, dietary, equipment, illustrated, prep, quantified, referenced, scaling, storage, structured, substitutions, techniques and timed behavior.
- Normative scaling includes linear, fixed, discrete, to-taste and baker's-percentage quantities.
- The [TypeScript core runtime](https://github.com/RichardHerold/soustack-core) exposes validation, profile detection, scaling, normalization, parsing, unit conversion, Schema.org conversion and scraping.
- The [ingestion project](https://github.com/RichardHerold/soustack-ingest) targets text, DOCX, PDF and RTF/RTFD and emits validated Soustack documents.
- Additional first-party repositories cover conformance, UI blocks, embeds, adapters, an application and MCP integration.
- The specification repository is marked CC0-1.0; runtime code is MIT. The specification README also contains a contradictory “MIT” line, which should be clarified by its maintainer.

### Where Soustack leads RCP

1. **Adoption gradient.** Lite and Base allow an integrator to obtain value before committing to the full model.
2. **Schema.org bridge.** Import, export and scraping are productized in the runtime.
3. **Packaged developer surface.** A published TypeScript runtime is easier to try than internal Go and viewer code.
4. **Communication.** Capability stacks and profiles make support claims easy to understand: “this recipe is Scalable” or “this app accepts Timed.”
5. **Integration breadth.** Blocks, embeds, framework adapters, MCP and ingestion repositories make the standard look usable beyond its schema.
6. **Licensing.** The spec and code have explicit reuse terms.

### Where RCP leads Soustack

1. **Normative computation depth.** Soustack's `compute@1` is a capability declaration requiring quantified and timed data; it is not comparable to RCP's broader calculus and schedule vectors.
2. **Method and category depth.** RCP has bases, components, guards, execution modes, category profiles and category-specific bounds. Soustack profiles mostly describe capability levels, not culinary archetypes.
3. **Authored transformation safety.** Soustack validates scaling modes, but it does not provide RCP's general constraint/refusal model with authored reasons.
4. **Provenance and editorial disagreement.** RCP represents sources, witnesses, verification and unresolved divergences as domain data.
5. **Collections, identity and lineage.** RCP's pack resolution, revision pinning and variant semantics are stronger.
6. **Vocabulary governance.** RCP's ingredient, primitive, technique and equipment registries create cross-document identities and a base for multilingual interfaces.
7. **Cross-language behavioral proof.** RCP has Go and TypeScript implementations replaying conformance behavior internally. Soustack's reference runtime is TypeScript; no independent second-language implementation was found.

### Where Soustack's claims outrun its implementation

This does not make the project invalid, but it narrows the comparison:

- `timed@1` defines step-level active/passive time and completion cues, but the audit did not find a normative scheduling algorithm comparable to RCP's schedule vectors.
- `compute@1` adds no fields or computation rules by itself; it signals that prerequisite stacks are present.
- Substitution ratios are informational and do not rewrite recipe structure or method.
- The ingestion project can fall back to a lightweight validator when the core package cannot be imported. A silent fallback risks giving callers weaker assurance than the command name implies.
- Public repository attention is currently minimal. The implementation breadth is real, but it is not evidence of broad external adoption.

### Strategic threat

Soustack can win without matching RCP's depth. If it gives developers 70% of the required semantics with 30% of the integration cost, Schema.org compatibility and an npm package can be decisive.

RCP therefore cannot position itself as merely:

- a small recipe core with optional capabilities;
- a machine-readable recipe standard;
- support for scaling, timing and structured steps; or
- a way for applications to avoid guessing.

Soustack already makes those claims. RCP's defendable wedge must combine **category-aware method semantics, deterministic multi-step calculus, explicit refusal, governed identities and provenance/lineage**.

### Recommended relationship

Publish a mapping rather than beginning a format war:

1. Define lossless mappings from Soustack Lite/Base and relevant Schema.org properties into RCP.
2. Mark Soustack Scalable/Timed mappings as conditional, with a machine-readable loss report where semantics differ.
3. Provide RCP → Soustack export for applications that need broad interchange but not all RCP guarantees.
4. Invite technical discussion after the mapping exists; do not propose a merger before RCP has public governance and adopters.

## Architecture comparison

| Dimension | RCP | Cooklang | Cookpit v3.2 | Soustack |
|---|---|---|---|---|
| Primary job | Executable, domain-aware contract for recipe apps | Human-readable recipe authoring and tooling | AI conversion into authenticated live-cooking plans | Incrementally adoptable computational recipe interchange |
| Primary representation | Strict YAML/JSON resolved to canonical JSON | Plain-text `.cook` markup + YAML metadata | JSON-LD | JSON aligned with Schema.org |
| Human authoring | Possible but verbose; no dedicated authoring UX | **Best in comparison** | Prompt-driven generation, not hand authoring | JSON/API-oriented |
| Core extensibility | Additive category profiles, registries, collections | Parser extensions and metadata conventions | Versioned, prescribed schema/rules | Versioned capability stacks and profiles |
| Category semantics | **Bread/pastry/dish hardened; five drafts** | Mostly author text and metadata | General execution model, not category profiles | Capability profiles, not culinary category profiles |
| Structured ingredients | Role, refs, quantities, bases, carried-over state and more | Parsed ingredient tokens and quantities | Typed JSON-LD objects under strict rules | Quantified/parsed ingredients via stacks |
| Method model | Steps, sections, components, dependencies, guards, produced intermediates | Prose order, sections and intermediate preparations | Three phases, lanes, tasks, processes and alarms | Structured steps, references and timed stack |
| Scaling | Normative calculus with bases, fixed transforms, floors and constraints | Linear/fixed plus experimental unit-yield behavior | Static generated plan; optimization occurs at generation | Linear, fixed, discrete, to-taste and baker's percentage |
| Scheduling | Normative reading-order, interleave and schedule vectors | Timers; application behavior | Strong prescribed live plan and alarms | Timed data; scheduling claimed, no equivalent normative algorithm found |
| Constraint/refusal model | **Explicit authored constraints, reasons and fail-closed operations** | Not a central protocol concept | Hard/soft/info validation gates | Schema and semantic validation; no equivalent general refusal calculus |
| Substitutions | Ingredient, equipment, step, section and component changes with method deltas | Author text/conventions | Generated static result | Informational referenced substitutions/ratios |
| Provenance | Sources, confidence, witnesses, disagreement and verification | Metadata can carry source information | Strong source fingerprint and attestation | Schema.org-derived source metadata; less editorial depth |
| Identity/lineage | Collections, revisions, verified refs and variants | Files and recipe references | Deterministic generated IDs and signatures | IDs/references; less version/variant depth |
| Controlled vocabulary | Governed registry with labels/aliases | Mostly free author vocabulary | Strict allowed terms inside format | Techniques and structured fields; Schema.org vocabulary base |
| Validation | JSON Schema + semantic linter + CUE bounds + conformance vectors | Canonical parser cases and implementation diagnostics | Staged hard/soft/info rules and schema validation | JSON Schema + semantic validation + fixtures |
| Reference tooling | Go CLI; TypeScript viewer engine | Multiple parsers, mature CLI, editors and apps | Browser validator/authentication and beta app | TypeScript runtime, ingestion, blocks, adapters and conformance tooling |
| AI dependency | None in normative runtime; planned optional ingestion | Optional AI import in CLI | **Central to intended generation workflow** | Optional ingestion/agent integrations |
| Public license | **Missing** | MIT | CC0 declaration | CC0 spec metadata; MIT runtime |
| Public namespace/docs | Placeholder `$id`; docs not deployed | Live site/spec and public repositories | Live versioned schema/reference | Live site/spec and public repositories |
| External adoption evidence | None yet | Strongest visible ecosystem here | One beta app claimed | Many first-party repos; little public third-party evidence |

## Product comparison through the founder's goals

The interview established five non-negotiable goals:

1. The protocol is primarily a developer interface.
2. It must enable applications to present and navigate recipes well.
3. It must represent diverse recipe archetypes and methods without forcing one rigid execution shape.
4. It must enable translation, conversion, scaling, scheduling and personal adaptation, while keeping app workflows outside the protocol.
5. Success requires real integration; two or three applications are the first meaningful threshold.

| Founder goal | RCP | Cooklang | Cookpit | Soustack |
|---|---|---|---|---|
| Developer-facing contract | Strong design; weak packaging today | Strong, mature developer ecosystem | Public contract, more generation-product oriented | Strong and already packaged for TypeScript |
| Flexible recipe/method representation | Strongest intent and domain depth; corpus still small | Flexible prose, lighter machine guarantees | Weak fit because execution shape is deliberately rigid | Strong composability; less category/method depth |
| Enable guided interfaces | Strong semantics and viewer prototype | Many existing surfaces | Strong prescribed execution UI model | Blocks/adapters and profile promises |
| Enable conversion/translation | Registry labels and structured fields help; import/SDK work incomplete | Easy human format and many parsers; semantics may remain textual | Strong source conversion workflow | Strong Schema.org conversion and ingestion |
| Enable schedule/adaptation | Deepest normative operations in comparison | Mostly application responsibility | Strong schedule generated into the artifact | Scaling strong; scheduling less normative |
| Avoid protocol owning app workflows | Good architectural boundary | Good boundary | More workflow opinion is embedded in the format | Good boundary |
| Near-term integration readiness | **Behind** until docs, license and SDK ship | Ready | Public artifacts available | Ready in TypeScript |

RCP aligns best with the founder's intended architecture. It is not currently the easiest project to adopt.

## Claims audit

| Candidate claim | Verdict | Publishable version |
|---|---|---|
| “Universal recipe protocol” | **Not substantiated** | “Designed to represent diverse recipe categories and methods.” |
| “Captures any recipe” | **Not substantiated** by nine documents | “A growing, category-aware recipe model.” |
| “Open standard” | **Do not use** until licensing/governance/public namespace exist | “A versioned recipe protocol” for now |
| “Open source” | **Do not use** without a repository license | Add licenses, then state the precise license for spec and code |
| “Safe recipe transformations” | Too broad | “Refuses transformations that violate authored machine-checkable constraints.” |
| “Lossless conversion” | Not demonstrated across external formats | “Preserves represented source detail and reports unresolved fields.” |
| “Multilingual” | Overbroad; current registry evidence is mostly Portuguese/English | “Built for localized labels and aliases.” |
| “Two implementations” | Technically true inside one project, not independent interoperability | “Go reference tooling and a TypeScript implementation replay the conformance behavior.” |
| “SDKs available” | False today | “SDKs planned”; remove once packages ship |
| “No runtime LLM required” | **Supported** | Publish as written |
| “Deterministic Recipe Calculus” | **Supported and differentiating** | Publish with a link to the specification and vectors |
| “Recipes that keep their meaning” | Strong brand promise if explained | Pair with concrete proof: method, constraints, provenance and conformance |

## Competitive position

### RCP's defendable territory

RCP should own the intersection of five capabilities, not any one of them alone:

1. **Category-aware semantics:** recipe categories can tighten the core without making documents unintelligible to basic consumers.
2. **Executable conformance:** operations are specified through behavior and vectors, not left as suggestions.
3. **Explicit refusal:** an application can say why a requested transformation is unsupported or outside an authored bound.
4. **Traceable meaning:** provenance, disagreement, lineage, revisions and resolved references survive distribution.
5. **Governed culinary identity:** ingredients, techniques, primitives and equipment have stable identifiers and localized labels.

No audited competitor combined all five at RCP's current depth. That is a narrower, stronger assertion than saying no competitor supports structured or computational recipes.

### Positioning sentence

> For teams building recipe and cooking software, RCP is an executable recipe protocol that preserves category-specific method, constraints and provenance across applications. It defines how supported transformations compute—and when they must refuse—without requiring an LLM at runtime.

### Supporting messages

- **Model the method, not only the ingredient list.**
- **The same calculation in every implementation.**
- **A refusal is better than a plausible wrong answer.**
- **Sources, variants and disagreements remain inspectable.**
- **AI may ingest a recipe; deterministic software decides whether it conforms.**

### What not to compete on

- Do not claim to be more pleasant to author than Cooklang before building author tooling.
- Do not claim broader interchange than a Schema.org-based format before shipping mappings.
- Do not imitate Cookpit's LLM-first or prescriptive voice model.
- Do not copy Soustack's “composable stacks” language; it will make RCP look derivative and blur the deeper distinction.
- Do not make recipe discovery, favorites, meal planning, shopping or consumer library management part of the protocol core.

## Naming implications

This audit changes the naming brief in useful ways.

### Category words are crowded

“Cook,” “recipe,” “standard,” “format,” “structured” and “computational” are already heavily used. The competitive set contains Cooklang, Cookpit and multiple products beginning with Cook; Soustack already claims “composable recipe data standard” and “computational recipes.” A new name should be memorable without pretending the generic category is ownable.

### Impact on the existing shortlist

| Name | Effect of this audit |
|---|---|
| **RecipeFrame** | Still the strongest provisional brand. “Frame” suggests a flexible structure without copying stack/language/pit vocabulary. It needs a computation-led descriptor because the name alone sounds representational. |
| **Recipe Protocol** | Clear as a descriptor, weak as an ownable brand and difficult to search. Keep as category language, not necessarily the final proper name. |
| **Recipe Grammar** | Weaker after auditing Cooklang; “grammar” makes the project sound like an authoring language. |
| **Cookstruct** | Weaker because the `Cook-` space is crowded and “struct” competes on generic structure, where Soustack already has a strong story. |
| **RecipeShape** | Understandable but shallow relative to the calculus; its `.com` was also registered in the preliminary screen. |
| **RCP** | Suitable as an internal namespace, but overloaded and not memorable enough to carry the public brand by itself. |

The current recommendation remains **RecipeFrame** as the working public-name candidate, paired with **“the executable recipe protocol”**. This is not a final naming decision. It still requires trademark, linguistic and live namespace screening immediately before adoption.

Avoid preserving `rcp` as a public technical namespace merely because it exists today. The schema IDs intentionally use a placeholder host, so the namespace can still change before public release. Compatibility should be designed around model/version identifiers, not sunk-cost attachment to an unpublished acronym.

## Roadmap recommendation

### P0 — make the protocol adoptable

1. **Choose and publish licensing.** A practical model would be CC0 for the normative data format and schemas, plus Apache-2.0 or MIT for code. This is a governance decision, not legal advice.
2. **Choose the public name and permanent namespace.** Replace `rcp.invalid` with resolvable, immutable schema URLs only after the name/domain decision.
3. **Deploy v0.5 documentation.** Include a five-minute path, model overview, calculus spec, vectors, examples, versioning and an honest maturity table.
4. **Package the TypeScript SDK first.** Existing TypeScript behavior and the Pão web integration make this the lowest-cost public integration surface. Follow with Swift for the iOS micro-bakery application. Keep Go as the reference validator/CLI.
5. **Ship the two first-party integrations.** Treat them as implementation tests and case studies, not external adoption.
6. **Publish Schema.org and Soustack mappings.** Include machine-readable loss reports and fixtures.
7. **Publish a Cooklang importer.** Start one-way; do not promise lossless export of RCP-only semantics.
8. **Reconcile strategy documents.** Make developer teams the primary protocol audience and move consumer workflows explicitly to applications.

### P1 — prove interoperability and reduce risk

1. Recruit one independent integrator and observe onboarding rather than assisting invisibly.
2. Require the external implementation to replay conformance vectors.
3. Publish packages through normal registries with compatibility policy and changelogs.
4. Add an online validator/conformance report that can also run locally and privately.
5. Specify optional artifact signing over canonical JSON.
6. Add source-coverage reporting to ingestion before promoting image/PDF/link conversion.

### P2 — expand only from observed demand

- Harden a draft category profile only when multiple real documents and an application need its semantics.
- Build dietary and substitution catalogs after real adaptation cases reveal the necessary guarantees.
- Add more SDK languages when a committed integrator exists; language count is not a success metric by itself.
- Consider a human-oriented authoring layer only after measuring author time and error patterns.

## Recommended success measures

| Measure | Initial gate |
|---|---|
| Public usability | A developer can validate and render an example in under 15 minutes without cloning the monorepo |
| SDK readiness | Versioned TypeScript package; public API docs; same vector results as Go |
| First-party proof | Pão de Portugal and the iOS scheduler use the public package/schema paths rather than internal copies |
| Independent proof | One external implementation or integration passes the conformance suite without founder-written glue |
| Representation coverage | At least 90% of attempted founder-owned recipes encode without core changes; failures are classified and published |
| Transformation integrity | Zero silent constraint violations in the conformance and integration suites |
| Migration value | Schema.org/Cooklang/Soustack adapters produce explicit field-level loss reports |
| Governance | License, versioning, contribution and registry stewardship policies reachable from the docs home page |

## Final assessment

### Is RCP redundant?

No. The implemented calculus, constraint/refusal behavior, category semantics, registries, provenance and lineage go materially beyond the alternatives reviewed.

### Is RCP already the best general recipe standard?

No. That claim would confuse technical depth with product readiness and adoption. Cooklang is dramatically stronger as a living author ecosystem. Soustack is easier to adopt for JavaScript and Schema.org users. Cookpit provides a clearer end-to-end source conversion and authentication flow.

### What is the biggest risk?

Not that another format has every RCP feature. The risk is that developers do not need every feature and choose a simpler, licensed, documented and packaged alternative.

### What should the project do next?

Freeze broad protocol expansion for one release. Make the existing depth legible and usable: license it, name it, deploy the docs, package SDKs, map the adjacent standards and prove two real integrations. Then ask an independent developer to implement against the public contract.

That sequence converts RCP from a sophisticated private protocol into a credible public one.

## Sources and audit trail

### RCP repository evidence

- `README.md`
- `schema/rcp-core-v1.schema.json`
- `schema/rcp-pack-v1.schema.json`
- `schema/VERSIONING.md`
- `schema/profiles/*.schema.json`
- `registry/**/*.yaml`
- `examples/**/*.yaml`
- `tools/rcplint/`
- `tools/viewer/`
- `docs/product/ROADMAP.md`
- `docs/product/prds/PRD-001-rcp-v01-protocol-definition.*`
- `docs/product/prds/PRD-005-rcp-v05-protocol-goes-public.*`
- `docs/research/DECISIONS.md`
- `docs/brand/productresearcher-brand-foundation.md`
- Founder interview captured in the working conversation on 10 August 2026

### External primary sources

- [Schema.org Recipe](https://schema.org/Recipe)
- [Cooklang specification](https://cooklang.org/docs/spec/)
- [Cooklang developer documentation](https://cooklang.org/docs/for-developers/)
- [Cooklang CLI commands](https://cooklang.org/cli/commands/)
- [Cooklang GitHub organization](https://github.com/cooklang)
- [Cooklang spec repository](https://github.com/cooklang/spec)
- [cooklang-rs](https://github.com/cooklang/cooklang-rs)
- [CookCLI](https://github.com/cooklang/cookcli)
- [Cookpit homepage](https://cookpit.org/)
- [Cookpit v3.2 extended reference](https://cookpit.org/v3.2/reference/)
- [Cookpit v3.2 AI workflow](https://cookpit.org/v3.2/ai/)
- [Cookpit v3.2 JSON Schema](https://cookpit.org/v3.2/schema.json)
- [Cookpit v3.2 bundle](https://cookpit.org/v3.2/bundle.json)
- [Soustack homepage](https://soustack.org/)
- [Soustack specification](https://github.com/RichardHerold/soustack-spec)
- [Soustack core](https://github.com/RichardHerold/soustack-core)
- [Soustack conformance](https://github.com/RichardHerold/soustack-conformance)
- [Soustack ingestion](https://github.com/RichardHerold/soustack-ingest)

---

**Research integrity note:** Public attention metrics, repository versions and site availability are observations as of the evidence cutoff, not durable product properties. No competitor maintainer was interviewed. Findings about fit and strategy are reasoned recommendations from the audited artifacts, not claims about maintainer intent beyond their published documentation.
