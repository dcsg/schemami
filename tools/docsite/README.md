# docsite — PROTOTYPE

Throwaway spike for PRD-005 (FR-TOOL-006). Nothing here is load-bearing:
no gate depends on it, `make accept` does not run it, and it may be
deleted or rewritten wholesale once SPEC-005 is authored.

It exists to answer three questions a document cannot:

1. Does the information architecture work for a stranger? (FR-DOC-006)
2. What does a *proper* viewer shell need, as opposed to the v0.4 PoC?
3. Does build-time rendering from the repo actually stay clean? (FR-DOC-001)

Run: `bun run tools/docsite/build.ts` → `tools/docsite/dist/`
