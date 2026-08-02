# Registry governance — v0 (solo phase)

Policy for changes to the RCP Registry (ingredient classes, step primitives,
equipment profiles). Established by decision #20 (2026-08-02). This is the
lightweight, single-editor version; full multi-contributor governance is
deferred until a second contributor actually exists.

## Rules

1. **Sole approver: Daniel.** Every addition or change to a registry
   vocabulary is approved by him — today that means his own PRs; tomorrow it
   means he reviews others'.
2. **Additions via PR**, never direct edits — even solo. The PR description
   states *why* the entry is needed (which recipe or profile demanded it).
3. **Append-only.** Registry entries are never deleted or repurposed.
   Mistakes are handled by deprecating the entry (marked, kept resolvable)
   and adding a corrected one. Published recipes must keep resolving forever.
4. **Versioned.** Registry changes bump the registry version; recipes
   reference entries by stable ID, and publish-time resolution pins
   resolver_version + content hashes (engineering obligation #3).
5. **Naming conventions.**
   - IDs are stable, lowercase, dot-namespaced English slugs
     (`ingredient.flour.wheat.t65`, `primitive.fold`, `equipment.oven.deck`).
     IDs never encode display names and never change once merged.
   - Flour types are always explicit (T65, T80, T130, …).
   - Display names may be localized (pt-PT terms kept exact — massa velha ≠
     isco); the ID is not.
6. **IDs are ontology paths.** The dot-namespaced id encodes the taxonomy
   (`ingredient.spice.cinnamon.ground`): functionally distinct forms of
   one ingredient MUST be siblings under the shared node
   (`…cinnamon.ground` / `…cinnamon.stick` — ground disperses, the stick
   infuses and is removed; never 1:1 substitutable). Form-as-gesture
   (grinding at use, melting, dicing) is `prep` on the usage and NEVER
   mints. Consumers MUST be able to resolve an ingredient family by id
   prefix (`ingredient.spice.cinnamon.*` finds every form).
7. **Required fields before merge**: stable ID, kind (ingredient class /
   primitive / equipment profile), display name, definition prose, and the
   machine-read fields the schema demands for that kind (e.g. functional
   roles for ingredient classes, parameters for equipment profiles). An
   entry that a machine reads must be complete for the maths it
   participates in.
8. **No invention at ingestion time.** The extraction pipeline may only map
   to existing registry entries or flag a gap for review — it never mints
   IDs. New entries always arrive through this process.

## When contributors exist

Revisit for: review roles beyond a single approver, deprecation policy at
scale, and a dispute path. Tracked as part of decision #20.
