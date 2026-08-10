# RCP brand foundation

> **Superseded:** the founder interview, naming decision and Schemami visual
> directions now live in [`schemami-brand-foundation.md`](./schemami-brand-foundation.md).
> This report remains as the pre-interview decision record.

**ProductResearcher working report · 10 August 2026**<br>
**Status:** evidence-backed hypotheses; **no customer interviews have been conducted**

> This is a decision aid, not a validated brand strategy. Repository evidence can establish what RCP is and what it has shipped. It cannot establish external demand, audience priority, naming comprehension, or emotional response. Those claims are explicitly marked as hypotheses below.

## Executive readout

RCP is a machine-readable recipe protocol: a small core, category profiles, governed registries, a deterministic Recipe Calculus, conformance vectors, validation tooling, and an offline-capable viewer. Its strongest differentiator is not “recipes in structured data.” It is preserving **method, provenance, safety, and computability** across implementations.

The clearest brand-facing beachhead is provisionally the **surface engineer**: someone building a recipe viewer, importer, collection, publishing surface, or cooking tool who needs a dependable contract. This is a hypothesis derived from the public-documentation PRD, not an externally validated ICP.

The safest naming decision today is layered:

- Keep **`rcp`** as the stable technical namespace.
- Use **Recipe Protocol** as the descriptive public name during validation.
- Do not adopt a coined brand name until comprehension, linguistic, domain, and legal screening are complete.

Of the three directions below, **Direction A — Exact Instrument** is the strongest provisional fit. It makes the protocol credible without resembling another food app. Direction B is more ownable but can feel compliance-heavy. Direction C is warmer and more expressive but risks hiding the technical category.

## Research integrity

### What the repository establishes

| Finding | Evidence status |
|---|---|
| RCP has a hardened core, profiles, registries, validation and conformance machinery | Shipped repository evidence |
| v0.1–v0.4 shipped; v0.5 public documentation work is accepted | Roadmap, tags and PRD evidence |
| Offline/private operation, deterministic computation and no runtime LLM are deliberate product properties | PRDs and implementation constraints |
| Personal collection and home cooking are active dogfood contexts | Internal usage evidence; effectively n=1 |
| Steward and verifier are real operating roles | Workflow and shipped-system evidence |
| Surface engineers are the likely public adoption beachhead | **Hypothesis**, inferred from v0.5 |
| A broader market wants a universal recipe protocol | **Unvalidated hypothesis** |
| Any name, palette or type system will be understood and preferred | **Unvalidated hypothesis** |

### Important contradictions and gaps

1. Some overview documents still say “pre-implementation,” while the authoritative roadmap records four shipped releases. Public copy should follow the roadmap.
2. The repository speaks mainly to technical implementers, while much of the persona evidence comes from a personal collector/home-cook dogfood loop.
3. “Universal” is an ambition, not yet an externally proven claim.
4. No public license was found during this audit. Until licensing and governance are explicit, the brand should not promise “open source” or “open standard.”
5. `RCP` is compact and already embedded technically, but it is overloaded and weakly searchable. “Recipe Protocol” is clear but descriptive and difficult to protect.

## ICP and persona audit

The existing persona keys should remain stable. The brand needs a prioritization overlay, not a replacement taxonomy.

### 1. Brand-facing beachhead — provisional

**`rcp.dev.surface-engineer`**

- **Situation:** building a recipe surface, importer, validator, collection, or domain-specific cooking tool.
- **Job:** accept recipe content once, preserve its meaning, and render or compute it consistently across environments.
- **Current alternatives:** an application-specific schema, free text, raw YAML/JSON, Schema.org Recipe, Cooklang, or a recipe-manager API.
- **Anxieties:** format churn, ambiguous semantics, unsafe scaling, silent data loss, undocumented extension behavior, and a standard that has no executable proof.
- **Evidence:** the schema, validator, conformance vectors, Recipe Calculus and v0.5 documentation requirements exist.
- **Unknown:** whether independent implementers experience this pain strongly enough to adopt RCP.

### 2. Product-value users — internally evidenced, externally unvalidated

