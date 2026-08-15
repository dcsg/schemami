package calculus

import (
	"math/big"
	"sort"
)

type composedStep struct {
	path     string
	id       string
	after    []string
	duration *big.Int
	start    *big.Int
	end      *big.Int
	order    int
	object   map[string]any
}

func (context *operationContext) composedReadingOrder() Envelope {
	steps, notices, problem := context.collectComposedSteps(context.root, "", map[string]bool{})
	if problem != nil {
		return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
	}
	if len(steps) == 0 {
		return refused(context.operation, "missing-fact", "/recipe/method/sequence")
	}
	index := map[string]int{}
	for position, step := range steps {
		index[instanceStepKey(step.path, step.id)] = position
	}
	indegree := make([]int, len(steps))
	dependents := make([][]int, len(steps))
	for position, step := range steps {
		for _, dependency := range step.after {
			dependencyIndex, present := index[dependency]
			if !present {
				problem := Problem{Type: problemBase + "unresolved-reference", Pointer: "/recipe/method"}
				return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{problem}}
			}
			indegree[position]++
			dependents[dependencyIndex] = append(dependents[dependencyIndex], position)
		}
	}
	used := make([]bool, len(steps))
	result := make([]any, 0, len(steps))
	for len(result) < len(steps) {
		selected := -1
		for position := range steps {
			if !used[position] && indegree[position] == 0 && (selected < 0 || steps[position].order < steps[selected].order) {
				selected = position
			}
		}
		if selected < 0 {
			return refused(context.operation, "dependency-cycle", "/recipe/method")
		}
		used[selected] = true
		result = append(result, map[string]any{"component_path": pathArray(steps[selected].path), "id": steps[selected].id})
		for _, dependent := range dependents[selected] {
			indegree[dependent]--
		}
	}
	return Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"steps": result, "unplaced_components": notices}}
}

func (context *operationContext) composedSchedule() Envelope {
	steps, notices, problem := context.composeScheduleInstance(context.root, "", map[string]bool{})
	if problem != nil {
		return Envelope{Operation: context.operation, Status: "refused", Problems: []Problem{*problem}}
	}
	if len(steps) == 0 {
		return refused(context.operation, "missing-fact", "/recipe/method/sequence")
	}
	minimum := new(big.Int).Set(steps[0].start)
	for _, step := range steps[1:] {
		if step.start.Cmp(minimum) < 0 {
			minimum.Set(step.start)
		}
	}
	shift := new(big.Int).Neg(minimum)
	for _, step := range steps {
		step.start.Add(step.start, shift)
		step.end.Add(step.end, shift)
	}
	sort.SliceStable(steps, func(i, j int) bool {
		if comparison := steps[i].start.Cmp(steps[j].start); comparison != 0 {
			return comparison < 0
		}
		return steps[i].order < steps[j].order
	})
	result := make([]any, len(steps))
	for index, step := range steps {
		result[index] = map[string]any{
			"component_path": pathArray(step.path), "id": step.id,
			"start": formatElapsed(step.start), "duration": formatElapsed(step.duration), "end": formatElapsed(step.end),
		}
	}
	return Envelope{Operation: context.operation, Status: "ok", Result: map[string]any{"steps": result, "unscheduled_components": notices}}
}

func (context *operationContext) collectComposedSteps(recipe map[string]any, path string, visiting map[string]bool) ([]*composedStep, []any, *Problem) {
	if problem := context.enterInstance(recipe, path); problem != nil {
		return nil, nil, problem
	}
	reference := documentReference(recipe)
	if visiting[reference] {
		problem := Problem{Type: problemBase + "component-cycle", Pointer: "/bundle/documents"}
		return nil, nil, &problem
	}
	visiting[reference] = true
	defer delete(visiting, reference)
	nodes := context.activeMethodIn(recipe, path)
	rootSteps := []*composedStep{}
	byID := map[string]*composedStep{}
	for _, node := range nodes {
		if node.kind != "step" || !node.active {
			continue
		}
		step := &composedStep{path: path, id: node.id, object: node.object}
		for _, dependency := range stringSlice(node.object["after"]) {
			if methodNodeActive(nodes, dependency) {
				step.after = append(step.after, instanceStepKey(path, dependency))
			}
		}
		rootSteps = append(rootSteps, step)
		byID[node.id] = step
	}
	all := []*composedStep{}
	notices := []any{}
	for _, component := range arrayObjects(recipe["components"]) {
		if !context.activeIn(recipe, path, component) {
			continue
		}
		consumers := componentConsumers(nodes, stringValue(component["id"]))
		childPath := joinComponentPath(path, stringValue(component["id"]))
		if len(consumers) == 0 {
			notices = append(notices, map[string]any{"component_path": pathArray(childPath), "reason": "not-consumed"})
			continue
		}
		child, lookupProblem := context.bundleRecipe(component["recipe"].(map[string]any))
		if lookupProblem != nil {
			return nil, nil, lookupProblem
		}
		childSteps, childNotices, childProblem := context.collectComposedSteps(child, childPath, visiting)
		if childProblem != nil {
			return nil, nil, childProblem
		}
		producerID, producerProblem := selectedOutputProducer(context, child, childPath, stringValue(component["output"]))
		if producerProblem != nil {
			return nil, nil, producerProblem
		}
		producerKey := instanceStepKey(childPath, producerID)
		for _, consumer := range consumers {
			byID[consumer].after = append(byID[consumer].after, producerKey)
		}
		all = append(all, childSteps...)
		notices = append(notices, childNotices...)
	}
	all = append(all, rootSteps...)
	for index, step := range all {
		step.order = index
	}
	return all, notices, nil
}

