# Schemami voice and copy playbook

**Version:** 1.0.0<br>
**Applies to:** website, protocol documentation, SDKs, CLI, validation, examples,
release notes and project communication

Schemami sounds like a precise collaborator who understands that software rules
have kitchen consequences. The brand may be playful when earning attention; it
becomes plain and exact when teaching, validating or refusing.

## Voice in one line

**Warm enough to remember. Exact enough to implement.**

## Character

- **Precise, not clinical.** State the rule and why it matters.
- **Playful, not cute.** Let the name carry most of the wit.
- **Curious, not culturally flattening.** Preserve the recipe’s own terms.
- **Helpful, not permissive.** Explain a refusal and the path forward.
- **Calm, not bureaucratic.** Conformance is useful engineering, not theatre.

The voice does not change personality by surface. Its intensity changes: more
expressive in brand moments, more compact in UI, more explicit in protocol text.

## Message architecture

Each line has one job. Do not ask one headline to provide category, benefit,
personality and proof simultaneously.

| Role | Canonical copy | Use |
|---|---|---|
| Brand | **Schemami** | Project, protocol and ecosystem name |
| Tagline | **Recipes, structured to taste.** | Brand signature and memorable hero lead |
| Descriptor | **The flexible recipe protocol for software.** | First encounter and metadata |
| Promise | **Structure the recipe without flattening the method.** | Technical proof and positioning |
| Invitation | **Give your recipes some Schemami.** | SDK onboarding, launch and examples after comprehension |
| Name reveal | **Schema meets umami.** | About, launch, presentation or wordmark reveal |
| Primary CTA | **Read the protocol** | Homepage and documentation entry |
| Secondary CTA | **Inspect a recipe document** | Concrete protocol evidence |

### Hero order

For an unfamiliar developer:

1. one memorable tagline or promise;
2. the plain category descriptor;
3. one consequence-led sentence;
4. one primary action;
5. visible protocol evidence.

Recommended baseline:

> **Recipes, structured to taste.**<br>
> The flexible recipe protocol for software.<br>
> Preserve ingredients, methods, constraints and provenance in dependable
> structure applications can validate and calculate with.

### Method-first line

“Keep the method. Compute the recipe.” has strong rhythm but can imply that the
protocol itself executes a complete recipe or guarantees every transformation.
It is not approved as the universal hero.

The truthful challenger is:

> **Keep the method. Make recipes computable.**

Use it only where the following copy immediately explains that Schemami enables
applications to calculate from supported structure and to refuse unsupported
operations. It remains a hero candidate until externally tested.

## Core writing rules

### Lead with consequence, then mechanism

Use:

> Keep the source amount visible. The resolver can calculate with the normalized
> quantity without replacing what the author wrote.

Avoid:

> The normalized quantity representation supports source preservation.

### Use concrete verbs

Prefer **represent, preserve, resolve, validate, scale, derive, schedule,
compare, refuse**.

Use **support, enable** only when naming who performs the action. Avoid empty
verbs such as **leverage, streamline, revolutionize, unlock**.

### Separate kinds of truth

Use explicit nouns and labels:

- **source text** — what was captured;
- **authored value** — what the recipe asserts;
- **resolved identity** — what a registry recognizes;
- **derived value** — what deterministic logic calculated;
- **uncertainty** — what remains unresolved;
- **personal recipe** — a changed recipe with its own identity and lineage.

Never present an inference as though the author supplied it.

### Name the boundary

Schemami is the protocol and SDK ecosystem. It is not the ingestion UI,
translation service, LLM, recipe-discovery app, cooking guide or bakery
scheduler. Use “applications can…” when describing those experiences.

### Teach from a fragment

Show a real ingredient, method edge, refusal or provenance record before
introducing a generalized abstraction. One useful example is worth more than a
paragraph of “flexible” and “extensible.”

## Terminology

| Prefer | Avoid | Reason |
|---|---|---|
| recipe document | recipe file format everywhere | The protocol represents meaning, not only serialization |
| method | instructions when referring to the model | A method can carry structure and dependency |
| ingredient identity | translated ingredient | Stable identity enables applications to localize labels |
| resolve / unresolved | known / unknown without context | Resolution is explicit and reversible |
| calculate | magically adapt | Calculation has authored inputs and bounds |
| refuse | fail, crash or give up | A safe refusal is expected behavior |
| personal recipe | modified original | A meaningful change creates its own recipe and lineage |
| adapter | importer when covering many sources | Links, photos, voice and prose are adapter inputs |
| conformance vector | test recipe | The vector proves behavior, not taste |

Use lowercase code identifiers exactly as authored. Do not “humanize” registry
IDs inside code or error evidence.

## Claims discipline

### Approved claim shape

- “Designed to represent many recipe archetypes.”
- “Deterministic calculation with explicit refusal.”
- “Stable identities let applications localize labels.”
- “Preserves source, derivation and recipe lineage.”
- “A flexible recipe protocol for software.”

