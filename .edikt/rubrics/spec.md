# SPEC Evaluator Rubric

Score each item 0 (missing/weak) or 1 (strong). Threshold inherits the
source PRD's rigor: solo: 7/10  team: 8/10  platform: 9/10.

## Rubric

- [ ] Summary states what, why, and the approach in one paragraph
- [ ] Existing architecture is referenced concretely (files, patterns) or explicitly greenfield
- [ ] Every SPEC requirement uses MUST/MUST NOT language and is independently testable
- [ ] FR coverage is complete: every upstream FR covered or explicitly deferred with rationale; uncovered list empty
- [ ] PRD ACs passed through verbatim with unchanged IDs; spec-added criteria use SAC ids
- [ ] Non-goals are listed (not empty)
- [ ] Alternatives considered with specific rejection reasons (not strawmen)
- [ ] Risks table has impact, likelihood, mitigation AND rollback per risk
- [ ] Testing strategy names positive suite, negative fixtures, and what's hard to test
- [ ] No blocking NEEDS CLARIFICATION in requirements or ACs (implementation-time flags allowed if non-blocking and bounded)

_Users can edit this rubric; overrides live here._
