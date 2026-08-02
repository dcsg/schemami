// RCP declarative constraints (DS-VAL-003 adjusted; DECISIONS #8).
// RELATION LOGIC ONLY — every number arrives in the exported facts, read
// from the profile schemas' x-rcp-bounds. Restating a numeric bound in
// this file is a defect (single-sourcing, DS-PR-004).
package rcp

#Check: {
	doc:       string
	bound:     string
	of?:       string
	min:       number
	max:       number
	value:     number & >=min & <=max
	severity:  string
	reason_en?: string
	reason_pt?: string
}

checks: [...#Check]

// Advisories: warn-severity bound findings (DS-PROF-002). Present in the
// facts payload for explain-bounds to surface; the value is deliberately
// NOT range-constrained here — advisories inform, they never gate.
#Advisory: {
	doc:       string
	bound:     string
	of?:       string
	min:       number
	max:       number
	value:     number
	severity:  string
	reason_en?: string
	reason_pt?: string
}

advisories: [...#Advisory]