### Do not claim yet

- universal or culture-neutral recipe representation;
- safe automated substitution in every context;
- perfect conversion from any link, image or book;
- compatibility with every recipe application;
- “open standard” before license and governance support it;
- AI understanding as normative protocol behavior.

Use evidence-sized language. “Current conformance vectors cover…” is stronger
than “works with everything.”

## Operational copy patterns

### Validation refusal

Order the message as:

1. **outcome**;
2. **reason**;
3. **preserved evidence**;
4. **next action**.

Example:

> **Scaling stopped.** The requested yield exceeds the recipe’s authored salt
> bound. The original quantity remains unchanged. Review the constraint or use a
> smaller yield.

Avoid “Something went wrong,” “Invalid input” or an error code without a human
explanation.

### Unresolved identity

> **Technique unresolved.** Preserve “bater até fazer fita” as source text. Do
> not calculate timing from it until an application or steward resolves the
> technique identity.

### Successful calculation

> **Yield scaled to 18 pieces.** Amounts were derived from the authored 12-piece
> basis. Oven temperature and method order were not changed.

### Provenance

> Imported from the photographed page on 10 August 2026. Ingredient amounts were
> reviewed; the final shaping note remains unresolved.

### Registry resolution

> Resolved `ingredient.flour.wheat` from the project registry. The interface may
> now provide a localized label; the recipe document keeps the stable ID.

### Empty state

> No recipe document is loaded. Open an example or parse a Schemami document to
> inspect its method.

### CLI

```text
Validated 1 recipe document.
2 derived values confirmed.
1 technique remains unresolved.
No source values were changed.
```

CLI output is terse, deterministic and suitable for logs. Put stable codes after
the plain explanation, not before it.

## Documentation style

- Start each page with what the reader can accomplish.
- Put normative **MUST**, **SHOULD** and **MAY** only in normative protocol text.
- Distinguish normative rules from rationale and examples visually and verbally.
- Use sentence-case headings.
- Use active voice when the actor is known.
- Keep paragraphs short around rules; long-form research can be more discursive.
- Prefer tables for exact mappings and code for serialization.
- Call out destructive or lossy behavior before the action.
- Link to proof: schema, example, vector, registry entry or decision.

## SDK and API copy

Name methods after observable behavior: `parse`, `validate`, `resolve`, `scale`,
`derive`, `refuse`. Do not use `smart*`, `magic*` or `auto*` for behavior whose
limits matter.

Doc comments should answer:

1. What does this operation produce?
2. Which authored facts can it change?
3. Which conditions cause refusal?
4. How is provenance returned?

Example:

> Scales quantities from the recipe’s declared yield basis. Returns a refusal
> when an authored bound would be exceeded. Does not rewrite source text.

## Release notes

Use a consequence-led structure:

- **Added** — what an integrator can now represent or calculate.
- **Changed** — compatibility and migration consequence.
- **Fixed** — the incorrect behavior and affected documents.
- **Refused** — a formerly ambiguous operation that now stops explicitly.

Avoid celebratory adjectives. Evidence and migration clarity carry the tone.

## Playfulness budget

One playful line per viewport, section or short communication is usually enough.
After a pun, return to plain language.

Approved situational lines:

- “Mise en schema.” — developer campaign or conference material.
- “Schema, served.” — short release or social signature.
- “Give your recipes some Schemami.” — onboarding after category comprehension.

Avoid food puns in errors, security notes, conformance failures, migration steps
or accessibility guidance.

## Localization and cultural care

- Preserve regional culinary terms when a direct equivalent would lose meaning.
- Do not describe one cuisine’s technique as the global default.
- Keep source text alongside a resolved ID or explanatory label.
- Let applications provide translations; do not add translation strings to the
  normative protocol.
- Ask a knowledgeable reviewer when copy interprets a culturally specific
  method rather than merely displaying its authored name.

## AI and ingestion copy

An LLM may propose a candidate document. Copy must make that status explicit.

Use:

> Extraction complete. Review 3 uncertain fields before publishing.

Avoid:

> Your recipe was perfectly converted.

Never make “AI-powered” the primary brand claim. The protocol remains useful and
deterministic without a runtime model.

## Copy review checklist

Before shipping, confirm:

- Can an unfamiliar developer identify the category?
- Is the actor clear: protocol, SDK, adapter, application or person?
- Does the copy distinguish authored, derived and unresolved data?
- Is any claim larger than the linked evidence?
- Does an error explain recovery without hiding preserved information?
- Is the protocol/app boundary intact?
- Is the terminology culturally specific where it should be?
- Is there more than one joke competing for attention?
- Can the important state be understood without color?
- Does the CTA describe the actual next surface?

## Governance

This playbook is the canonical Schemami voice. New recurring patterns should be
added here with examples. Changes to the tagline, descriptor, promise or claims
discipline require founder approval and a recorded messaging decision. Campaign
lines and surface-specific examples may evolve without changing the core voice.
