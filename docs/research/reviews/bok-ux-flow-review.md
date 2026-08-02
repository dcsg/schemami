# bok UX flow review — RCP cook-along execution flow

> **ERRATUM (2026-08-02, post-review):** The persona lens used in this review
> (Tomás/Inês/Marco) was mis-scoped — those are **Fornada-app personas**; RCP
> has none defined yet. The findings here rest mainly on persona-independent
> cognition (System 1/2, Hick's Law, Norman, Krug) and survive the correction,
> but any statement about *who* the cook is should be re-read as "a
> mobile-first home cook" generically until an RCP ICP/persona exercise runs.

- **Playbook:** `ux-flow-review`
- **Run ID:** `019fc26f-c9d7-7a5f-9269-51d695fe2d3b`
- **Date:** 2026-08-02
- **Status:** analysis complete, **not stored** (gate held — see bottom)
- **Reviewer:** bok UX flow review (System 1/2 + Krug lens)
- **Scope:** the 8-stage cook-along flow rendered from an RCP recipe on a phone (recipe card → scale → options/equipment/substitution → flattened step list → execution → checkpoints → safety bounds → completion), evaluated against `docs/product/research/recipe-protocol/00-PROPOSAL-rcp-v1.md` (D4b options, D6 duration/endpoint model, D7 constraints, D8/D8b/D8c substitutions & equipment) and `examples/alentejano.rcp.yaml`.
- **Personas held in mind:** Tomás (diáspora, cooks from phone, wants the heritage recipe to work far from Portugal), Inês (Lisboa home baker, mobile-first), Marco (international, least implicit context). None of them are reading this UI at a desk — all three are reading it in a kitchen.

---

## 0. Framing: this flow has two different cognitive regimes, and the risk is bleed between them

The single most important lens for this flow is Kahneman's dual-process model, glossed in the Engineering BoK via Stanovich & West's terminology as System 1 (implicit, fast, automatic) and System 2 (explicit, slow, effortful) — *DDD: The First 15 Years*, "Decision making and biases" — and independently via Norman's subconscious/conscious framing in *The Design of Everyday Things* ch. 7: "Subconscious … Fast, Automatic, Multiple resources … Conscious … Slow, Controlled, Limited resources … Invoked for novel situations: when learning, when in danger, when things go wrong."

Stages 1–4 of this flow (recipe card → scale → options/equipment/substitution → reviewed step list) happen **before** the cook's hands are in the dough. The user is seated, reading, deciding — System 2 is available and cheap to spend. Stages 5–8 (execution → checkpoints → safety refusals → completion) happen **during** the bake, often with flour, dough, or hot equipment on the cook's hands, attention split across a physical task. This is squarely System-1 territory, and Norman's chapter on error (ch. 5) is explicit about what that context does to people: interruptions and divided attention are "a clear enabler of memory lapses," multitasking causes "severe degradation of performance, increased errors," and — in the nurse example he gives — when a system demands input at the wrong moment, people route around it (writing vitals on their hand) in a way that defeats the system's own purpose.

RCP's own architecture (D4b, D8, D8c) already encodes the right answer to this: **all combinatorial complexity — options, substitutions, equipment branches, five sources of guard variation — resolves to one flattened step list before anything is shown to the cook.** That is stated directly in D4b: "The renderer resolves all active guards to a single flattened step list before showing anything to the cook; the combinatorics live at authoring/validation time." That is the correct call, and it is the load-bearing assumption of this whole review: **the protocol's flexibility is safe exactly as long as the UI honors that resolve-before-render boundary and never lets a decision point leak past stage 4.** Every finding below is either confirming that boundary holds for a given stage, or flagging a place the flow description suggests it might not.

---

## 1. Stage-by-stage findings

### Stage 1 — Recipe card (name, facets, yield)

Low risk. This is a recognition task (Krug, *Don't Make Me Think* ch. 1: "no question marks... every question mark adds to our cognitive workload"), and a card is a well-understood pattern. One thing to watch: `taxonomy` + `tags[]` + `kind` (§3 of the proposal) gives an author three places to hang labels on one recipe (`bread`, `pao`/`trigo`/`massa-velha`/`regional`, `alentejo`/`forno-a-lenha`/`dupla-fermentacao` in the worked example — 7 facet values total). Rendered flat as badges, that's a Hick's Law setup on the very first screen a cook sees, before they've decided to commit to anything. **Recommendation:** surface at most 2–3 facets on the card itself (kind + one or two curated tags); push the full taxonomy to a "details" disclosure. This is not a decision screen, so nothing here should compete with the name and yield for attention.

### Stage 2 — Yield/scale

Low risk, single decision, and it is the *right* single decision to ask first — everything downstream depends on it. The concern isn't the input, it's the invisible consequence: D3's `basis` mechanism means ratio-based quantities (hydration, salt, leaven) silently re-derive, and D7's safety constraints are evaluated against a basis that just changed. Norman's Gulf of Evaluation applies directly here (ch. 2 index, "feedback... make the results of each action apparent"): a cook who scales from 3×900g to 2×900g needs to *see* that the salt number changed, not just trust that it did, because salt is exactly the ingredient D7 calls out as safety-critical. **Recommendation:** any input that drives a `ratio`-basis recompute should visibly animate/highlight the derived numbers that changed, especially anything carrying a `severity: critical` constraint.

### Stage 3 — Options, equipment, substitutions (the highest-risk stage)

This is where the flow description asks the user to make **three independent choice-axis decisions in one stated step**: a toggle (autolise), a choice (equipment: wood oven vs. domestic), and a swap (substitution: lard → olive oil). By Hick's Law (BoK synthesis: "the time it takes for users to make a decision increases logarithmically as you increase their number of choices") this is the single densest decision surface in the entire flow, and it's compounded by the fact that these choices aren't independent of each other in outcome even though the UI may present them as independent controls — an equipment swap and an ingredient substitution can both touch the bake step's temperature curve (D8b explicitly: "Swapping a wood-fired oven for a domestic one changes the bake step's temperature curve and adds a steam step... structurally identical to swapping gelatine for agar").

Three concrete risks:

1. **Decision overload from co-presentation.** Krug's "mindless choices" chapter (ch. 4, via the BoK) is direct on this: when a choice can't be avoided, make it easy by narrowing to what's relevant and defaulting sensibly — "give me as much guidance as I need, but no more." Presenting toggle + choice + substitution simultaneously, each with consequence text, risks exactly the "20-field form" failure mode the Product-Led Onboarding source describes (BoK synthesis on Hick's Law / progressive disclosure): "more choices lead to users becoming overwhelmed." **Recommendation:** sequence these, don't co-present. Show the recipe pre-resolved with sensible defaults (author's `default: false` for the autolise toggle, primary equipment ref) and put each optional variation one tap away, not on the main path. This also matches D4b's own philosophy — options are opt-in complexity, and the UI should mirror that, not flatten it into a single wizard page.
2. **Consequence visibility at commit time, not after.** D8's `note`/`loses[]` fields ("Gives a less tender crumb and a different flavour... loses: [tenderiser]") and D8's `warn` field for method-changing swaps ("This stops being Pão Alentejano in the traditional sense") are exactly the "brief, timely, unavoidable" guidance Krug asks for (ch. 4: "brief... timely... unavoidable... my favorite example... LOOK RIGHT"). The risk is implementation, not design: if these strings render only after the user has already applied the substitution (a "you did a thing, here's a toast" pattern) rather than inline before commit, the guidance arrives too late to inform the decision — it becomes a dismissible notification instead of a considered warning. **Recommendation:** render `note`/`loses`/`warn` in the selection UI itself, before the tap that commits.
3. **Step-list reshaping must be legible, not just correct.** The flow description says each choice "may reshape the visible step list via guards." Mechanically this is fine (D4b's two-mix-step pattern in `alentejano.rcp.yaml` — `misturar` vs `misturar-pos-autolise`, both `produces: massa-misturada`). But from the cook's side, this is where Norman's "visibility of system status" and Krug's recognition-over-recall collide with a System-2-then-System-1 handoff: a decision made in stage 3 has a consequence the cook won't *see* until stage 5, possibly hours later, hands in dough. If the reshaping isn't reflected back clearly in stage 4's step list (not just silently having fewer/different steps), the cook arrives at execution time unable to recall *why* the mix step looks unfamiliar. This is Norman's "knowledge in the head" problem exactly (ch. 3/ch. 7): don't make the cook remember a decision from stage 3 in order to understand stage 5.

### Stage 4 — Flattened step list, prep-track backward-scheduled

This is the right place for the cook's last System-2-heavy read before hands get dirty, and D4/D5's DAG model earns its keep here: the backward-scheduled prep track (starter refresh scheduled from target bake time) is a planning aid, not an in-the-moment decision, so it's appropriately dense. One flag: this list is also the first and *only* opportunity to confirm the stage-3 choices actually took, per the Norman "Gulf of Evaluation" point above. **Recommendation:** if a guard changed anything (a step swapped, an ingredient substituted, an equipment-driven parameter shift per D8c level 1), stage 4 should say so explicitly next to the affected step ("mix step shortened — autolyse applied") rather than presenting a step list indistinguishable in *presentation* from the unmodified default, even though its *content* differs. Otherwise the resolve-before-render boundary is honored mechanically but violated experientially.

### Stage 5 — Execution: duration windows, sensory endpoints, timers, media, expandable troubleshooting

This is the System-1 core of the flow, and it's mostly well-specified by the protocol itself:

- **Correct pattern already in the spec:** troubleshooting cues as *expandable* (not shown by default) is exactly the progressive-disclosure principle the BoK synthesis names ("only a few essential options are shown to users, but a broader set is displayed upon request... reduces cognitive workload"). Keep this.
- **Risk: three-number duration windows on a glance-read screen.** D6's `{min, target, max}` model is the right authoring-time representation (honest about lamination-rest-style two-sided failure), but rendering all three numbers as equally weighted UI elements during execution reintroduces exactly the "question mark" tax Krug warns about — a cook glancing at a proofing timer with flour on their hands should not have to parse three numbers to know what to do next. **Recommendation:** one primary glanceable number (`target`, or "time remaining toward target"), with `min`/`max` folded into the same expandable disclosure pattern already used for troubleshooting cues. Multiple `until` endpoints ("+50% volume OR poke test springs back slowly") are good UX as specified — Norman/DOET's "multiple sensory modalities" point (ch. 3: "present different information over different modalities... sight, sound, touch") supports showing a visual/photo cue alongside the text test, which D9's media-on-steps already provides for exactly this reason (moldagem video, bulk-ferment photo in the worked example).
- **Media as technique-recall, not technique-teaching, mid-bake.** D9 media is unambiguously right to have, but the *moment* it's offered matters: a cook re-watching a moldagem video with wet dough on their hands cannot easily operate a video scrubber. This isn't a protocol-level concern (media URIs and licensing are fine as specified) but an execution-surface concern worth flagging given the "flour on hands" framing of this task: playback controls at this stage need to tolerate imprecise/gloved/wet touch input, and ideally support hands-free triggering (voice, or a single big tap-to-replay with no seek bar).

### Stage 6 — Checkpoint readings (dough temp, volume estimate) re-estimating remaining time

**This is the flow's single highest System-1-violation risk**, and it's worth stating plainly: asking a cook mid-bake to *produce a numeric estimate* (dough temperature, "volume est.") is a System-2 task — comparison, judgment, data entry — injected into a stretch of the flow that everything else in this review has been arguing must stay System-1. Norman's interruption research (ch. 5, echoed in the nurse anecdote in ch. 3 — clinicians writing vital signs on their own hands rather than fight a system that logs them out mid-interruption) is the direct precedent: when a system asks for input at a moment the user's hands and attention are elsewhere, users don't comply cleanly, they route around the system or abandon the input. A cook with dough on their hands is not going to type "24.3" into a temperature field; they will either skip it, guess, or go wash their hands and lose their place.

**Recommendations, in order of preference:**
1. Prefer sensor/passive capture over manual entry wherever feasible (this is a longer-term product question, not a stage-6 UI fix, but worth flagging since it removes the problem rather than mitigating it).
2. Where manual entry is unavoidable, replace typed numeric fields with large-target steppers or a coarse visual picker (e.g., three volume-estimate photos to tap: "less than doubled / about doubled / more than doubled" — this also matches the qualitative language D6's `until.sensory` already uses, "volta lentamente," rather than forcing false numeric precision).
3. Make checkpoint entry **explicitly optional with a sane fallback** (system keeps using `target` duration if no reading is given) rather than a gate the cook must clear to proceed — the flow description doesn't say whether skipping is possible, and it should be, unambiguously.
4. When the re-estimate changes the visible timer, say why in one short phrase ("dough cooler than target — bulk extended ~25 min") — this is Norman's Gulf of Evaluation again, and it's what stops the re-estimation from feeling arbitrary or untrustworthy at the exact moment trust matters most (mid-ferment, unable to easily verify).

### Stage 7 — Safety-critical bounds refuse dangerous edits (e.g., salt below 2% in a ferment)

The mechanism is correct and well-specified (D7: "Neither the scaler nor the substitution engine may produce a document that violates a `critical` constraint; it must refuse and explain"), and it directly implements Norman's error-prevention principle from ch. 5/ch. 7: "adding constraints to actions... blocks errors" combined with "assist rather than punish." The `reason` field in D7's worked example ("below 2% brine, lacto-fermentation is not reliably safe") already satisfies Norman's requirement that constraints come with plain-language explanation, not a silent refusal.

Two things to get right in the UI, both about *when* this fires:

1. **This belongs in stage 3, not stage 6.** A salt-ratio edit is a stage-3-class action (a substitution or a manual ingredient override), and it should refuse **at the moment of the edit**, while the cook is still in a System-2 decision context and can absorb an explanation. If the same class of edit is somehow reachable during execution (stage 5–6, e.g. "adjust seasoning" mid-bake), the refusal needs to be even more terse — a cook mid-task has less patience for a paragraph of explanation than one deciding what recipe to bake tonight.
2. **Refuse-and-explain is not refuse-and-strand.** Norman's own framing is "assist rather than punish or scold" — a hard refusal with no path forward reproduces the worst of form-validation UX (Krug ch. 1's "puzzling error at the end" is the negative example). **Recommendation:** the refusal should offer the nearest safe value or point at the catalog substitution that *does* clear the constraint, not just block.

### Stage 8 — Completion, actuals saved for calibration

Low risk, and correctly placed after the task, where System 2 is available again. The existing `BakeSession` pattern (already in the codebase per the proposal's §5 migration note) records actuals to calibrate the next bake — this should be **passive** (auto-derived from stage 5/6 timer and checkpoint data already captured) rather than asking the cook to fill in a post-bake form. Any manual add here should be optional annotation ("how did it turn out?"), not required data entry, for the same reason as stage 6: don't add System-2 tasks to a moment that follows a long System-1 stretch and (for a bread bake) usually several hours of low blood sugar and patience.

---

## 2. Cross-cutting findings

1. **The protocol's flexibility is not itself the risk — leakage of that flexibility past stage 4 is.** D4b's "resolve all guards before rendering" principle is the correct architectural answer to the brief's central worry (options/substitutions/equipment/execution_mode overwhelming a System-1 cook). The review found no place in the *protocol* design that violates this. The risk is entirely in the **UI's fidelity to that boundary**: stage 3 must feel like a considered, sequenced, defaultable decision session (System 2, seated, clean hands), and stages 5 onward must never re-ask, re-confirm, or silently vary based on a choice the cook doesn't currently have in view. Stage 4 is the seam — it's the only screen positioned to both look back (confirm stage-3 choices took effect) and look forward (prep the cook for stage 5), and it's currently under-specified for that job.
2. **Hick's Law compounds across the flow, not just within stage 3.** Even though each individual stage may look like "one decision," a cook who has just made 3 choices in stage 3 arrives at stage 4 already having spent decision budget — this argues for defaults-heavy stage 3 (most cooks should be able to tap "start" with zero customization) rather than assuming customization is the common path.
3. **Every mandatory data-entry point mid-execution (stage 6 specifically) is a System-1 violation risk regardless of how well it's laid out**, because the violation is about *when* input is requested, not how the input control is drawn. This is the one place in the flow where the recommendation is "make it skippable and passive-first," not "design it better."
4. **The `note`/`loses`/`warn` prose fields already in D8 are doing real UX work and should not be treated as secondary metadata.** They are the mechanism by which this protocol implements Krug's "brief, timely, unavoidable" guidance principle for its hardest decisions (substitutions, method changes). Losing them in the eventual UI (e.g., collapsing them into a generic "i" info icon nobody taps) would silently remove the safety/quality communication the protocol was designed to carry.

---

## 3. Recommendations summary (priority order)

| # | Stage | Recommendation | Why |
|---|---|---|---|
| 1 | 6 | Make checkpoint readings optional, default to system estimate if skipped; replace typed numeric entry with coarse tap targets or passive capture where feasible | Highest System-1 violation risk in the flow (Norman, interruption/STM research) |
| 2 | 3 | Sequence options/equipment/substitution choices rather than co-presenting; default to the un-customized path as the fast lane | Hick's Law; Krug "mindless choices" |
| 3 | 3 | Render substitution `note`/`loses`/`warn` inline before commit, not as a post-hoc toast | Krug "brief, timely, unavoidable" guidance |
| 4 | 4 | Explicitly flag which steps were reshaped by stage-3 choices, next to the affected step | Norman "visibility of system status" / Gulf of Evaluation; prevents recognition-over-recall failure hours later at execution |
| 5 | 5 | Collapse `{min, target, max}` duration windows to one primary glanceable number, with the full window behind the same expandable pattern already used for troubleshooting cues | Krug "question mark" cognitive tax; consistency with the protocol's own progressive-disclosure pattern |
| 6 | 7 | Fire critical-constraint refusals at the point of edit (stage 3, or wherever the edit control lives) with a suggested safe alternative, not a dead-end block | Norman "assist rather than punish"; D7's own `reason` field already supports this |
| 7 | 2 | Visibly highlight ratio-derived quantities (especially `severity: critical` ones like salt) when yield/scale changes | Gulf of Evaluation — invisible math is untrustworthy math |
| 8 | 1 | Cap visible facets/badges on the recipe card to 2–3; push full taxonomy to a details disclosure | Avoid Hick's Law on the very first screen |
| 9 | 8 | Keep post-bake capture passive/auto-derived from session data; any manual field is optional | Same fatigue argument as stage 6, at the opposite end of the task |

---

## Ready to store

The store step was **not executed** per the task's hold gate. If/when approved, the exact call is:

```json
{
  "tool": "mcp__bok__store_artifact",
  "arguments": {
    "target": "recipe-protocol-rcp",
    "artifact_type": "ux-flow-review",
    "team": "ux-expert",
    "run_id": "019fc26f-c9d7-7a5f-9269-51d695fe2d3b",
    "title": "RCP cook-along execution flow — UX review (System 1/2 + Krug)",
    "summary": "8-stage phone cook-along flow reviewed against Kahneman/Stanovich-West System 1/2, Norman (Design of Everyday Things), and Krug (Don't Make Me Think). Core finding: RCP's D4b guard-resolution-before-render principle correctly isolates decision complexity (options/substitutions/equipment) to the pre-bake stages (1-4, System 2 available); the flow only risks overwhelming a flour-handed System-1 cook where that boundary leaks past stage 4 or where mandatory data entry (stage 6 checkpoints) is injected mid-execution. Nine prioritized recommendations produced, none blocking the protocol design itself — all are UI/flow-sequencing fixes.",
    "findings": [
      "Stage 3 (options/equipment/substitution) co-presents 3 independent choice axes in one step — Hick's Law risk; recommend sequencing + defaults-first fast lane",
      "Stage 6 (checkpoint readings) asks for System-2 data entry mid-System-1 task with likely-dirty hands — highest-risk stage in the flow; recommend optional/skippable + passive capture",
      "D4b's resolve-before-render guard architecture is sound and is the reason the rest of the flow is tractable; risk is UI fidelity to that boundary, not the protocol",
      "D8's note/loses/warn substitution fields are load-bearing UX (Krug 'brief, timely, unavoidable') and must render inline pre-commit, not post-hoc",
      "D6 duration windows {min,target,max} risk over-displaying three numbers on a glance-read execution screen; recommend one primary number + expandable detail",
      "D7 safety refusals are well-specified (refuse + reason) but must fire at edit-time (stage 3) and offer a safe alternative, not just block (Norman: assist not punish)",
      "Stage 4 (flattened step list) is the only seam that can confirm stage-3 choices took effect before execution; currently under-specified for that confirmation role"
    ],
    "recommendations": [
      "Make stage-6 checkpoint entry optional with system-estimate fallback; prefer coarse tap targets or passive sensor capture over typed numeric fields",
      "Sequence stage-3 choices (option toggle, equipment, substitution) rather than co-presenting; default to zero-customization fast path",
      "Render substitution note/loses/warn inline before commit",
      "Flag reshaped steps explicitly in stage 4's step list, tied to the stage-3 choice that caused the change",
      "Collapse duration windows to one primary number during execution; keep min/max behind the existing troubleshooting-cue disclosure pattern",
      "Fire critical-constraint refusals at edit time with a suggested safe alternative",
      "Highlight ratio-derived quantity changes (esp. safety-critical ones) visibly on yield/scale change",
      "Cap recipe-card facet badges to 2-3, push full taxonomy to a details view",
      "Keep post-bake actuals capture passive/auto-derived; manual fields optional only"
    ],
    "sources_cited": [
      "Don't Make Me Think — Steve Krug (ch. 1 'Things that make us think', ch. 4 'Why users like mindless choices')",
      "The Design of Everyday Things — Don Norman (ch. 2 Gulfs of Execution/Evaluation, ch. 3 memory & interruption, ch. 5 human error & constraints, ch. 7 index cross-refs)",
      "DDD: The First 15 Years — DDD Community, 'Are you building the right thing?' (Kahneman/Stanovich & West System 1/2 framing)",
      "BoK concept synthesis: Cognitive Load (A Philosophy of Software Design, Product-Led Onboarding, Team Topologies)",
      "BoK concept synthesis: Progressive Disclosure (Product-Led Onboarding)",
      "BoK concept: Hick's Law",
      "docs/product/research/recipe-protocol/00-PROPOSAL-rcp-v1.md — D3, D4, D4b, D5, D6, D7, D8, D8b, D8c, D9",
      "docs/product/research/recipe-protocol/examples/alentejano.rcp.yaml"
    ]
  }
}
```

**Gate held:** `store_artifact` was not called and the playbook run was not marked completed, per the task instructions. Call `get_playbook_run("019fc26f-c9d7-7a5f-9269-51d695fe2d3b")` for run status, and re-run the JSON above through `mcp__bok__store_artifact` explicitly if/when the analysis is approved.
