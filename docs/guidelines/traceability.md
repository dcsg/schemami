# Traceability Guidelines

**Purpose:** Every requirement, spec item, artifact, plan phase, and sidecar carries an identifier that names its component and a trace to its origin — so any line of work can be walked back to the decision or research that justified it, and forward to the code that delivers it.

## Rationale

RCP's founding failure mode is drift: five recipe representations with no
shared type, three divergent baker's-percentage implementations. The same
disease infects project artifacts when a spec item can't be traced to a
requirement, or a plan phase delivers work no decision asked for. PRD-001
adopted component-coded identifiers (2026-08-02) precisely so that "which
part of v0.1 is this?" is answerable from the ID alone; this guideline makes
the scheme binding down the whole chain: PRD → SPEC → artifacts → plans →
sidecars.

## Rules

- Every PRD functional requirement MUST use a component-coded ID of the
  form `FR-<CODE>-NNN`, numbered per component from 001. The codes are:
  `PR` `protocol-core`, `REG` `registry`, `PROF` `profiles`,
  `VAL` `validator`, `SAFE` `safety-clamp`. New components MUST be added
  to this guideline (new code) before use — never invented ad hoc.
- Every PRD requirement MUST carry a `component:` field naming its
  component and a `trace:` list referencing at least one DECISIONS.md
  entry, research file, or recorded inventory that justifies it.
- Acceptance criteria MUST inherit their FR's code and number
  (`AC-<CODE>-NNN-M`), so the component is readable from any AC id.
- Every SPEC item MUST reference the FR and/or AC ids it implements; a SPEC
  item implementing nothing traceable MUST NOT exist.
- Context and rationale prose need no ids. **Anything that must be
  implemented MUST carry an id**: requirements as `SR-<CODE>-NNN`, design
  decisions as `DS-<CODE>-NNN`, buildable units as `CMP-<CODE>-NNN` (in the
  spec sidecar's `design:` block, each with a `serves:` list of SR ids),
  acceptance checks as `AC`/`SAC`. If an implementer would act on it, it is
  citable by id; if it only explains, it is prose.
- Plan phases, commits, and adjustments MUST cite the DS/CMP/SR ids they
  build or change; adjusting a DS appends a revision_history entry naming
  the id, sets its status to `adjusted`, and its `serves:` SRs and their
  ACs MUST be re-checked.
- Every generated artifact (data model, contract, fixture) MUST carry the
  spec-item or FR ids it realizes, in its header or sidecar metadata.
- Every plan phase MUST list the FR/AC ids it delivers, and its verify
  criteria MUST map to those ACs.
- Sidecars (PRD, SPEC, plan) MUST preserve the id chain unbroken so drift
  checks can walk PRD → SPEC → plan → code mechanically.
- NEVER rename or renumber a coded ID after the owning artifact leaves
  draft status — IDs are frozen at acceptance; corrections happen by
  deprecating and adding.
- NEVER introduce a deliverable without a trace — "no decision, no work" is
  the default; the escape hatch is recording the decision first.

## Examples

### Correct

```yaml
# PRD sidecar requirement
- id: FR-VAL-002
  component: validator
  text: "A Layer-2 semantic linter enforces what the schema cannot: ..."
  trace: ["DECISIONS #8 reaffirmed", "research 07:38-60"]
  status: proposed

# SPEC item referencing it
- id: SR-VAL-002 (spec requirement; SACs for spec-added criteria)
  implements: [FR-VAL-002, AC-VAL-002-1, AC-VAL-002-3]
  ...
```

### Incorrect

```yaml
# No component code, no trace, sequential id with no meaning:
- id: FR-011
  text: "Add a linter"
  status: proposed
# Violates: coded-ID rule, component: requirement, trace: requirement.
# There is no way to tell what part of the system this is or why it exists.
```

## When NOT to apply

- These rules do not apply to `docs/research/` — the append-only historical
  record predates the scheme and is never rewritten.
- These rules do not apply to the recipe documents themselves
  (`examples/*.rcp.yaml`) or registry entries — their identifier rules are
  the protocol's own (DECISIONS #23, registry-governance guideline), not
  this project-artifact scheme.
- Feature-scoped protections (SP-NNN) and open questions (OQ-N) keep their
  simple sequential ids — they are PRD-local by design.

---

*Created by edikt:guideline — 2026-08-02*

<!-- Compiled directives live in the co-located traceability.edikt.yaml sidecar. edikt never writes to this .md — edit prose only; run /edikt:guideline:compile to regenerate the sidecar. -->
