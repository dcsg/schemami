# Use Schemami with an AI

An AI can propose a Schemami recipe, but it cannot make the recipe valid or
computable. Schemami's deterministic validator and SDKs remain the authority.

## Direct AI workflow

1. Give the AI your recipe source: a photograph, PDF, pasted web content, text,
   transcription, or application export.
2. Paste the prompt below. The versioned `/ai/v1` workflow tells the AI how to
   inspect the source, ask only necessary questions, preserve uncertainty, and
   return one strict-JSON candidate.

```text
Follow https://schemami.dev/ai and help me convert the attached recipe into one
source-faithful, untrusted Schemami v1 JSON candidate. Interview me only when a
fact is illegible, materially ambiguous, or required; never guess. Preserve the
source language and authored order. After the JSON candidate, show a readable
recipe preview if your interface supports it, but keep the JSON authoritative.
```

If the AI cannot load the URL, attach `ai/v1/INSTRUCTIONS.md` and
`schema/schemami-v1-core.schema.json` from the release. For automation, append
`OUTPUT: JSON_ONLY` to suppress the preview and explanation.

3. Answer only questions you can answer honestly. `Unknown`, `not stated`, and
   `keep unresolved` are valid responses when the schema permits them. Facts you
   add while authoring must not be represented as facts visible in the source.
4. Save the JSON candidate as `candidate.schemami.json`. A Markdown or HTML
   recipe card is only a presentation view; it does not validate the candidate.
5. Admit the exact JSON bytes with the playground, CLI, or one of the SDKs.
   Admission may accept the document or
   return stable problems with RFC 6901 pointers.

```sh
tools/with-toolchain.sh go -C tools/schemami run . admit \
  /path/to/candidate.schemami.json
```

6. If admission refuses, give the AI the complete candidate and the deterministic
   problem list. Ask for a complete replacement document; never ask it to bypass
   or delete a problem without correcting the addressed value.

```text
Return a complete replacement Schemami JSON object. Correct the deterministic
problems below using their RFC 6901 pointers. Preserve every unaffected authored
fact and do not invent missing source facts. Output JSON only.

<paste admission problems here>
```

The exact versioned workflow, rendering profile, artifact template, and digest
manifest are published under `ai/v1/`. The unversioned `/ai` page is the human
and AI entry point; released `/ai/v1` bytes are immutable.

## SDK workflow

An application owns source access, OCR, transcription, scraping, AI calls,
storage, mappings, and UI. It passes the returned bytes to Schemami:

```text
source -> application-selected AI/OCR/parser -> untrusted candidate
       -> Schemami parse/admit -> Calculus and Diff -> application review
```

- Go: `sdk/go`
- TypeScript: `sdk/typescript`
- Swift: `sdk/swift`

Use exact submitted bytes for review and only admitted handles for Recipe
Calculus. A valid unfamiliar recipe may remain readable even when an application
cannot project it into its own domain model.

## Optional acquisition evidence

Integrators that need source coverage, adapter provenance, and a reproducible
repair exchange can additionally use
`acquisition/source-to-candidate/1/INSTRUCTIONS.md` and its request, report, and
repair schemas. This advanced contract is not required for the direct AI
workflow and never changes recipe identity or deterministic admission.