**`rcp.ingester.personal-collector`** and **`rcp.cook.home-cook`**

- **Situation:** preserving recipes from mixed sources, then adapting and executing them privately.
- **Job:** turn an unreliable source into a trusted, reusable cooking document without losing provenance or method.
- **Anxieties:** transcription error, unclear quantities, lost source context, scaling failures, broken substitutions, and dependence on a hosted service.
- **Evidence:** the dogfood corpus and delivered viewer/calculation capabilities.
- **Unknown:** whether this value generalizes beyond the product owner and whether users want the protocol itself or only an application built on it.

### 3. Trust and governance actors — validated roles, not market ICPs

**`rcp.registry.steward`** and **`rcp.verifier.editorial`**

- Maintain identifiers, definitions, evidence and compatibility.
- Review provenance, ambiguity and safety rather than merely checking syntax.
- Their needs must shape voice and identity: sober, inspectable and explicit about refusal.

### Parked personas

- **`rcp.cook.diaspora-substituter`** — valuable hypothesis; avoid elevating cultural translation into a promise before research.
- **`rcp.cook.production-scaler`** — deliberately deferred.
- **`rcp.author.heritage-archivist`** and **`rcp.author.contributor`** — relevant to heritage collections, but not the public-protocol beachhead.

Daniel is the product owner and an internal stakeholder, not a persona.

## Positioning foundation

Following `[[positioning-as-context]]` and `[[five-components-of-positioning]]`, the brand must establish the comparison frame before choosing aesthetic expression.

| Positioning component | Working answer |
|---|---|
| Competitive alternatives | Bespoke schemas, unstructured recipe files, Schema.org Recipe, Cooklang, and application-specific APIs |
| Differentiated attributes | Profiles over a small core; governed registries; deterministic calculus; conformance vectors; safety bounds; provenance; offline validation |
| Value and proof | Recipes can move between implementations without silently losing method, identity, safety rules or derived behavior; the repository contains executable specifications and vectors |
| Who cares most | Provisionally, engineers and maintainers of serious recipe surfaces |
| Market frame | A recipe interoperability protocol, not a consumer recipe manager and not merely a markup syntax |

### Provisional positioning statement

> For teams building recipe surfaces that need recipes to remain computable and trustworthy, RCP is the recipe protocol that preserves method, provenance, safety and calculation across categories and implementations.

### Onliness statement

> The only recipe protocol in its current comparison set that treats executable calculation, conformance, provenance and governed culinary vocabularies as one interoperable contract.

This onliness statement is a **research hypothesis**. It must be checked against the full competitive set before publication.

## Brand hypothesis A — Exact Instrument

**Strategic idea:** A public standard should feel like a precise instrument: calm, legible and dependable, with just enough signal color to make rules and decisions visible.

### Naming slate

1. **RCP** — retain as the technical namespace and compact signature.
2. **Recipe Protocol** — use as the public descriptive name during validation.
3. **Methodmark** — reserve as a possible future brand; preliminary search found no obvious direct category conflict, but this is not legal clearance.

**Recommended lockup:** `RCP / Recipe Protocol`

### Positioning and personality

- **Promise:** Recipes that keep their meaning.
- **Primary traits:** competent, sincere, exact, grounded.
- **Voice:** short declarative sentences; concrete nouns and verbs; explain why a rule exists; distinguish errors, warnings and unknowns.
- **Never:** lifestyle gloss, “AI magic,” culinary gatekeeping, or enterprise-standard bureaucracy.

### Color system

<div class="swatches" aria-label="Exact Instrument palette">
  <div class="swatch" style="--swatch:#F6F2E8"><span>Stock</span><code>#F6F2E8</code></div>
  <div class="swatch dark" style="--swatch:#181A17"><span>Carbon</span><code>#181A17</code></div>
  <div class="swatch dark" style="--swatch:#252C29"><span>Instrument</span><code>#252C29</code></div>
  <div class="swatch dark" style="--swatch:#68705A"><span>Lichen</span><code>#68705A</code></div>
  <div class="swatch" style="--swatch:#D5B72E"><span>Signal</span><code>#D5B72E</code></div>
