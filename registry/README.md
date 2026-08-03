
## The extraction rule (binding, v0.4)

When a source names a sub-preparation inside a method — *"faça um roux"*,
*"add White Sauce I"* — the ingestion decision is not a judgement call:

- **The source gives its method** → lift it to an **inline component**
  with its own steps. Nothing is parked in prose.
- **The source names it without a method** → make it a **class
  reference**. Never invent the steps the source did not give.
- **Prose is never silently dropped.** If neither applies, the mention
  stays visible in the document and the linter reports it.

The linter enforces the second half, because that is the half a machine
can see: a mention that anchors to nothing is reported (SR-REG-002).
Two detectors, both deliberately conservative —

1. step prose names a **teachable** preparation (a registry class
   carrying `canonical_recipe`) that nothing in the document anchors;
2. an authored pattern (`faça um X`, `make a X`) whose X the registry
   cannot name — a vocabulary gap, surfaced rather than guessed at.

Neither invents a resolution. Which roux a mention means is authored or
curated, never inferred; the linter only tells you the mention has
nowhere to go.
