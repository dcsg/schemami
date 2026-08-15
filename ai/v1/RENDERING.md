# Schemami AI rendering profile v1

This profile is informative. The exact Schemami JSON candidate is authoritative;
all rendered cards, prose, and controls are presentation-layer views. A renderer
must show `Unverified candidate` until conformant deterministic admission succeeds.

## Capability ladder

Use the first capability the host can satisfy safely:

1. a future Schemami native UI tool, when an explicitly installed integration
   admits and renders the exact bytes;
2. a single-page HTML or artifact generated from `recipe-card.html` exactly as
   described below;
3. a Markdown preview;
4. JSON only.

Do not synthesize a different executable page when the published HTML template
cannot be used safely. Fall back to Markdown. Rendering must not call a provider,
fetch external resources, store the recipe, or run Recipe Calculus.

## HTML artifact

`recipe-card.html` is self-contained and makes no network request. To create a
host artifact:

1. keep the original candidate JSON separately;
2. replace the sole `{}` text node inside
   `<script id="schemami-document" type="application/json">{}</script>` with the
   complete candidate JSON;
3. before insertion, escape every literal `<` as `\u003c` and U+2028/U+2029 as
   `\u2028`/`\u2029`; these escapes preserve the JSON value while preventing the
   data from terminating or corrupting the script element;
4. do not add scripts, external assets, analytics, storage, or network access;
5. show the result only as a preview. Submit the separately retained exact JSON
   bytes—not HTML-extracted or re-encoded bytes—to deterministic admission.

The template uses DOM `textContent` for authored values and never interprets
recipe prose as HTML. Its download control exports the embedded presentation
copy; it is convenient, but it is not evidence that those bytes equal the
original candidate bytes.

## Markdown fallback

Render only fields present in the candidate, in authored order:

```text
# <title>
Unverified Schemami v1 candidate · <content_language>

## Ingredients
- <quantity as authored> <name>

## Method
1. <instruction>
   - Duration: <authored duration>
   - Completion: <authored cue>

## Unresolved source facts
- <fact that could not be represented without guessing>
```

Do not invent section names, convert units, calculate formula results, flatten
conditions, select alternatives, or hide unresolved facts for presentation.

## Host-specific behavior

Interfaces such as Claude Artifacts may render a self-contained HTML page.
Other chats may support only Markdown or downloadable JSON. The capability
difference does not change the Schemami candidate, its identity, or its
admission result. No provider is required or certified by this profile.

Fragment viewer links, remote MCP/MCP Apps resources, hosted storage, and native
provider widgets are deferred; they are not part of the v1 AI kit.