</div>

- **Itten contrast:** light–dark dominates; a restrained hue and saturation contrast makes Signal feel functional rather than decorative.
- **Emotional intent:** precision, material honesty and quiet confidence.
- **Cultural caution:** yellow can imply warning. Use it for attention and active states, not success.
- **Differentiation:** avoids the orange/brown field visible in several recipe tools and the familiar indigo software template.
- **Contrast checks:** Carbon/Stock 15.67:1; white/Instrument 14.28:1; Carbon/Signal 8.88:1; white/Lichen 5.18:1.

### Typography

- **Long-form and editorial explanation:** Source Serif 4.
- **Navigation, controls and compact labels:** IBM Plex Sans.
- **Code and protocol identifiers:** IBM Plex Mono.
- Treat Plex Sans and Mono as one superfamily; reserve Source Serif for reading surfaces. Self-host WOFF2 assets—do not use a font CDN.

### Visual identity

- A wordmark with sturdy `RCP` capitals and the full descriptor set alongside, never hidden on first encounter.
- Calibration ticks, ruled measures and ingredient-to-method mappings as recurring geometry.
- Diagrams should look annotated rather than ornamental.
- Recognition test: the ruled-measure motif plus Stock/Carbon/Signal should remain identifiable when the wordmark is covered.

### Risks

- Can feel cold or standards-body institutional.
- The descriptive name has low legal protectability.
- Signal yellow can be confused with warning semantics.
- “Public” must not imply “open source” until licensing and governance are explicit.

## Brand hypothesis B — Proofed Method

**Strategic idea:** RCP is the trust mark behind a recipe: evidence, provenance, explicit decisions and honest refusal when a transformation is unsafe.

### Naming slate

1. **Methodmark** — strongest candidate in this direction; requires full screening.
2. **Method Mark** — clearer phrase, less protectable.
3. **Proofed Method** — food-relevant double meaning, but longer and bread-biased.

### Positioning and personality

- **Promise:** Know what the recipe means—and when not to trust a transformation.
- **Primary traits:** vigilant, transparent, editorial, protective.
- **Voice:** show the evidence; name uncertainty; make refusal useful; never present confidence theatrically.
- **Never:** compliance theatre, fear-based safety copy, badges without proof.

### Color system

<div class="swatches" aria-label="Proofed Method palette">
  <div class="swatch" style="--swatch:#FBF7F0"><span>Paper</span><code>#FBF7F0</code></div>
  <div class="swatch dark" style="--swatch:#211A1E"><span>Ink</span><code>#211A1E</code></div>
  <div class="swatch dark" style="--swatch:#662A48"><span>Proof</span><code>#662A48</code></div>
  <div class="swatch dark" style="--swatch:#676D4F"><span>Archive</span><code>#676D4F</code></div>
  <div class="swatch" style="--swatch:#B7CF45"><span>Verified</span><code>#B7CF45</code></div>
</div>

- **Itten contrast:** complementary tension between aubergine and yellow-green, moderated by warm neutrals.
- **Emotional intent:** scrutiny, authorship and earned trust.
- **Cultural caution:** aubergine may read as premium or ceremonial; chartreuse can feel laboratory-like.
- **Differentiation:** highly recognizable without defaulting to developer indigo or food-app orange.
- **Contrast checks:** Ink/Paper 15.97:1; white/Proof 10.55:1; Ink/Verified 9.86:1; white/Archive 5.42:1.

### Typography

- **Body and interface:** Atkinson Hyperlegible.
- **Display and evidence-led editorial surfaces:** IBM Plex Serif.
- **Identifiers:** IBM Plex Mono.
- This system prioritizes character distinction and dense review work over fashion.

### Visual identity

- Registration marks, proofreader brackets and an incomplete frame that becomes complete only when evidence is present.
- Use provenance and validation states as first-class graphic structure.
- A compact mark may combine a bracket, check and recipe-step line without becoming a generic shield.

### Risks

- May make RCP feel like certification or compliance software.
- The palette can drift toward biotech or developer tooling.
- `Methodmark` does not immediately communicate recipes.
- A trust promise raises the standard of governance evidence the project must publish.