func (context *operationContext) composeScheduleInstance(recipe map[string]any, path string, visiting map[string]bool) ([]*composedStep, []any, *Problem) {
	if problem := context.enterInstance(recipe, path); problem != nil {
		return nil, nil, problem
	}
	steps, notices, problem := context.collectLocalSchedule(recipe, path)
	if problem != nil {
		return nil, nil, problem
	}
	reference := documentReference(recipe)
	if visiting[reference] {
		problem := Problem{Type: problemBase + "component-cycle", Pointer: "/bundle/documents"}
		return nil, nil, &problem
	}
	visiting[reference] = true
	defer delete(visiting, reference)
	nodes := context.activeMethodIn(recipe, path)
	for _, component := range arrayObjects(recipe["components"]) {
		if !context.activeIn(recipe, path, component) {
			continue
		}
		consumers := componentConsumers(nodes, stringValue(component["id"]))
		childPath := joinComponentPath(path, stringValue(component["id"]))
		if len(consumers) == 0 {
			notices = append(notices, map[string]any{"component_path": pathArray(childPath), "reason": "not-consumed"})
			continue
		}
		child, lookupProblem := context.bundleRecipe(component["recipe"].(map[string]any))
		if lookupProblem != nil {
			return nil, nil, lookupProblem
		}
		childSteps, childNotices, childProblem := context.composeScheduleInstance(child, childPath, visiting)
		if childProblem != nil {
			return nil, nil, childProblem
		}
		producerID, producerProblem := selectedOutputProducer(context, child, childPath, stringValue(component["output"]))
		if producerProblem != nil {
			return nil, nil, producerProblem
		}
		var producer *composedStep
		for _, step := range childSteps {
			if step.path == childPath && step.id == producerID {
				producer = step
				break
			}
		}
		if producer == nil {
			problem := Problem{Type: problemBase + "missing-producer", Pointer: "/bundle/documents"}
			return nil, nil, &problem
		}
		var earliest *big.Int
		for _, consumerID := range consumers {
			for _, step := range steps {
				if step.path == path && step.id == consumerID && (earliest == nil || step.start.Cmp(earliest) < 0) {
					earliest = new(big.Int).Set(step.start)
				}
			}
		}
		shift := new(big.Int).Sub(earliest, producer.end)
		for _, step := range childSteps {
			step.start.Add(step.start, shift)
			step.end.Add(step.end, shift)
		}
		steps = append(steps, childSteps...)
		notices = append(notices, childNotices...)
	}
	return steps, notices, nil
}

func (context *operationContext) collectLocalSchedule(recipe map[string]any, path string) ([]*composedStep, []any, *Problem) {
	nodes := context.activeMethodIn(recipe, path)
	steps := []Step{}
	objects := map[string]map[string]any{}
	for _, node := range nodes {
		if node.kind != "step" || !node.active {
			continue
		}
		after := []string{}
		for _, dependency := range stringSlice(node.object["after"]) {
			if methodNodeActive(nodes, dependency) {
				after = append(after, dependency)
			}
		}
		steps = append(steps, Step{ID: node.id, After: after, Duration: node.object["duration"]})
		objects[node.id] = node.object
	}
	order, topologicalProblem := topologicalOrder(steps)
	if topologicalProblem != nil {
		problem := Problem{Type: problemBase + "dependency-cycle", Pointer: "/recipe/method"}
		return nil, nil, &problem
	}
	durations := make([]*big.Int, len(steps))
	for index, step := range steps {
		duration, code := stepDuration(step.Duration)
		if code != "" {
			problem := Problem{Type: problemBase + code, Pointer: "/recipe/method"}
			return nil, nil, &problem
		}
		durations[index] = duration
	}
	indexByID := map[string]int{}
	for index, step := range steps {
		indexByID[step.ID] = index
	}
	ends := make([]*big.Int, len(steps))
	result := []*composedStep{}
	for authoredOrder, index := range order {
		start := new(big.Int)
		for _, dependency := range steps[index].After {
			if ends[indexByID[dependency]].Cmp(start) > 0 {
				start.Set(ends[indexByID[dependency]])
			}
		}
		end := new(big.Int).Add(start, durations[index])
		ends[index] = end
		result = append(result, &composedStep{path: path, id: steps[index].ID, start: new(big.Int).Set(start), duration: new(big.Int).Set(durations[index]), end: new(big.Int).Set(end), order: authoredOrder, object: objects[steps[index].ID]})
	}
	return result, []any{}, nil
}

func componentConsumers(nodes []methodNodeV1, componentID string) []string {
	result := []string{}
	for _, node := range nodes {
		if node.kind != "step" || !node.active {
			continue
		}
		for _, reference := range arrayObjects(node.object["uses"]) {
			if reference["kind"] == "component" && reference["id"] == componentID {
				result = append(result, node.id)
			}
		}
	}
	return result
}

func selectedOutputProducer(context *operationContext, recipe map[string]any, path, outputID string) (string, *Problem) {
	producers := []string{}
	for _, node := range context.activeMethodIn(recipe, path) {
		if node.kind != "step" || !node.active {
			continue
		}
		for _, reference := range arrayObjects(node.object["produces"]) {
			if reference["kind"] == "output" && reference["id"] == outputID {
				producers = append(producers, node.id)
			}
		}
	}
	if len(producers) == 0 {
		problem := Problem{Type: problemBase + "missing-producer", Pointer: "/bundle/documents"}
		return "", &problem
	}
	if len(producers) > 1 {
		problem := Problem{Type: problemBase + "multiple-producers", Pointer: "/bundle/documents"}
		return "", &problem
	}
	return producers[0], nil
}

func instanceStepKey(path, id string) string {
	return path + "\x00" + id
}
