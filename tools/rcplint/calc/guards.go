package calc

import "fmt"

// fn: selectGuardPath (R-GUARD-1..3). Selection resolves option values
// (defaults applied) plus the contextual dimensions the guard grammar
// admits (execution_mode, equipment, substitution, diet).

// Selection is the caller's choice set.
type Selection struct {
	Options       map[string]any // toggle id -> bool, choice id -> string
	ExecutionMode string
	Equipment     []string
	Substitution  []string
	Diet          []string
}

// SelectGuardPath returns the active steps of the scope for the
// selection, or an error when the selection is unsatisfiable
// (R-GUARD-2: unknown option / out-of-enum choice — unresolvable, never
// an empty path).
func SelectGuardPath(scope map[string]any, sel Selection) ([]map[string]any, error) {
	resolved, err := resolveSelection(scope, sel)
	if err != nil {
		return nil, err
	}
	var active []map[string]any
	if steps, ok := scope["steps"].([]any); ok {
		for _, sv := range steps {
			sm, ok := sv.(map[string]any)
			if !ok {
				continue
			}
			g, hasGuard := sm["when"].(map[string]any)
			if !hasGuard || guardMatches(g, resolved, sel) {
				active = append(active, sm)
			}
		}
	}
	return active, nil
}

func resolveSelection(scope map[string]any, sel Selection) (map[string]any, error) {
	resolved := map[string]any{}
	opts, _ := scope["options"].([]any)
	known := map[string]map[string]any{}
	for _, ov := range opts {
		om, ok := ov.(map[string]any)
		if !ok {
			continue
		}
		id, _ := om["id"].(string)
		known[id] = om
		if d, has := om["default"]; has {
			resolved[id] = d
		} else if om["kind"] == "toggle" {
			resolved[id] = false
		}
	}
	for id, v := range sel.Options {
		om, ok := known[id]
		if !ok {
			return nil, fmt.Errorf("selection names unknown option %q", id)
		}
		if om["kind"] == "choice" {
			s, isStr := v.(string)
			if !isStr || !inChoices(om, s) {
				return nil, fmt.Errorf("selection %v not among option %q choices", v, id)
			}
		}
		resolved[id] = v
	}
	return resolved, nil
}

func inChoices(om map[string]any, s string) bool {
	if cs, ok := om["choices"].([]any); ok {
		for _, cv := range cs {
			if c, ok := cv.(string); ok && c == s {
				return true
			}
		}
	}
	return false
}

// guardMatches implements the core guard grammar: every present key must
// match; string-or-array values are any-of; option supports toggles and
// "id:value" choices; not recurses (R-GUARD-1).
func guardMatches(g map[string]any, resolved map[string]any, sel Selection) bool {
	for key, val := range g {
		switch key {
		case "not":
			if inner, ok := val.(map[string]any); ok {
				if guardMatches(inner, resolved, sel) {
					return false
				}
			}
		case "option":
			if !anyOf(val, func(s string) bool { return optionMatches(s, resolved) }) {
				return false
			}
		case "execution_mode":
			if !anyOf(val, func(s string) bool { return s == sel.ExecutionMode }) {
				return false
			}
		case "equipment":
			if !anyOf(val, func(s string) bool { return contains(sel.Equipment, s) }) {
				return false
			}
		case "substitution":
			if !anyOf(val, func(s string) bool { return contains(sel.Substitution, s) }) {
				return false
			}
		case "diet":
			if !anyOf(val, func(s string) bool { return contains(sel.Diet, s) }) {
				return false
			}
		}
	}
	return true
}

func optionMatches(expr string, resolved map[string]any) bool {
	for i := 0; i < len(expr); i++ {
		if expr[i] == ':' {
			id, want := expr[:i], expr[i+1:]
			got, _ := resolved[id].(string)
			return got == want
		}
	}
	return isTrue(resolved[expr])
}

func anyOf(val any, match func(string) bool) bool {
	switch v := val.(type) {
	case string:
		return match(v)
	case []any:
		for _, e := range v {
			if s, ok := e.(string); ok && match(s) {
				return true
			}
		}
	}
	return false
}

func contains(list []string, s string) bool {
	for _, e := range list {
		if e == s {
			return true
		}
	}
	return false
}