## Brand hypothesis C — Living Grammar

**Strategic idea:** A recipe is not merely a list; it is a living grammar of ingredients, transformations, timing, culture and adaptation. RCP lets software carry that grammar without flattening the craft.

### Naming slate

1. **Kitchen Grammar** — clearest metaphor, but descriptive.
2. **Cookfold** — coined and compact; needs pronunciation and comprehension testing.
3. **Method Loom** — expressive but “Loom” is crowded and should be treated as a direction name, not a cleared candidate.

### Positioning and personality

- **Promise:** Structure the recipe without stripping out the method.
- **Primary traits:** curious, warm, literate, practical.
- **Voice:** teach through examples; connect technical rules to kitchen consequences; respect regional specificity.
- **Never:** nostalgia as decoration, quaint “grandmother recipe” tropes, or claims of cultural authority the protocol has not earned.

### Color system

<div class="swatches" aria-label="Living Grammar palette">
  <div class="swatch" style="--swatch:#F7F5EE"><span>Page</span><code>#F7F5EE</code></div>
  <div class="swatch dark" style="--swatch:#172126"><span>Night</span><code>#172126</code></div>
  <div class="swatch dark" style="--swatch:#1E5D7A"><span>Marine</span><code>#1E5D7A</code></div>
  <div class="swatch dark" style="--swatch:#9B3A2E"><span>Clay</span><code>#9B3A2E</code></div>
  <div class="swatch" style="--swatch:#D6B33B"><span>Brass</span><code>#D6B33B</code></div>
</div>

- **Itten contrast:** warm–cool contrast between Marine and Clay; Brass supplies a smaller light/dark accent.
- **Emotional intent:** depth, craft and transmission without rustic cliché.
- **Cultural caution:** blue is not universally “technical,” and clay tones should not be used as shorthand for heritage.
- **Differentiation:** broader and cooler than the brown/orange recipe-tool field while retaining material warmth.
- **Contrast checks:** Night/Page 15.02:1; white/Marine 7.24:1; white/Clay 6.91:1; Night/Brass 8.09:1.

### Typography

- **Display:** Fraunces, used sparingly and at controlled optical sizes.
- **Body and interface:** Atkinson Hyperlegible.
- **Identifiers:** system monospace or IBM Plex Mono only where required.
- The expressive face belongs to moments; the reading face must be comfortable enough to live with.

### Visual identity

- Interleaving lines represent ingredients, steps and derived timelines becoming one document.
- Fold and weave structures can explain references, variants and provenance.
- Photography, if introduced later, should document hands, tools and evidence—not manufacture generic appetite appeal.

### Risks

- Can look like a consumer editorial product and obscure the protocol category.
- Fraunces is distinctive but fashionable; overuse would date the system.
- The metaphor may overpromise cultural interpretation.
- The coined names need substantial language and memorability testing.

## Direction comparison

Scores are internal reasoning aids, not research results. Five is strongest.

| Criterion | Exact Instrument | Proofed Method | Living Grammar |
|---|---:|---:|---:|
| Product truth | 5 | 5 | 4 |
| Engineer comprehension | 5 | 4 | 3 |
| Distinctive visual territory | 4 | 5 | 4 |
| Warmth and culinary relevance | 3 | 3 | 5 |
| Ability to extend across categories | 5 | 4 | 4 |
| Naming readiness | 4 | 2 | 2 |
| Governance expectations manageable today | 4 | 2 | 4 |
| **Provisional total** | **30** | **25** | **26** |

### Anti-convergence check

All three directions avoid the common combination of Inter-style sans, indigo/blue-violet gradients, generic rounded cards and a three-column SaaS layout. Each has a recognition system beyond a logo:

- **Exact Instrument:** ruled measurement + signal yellow.
- **Proofed Method:** proof marks + aubergine/chartreuse.
- **Living Grammar:** interleaving lines + marine/clay/brass.

## Provisional recommendation

Move **Exact Instrument** into validation with the public lockup **RCP / Recipe Protocol**.

