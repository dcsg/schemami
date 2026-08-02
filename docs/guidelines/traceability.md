# Traceability Guidelines

**Purpose:** Every requirement, spec item, artifact, plan phase, and sidecar carries an identifier that names its component and a trace to its origin — so any line of work can be walked back to the decision or research that justified it, and forward to the code that delivers it.

## Rationale

RCP's founding failure mode is drift: five recipe representations with no
shared type, three divergent baker's-percentage implementations. The same
disease infects project artifacts when a spec item can't be traced to a
requirement, or a plan phase delivers work no decision asked for. PRD-001
adopted component-banded identifiers (2026-08-02) precisely so that "which
part of v0.1 is this?" is answerable from the ID alone; this guideline makes
the scheme binding down the whole chain: PRD → SPEC → artifacts → plans →
sidecars.

## Rules

- Every PRD functional requirement MUST use a component-banded ID:
  FR-1xx `protocol-core`, FR-2xx `registry`, FR-3xx `profiles`,
  FR-4xx `validator`, FR-5xx `safety-clamp`. New components MUST be added
  to this guideline (new band) before use — never invented ad hoc.
- Every PRD requirement MUST carry a `component:` field naming its band and
  a `trace:` list referencing at least one DECISIONS.md entry, research
  file, or recorded inventory that justifies it.
- Acceptance criteria MUST inherit their FR's number (AC-NNN-M with NNN the
  FR number), so the component band is readable from any AC id.
- Every SPEC item MUST reference the FR and/or AC ids it implements; a SPEC
  item implementing nothing traceable MUST NOT exist.
- Every generated artifact (data model, contract, fixture) MUST carry the
  spec-item or FR ids it realizes, in its header or sidecar metadata.
- Every plan phase MUST list the FR/AC ids it delivers, and its verify
  criteria MUST map to those ACs.
- Sidecars (PRD, SPEC, plan) MUST preserve the id chain unbroken so drift
  checks can walk PRD → SPEC → plan → code mechanically.
- NEVER renumber a banded ID after the owning artifact leaves draft status —
  IDs are frozen at acceptance; corrections happen by deprecating and adding.
- NEVER introduce a deliverable without a trace — "no decision, no work" is
  the default; the escape hatch is recording the decision first.

## Examples

### Correct

```yaml
# PRD sidecar requirement
- id: FR-402
  component: validator
  text: "A Layer-2 semantic linter enforces what the schema cannot: ..."
  trace: ["DECISIONS #8 reaffirmed", "research 07:38-60"]
  status: proposed

# SPEC item referencing it
- id: SI-402-1
  implements: [FR-402, AC-402-1, AC-402-3]
  ...
```

### Incorrect

```yaml
# No component, no trace, sequential id with no band meaning:
- id: FR-011
  text: "Add a linter"
  status: proposed
# Violates: banded-ID rule, component: requirement, trace: requirement.
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