This recommendation is reversible. It preserves the stable namespace, communicates the category immediately, and avoids spending name equity before the audience is proven. Borrow selected warmth from Living Grammar for explanatory content, but do not blend the directions into a median visual system before testing them separately.

The brand promise should be:

> **Recipes that keep their meaning.**

Supporting proof line:

> Schema, vocabularies, calculation and conformance for recipe software that must not guess.

Do not publish “open standard,” “universal,” “safe,” or “lossless” as unqualified claims until their evidence and governance requirements are met.

## Validation plan: the work still missing

### Founder interview

Purpose: separate product intent from accumulated implementation detail.

1. What event made a new recipe protocol feel necessary?
2. What did existing formats or tools fail to preserve?
3. Who must adopt RCP first for the project to succeed?
4. What behavior would count as real adoption in twelve months?
5. Which promise would you refuse to make, even if it improved conversion?
6. What should RCP feel unlike?
7. If the `rcp` namespace remains forever, how much value would a separate public name create?

### External discovery interviews

Recruit **5–8 people who build or maintain recipe surfaces**. Favor recent behavior over opinions.

- Walk me through the last recipe format or import pipeline you designed.
- Where did meaning get lost or become application-specific?
- What did you do about scaling, substitutions, provenance and unsafe transformations?
- Which existing format did you consider, and why did you accept or reject it?
- Show the last interoperability defect that cost meaningful time.
- What would make a protocol too expensive or risky to adopt?
- Give the current RCP landing proposition a five-second read; ask what they think it is, without explaining it.

Recruit **3–5 collector/cooks** separately. Test the value of applications built on RCP, not whether consumers desire a protocol.

### Concept test

Show the three directions separately, rotating order. Do not ask “Which do you like?” Ask:

1. What kind of product or organization do you expect behind this?
2. What would you trust it to do?
3. What feels inconsistent with a recipe interoperability protocol?
4. What do you remember ten minutes later?
5. Which direction would you investigate as an implementer, and why?

### Decision gates

Choose a direction only when:

- Most target implementers correctly identify the category without explanation.
- The primary promise maps to a demonstrated recent problem.
- The name passes pronunciation, spelling, linguistic, domain and professional trademark screening.
- The palette passes component-level WCAG checks, including interaction and status states.
- The system remains recognizable without its wordmark.
- Licensing and governance language supports every public openness claim.

## Source map

### Project evidence

- `docs/product/prds/PRD-001-rcp-v01-protocol-definition.md` through `PRD-005-rcp-v05-protocol-goes-public.md`
- `docs/product/ROADMAP.md` and `docs/product/FEATURES.md`
- `docs/personas.md`
- `docs/research/FINDINGS.md`, `CONCLUSIONS.md`, and `DECISIONS.md`
- `schema/`, `registry/`, `calculus/`, `tools/rcplint/`, `tools/viewer/`, and `tools/docsite/`

### ProductResearcher concepts applied

- `[[positioning-as-context]]`, `[[five-components-of-positioning]]`, `[[competitive-alternatives-reality]]`
- `[[wtp-segmentation]]`, `[[jobs-to-be-done-definition]]`, `[[circumstance-not-customer]]`
- `[[brand-naming]]`, `[[radical-differentiation]]`, `[[onliness-statement]]`, `[[brand-toolkit-not-logo]]`, `[[brand-validation]]`
- `[[seven-color-contrasts]]`, `[[brand-color-strategy]]`, `[[functional-color]]`, `[[ai-design-convergence]]`
- `[[typography-as-voice]]`, `[[typeface-selection-methods]]`, `[[typeface-pairing]]`, `[[type-for-a-moment-vs-type-to-live-with]]`, `[[web-font-loading]]`

### External reference checks

- Competitive category review: Cooklang, Schema.org Recipe, Mealie and Tandoor official product/specification pages.
- Typeface availability: Source Serif, IBM Plex, Atkinson Hyperlegible and Fraunces official repositories. Final implementation must verify exact font files, subsets and licenses before bundling.

---

**Workflow state:** discovery synthesis and brand hypotheses complete; interviews, concept testing, name clearance and final selection outstanding.
