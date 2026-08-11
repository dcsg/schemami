package calculus

import (
	"fmt"
	"math/big"
	"regexp"
	"strings"
)

const problemBase = "https://schemami.dev/problems/"

type Problem struct {
	Type    string `json:"type"`
	Pointer string `json:"pointer,omitempty"`
}

type Envelope struct {
	Operation string    `json:"operation"`
	Status    string    `json:"status"`
	Result    any       `json:"result,omitempty"`
	Problems  []Problem `json:"problems,omitempty"`
}

type Quantity struct {
	Kind      string    `json:"kind"`
	Value     string    `json:"value,omitempty"`
	Minimum   string    `json:"minimum,omitempty"`
	Maximum   string    `json:"maximum,omitempty"`
	Unit      string    `json:"unit,omitempty"`
	Scaling   string    `json:"scaling,omitempty"`
	Qualifier string    `json:"qualifier,omitempty"`
	Guide     *Quantity `json:"guide,omitempty"`
}

type QuantityResult struct {
	Quantity Quantity `json:"quantity"`
}

type Ingredient struct {
	ID       string    `json:"id"`
	Quantity *Quantity `json:"quantity,omitempty"`
}

type FormulaTerm struct {
	Ingredient string `json:"ingredient"`
	Parts      string `json:"parts,omitempty"`
	Percentage string `json:"percentage,omitempty"`
}

type Formula struct {
	Kind          string        `json:"kind"`
	Basis         string        `json:"basis,omitempty"`
	Terms         []FormulaTerm `json:"terms"`
	Target        *Quantity     `json:"target,omitempty"`
	BasisQuantity *Quantity     `json:"basis_quantity,omitempty"`
}

type Recipe struct {
	Ingredients []Ingredient `json:"ingredients"`
	Formula     *Formula     `json:"formula,omitempty"`
}

type EffectiveQuantity struct {
	Ingredient string   `json:"ingredient"`
	Quantity   Quantity `json:"quantity"`
}

type QuantitiesResult struct {
	Quantities []EffectiveQuantity `json:"quantities"`
}

type Step struct {
	ID       string   `json:"id"`
	After    []string `json:"after,omitempty"`
	Duration any      `json:"duration,omitempty"`
}

type ScheduleStep struct {
	ID       string `json:"id"`
	Start    string `json:"start"`
	Duration string `json:"duration"`
	End      string `json:"end"`
}

type ScheduleResult struct {
	Steps []ScheduleStep `json:"steps"`
}

type ReadingOrderResult struct {
	Steps []string `json:"steps"`
}

type rational struct {
	numerator   *big.Int
	denominator *big.Int
}

func newRational(numerator, denominator *big.Int) rational {
	if denominator.Sign() == 0 {
		panic("zero denominator")
	}
	numerator = new(big.Int).Set(numerator)
	denominator = new(big.Int).Set(denominator)
	if denominator.Sign() < 0 {
		numerator.Neg(numerator)
		denominator.Neg(denominator)
	}
	gcd := new(big.Int).GCD(nil, nil, new(big.Int).Abs(new(big.Int).Set(numerator)), denominator)
	return rational{
		numerator:   new(big.Int).Quo(numerator, gcd),
		denominator: new(big.Int).Quo(denominator, gcd),
	}
}

func integer(value int64) rational {
	return newRational(big.NewInt(value), big.NewInt(1))
}

func (value rational) multiply(other rational) rational {
	return newRational(
		new(big.Int).Mul(value.numerator, other.numerator),
		new(big.Int).Mul(value.denominator, other.denominator),
	)
}

func (value rational) divide(other rational) rational {
	return newRational(
		new(big.Int).Mul(value.numerator, other.denominator),
		new(big.Int).Mul(value.denominator, other.numerator),
	)
}

func (value rational) add(other rational) rational {
	return newRational(
		new(big.Int).Add(
			new(big.Int).Mul(value.numerator, other.denominator),
			new(big.Int).Mul(other.numerator, value.denominator),
		),
		new(big.Int).Mul(value.denominator, other.denominator),
	)
}

func (value rational) subtract(other rational) rational {
	return value.add(newRational(new(big.Int).Neg(other.numerator), other.denominator))
}

type unitDefinition struct {
	dimension string
	factor    rational
}

var unitTable = map[string]unitDefinition{
	"g":        {dimension: "mass", factor: integer(1)},
	"kg":       {dimension: "mass", factor: integer(1000)},
	"mL":       {dimension: "volume", factor: integer(1)},
	"L":        {dimension: "volume", factor: integer(1000)},
	"[cup_us]": {dimension: "volume", factor: newRational(big.NewInt(2365882365), big.NewInt(10000000))},
	"[tbs_us]": {dimension: "volume", factor: newRational(big.NewInt(295735295625), big.NewInt(20000000000))},
	"[tsp_us]": {dimension: "volume", factor: newRational(big.NewInt(295735295625), big.NewInt(60000000000))},
	"[foz_us]": {dimension: "volume", factor: newRational(big.NewInt(295735295625), big.NewInt(10000000000))},
	"[cup_m]":  {dimension: "volume", factor: integer(240)},
}

var ambiguousUnits = map[string]struct{}{
	"cup": {}, "tbsp": {}, "tsp": {}, "floz": {},
}

func ConvertQuantity(quantity Quantity, targetUnit, pointer string) Envelope {
	const operation = "convert_quantity"
	if quantity.Kind != "measured" {
		return refused(operation, "unsupported-quantity-kind", pointer)
	}
	if _, ambiguous := ambiguousUnits[quantity.Unit]; ambiguous {
		return refused(operation, "ambiguous-unit", pointer+"/unit")
	}
	if _, ambiguous := ambiguousUnits[targetUnit]; ambiguous {
		return refused(operation, "ambiguous-unit", "")
	}
	value, problem := parseCanonicalDecimal(quantity.Value)
	if problem != "" {
		return refused(operation, problem, pointer+"/value")
	}
	converted, problem := convert(value, quantity.Unit, targetUnit)
	if problem != "" {
		problemPointer := pointer + "/unit"
		if problem == "unknown-unit" && knownUnit(quantity.Unit) {
			problemPointer = ""
		}
		return refused(operation, problem, problemPointer)
	}
	formatted, problem := formatCanonicalDecimal(converted)
	if problem != "" {
		return refused(operation, problem, pointer+"/value")
	}
	return Envelope{
		Operation: operation,
		Status:    "ok",
		Result: QuantityResult{Quantity: Quantity{
			Kind: "measured", Value: formatted, Unit: targetUnit,
		}},
	}
}

func ResolveFormula(formula Formula, pointer string) Envelope {
	return resolveFormula(formula, pointer, integer(1))
}

func resolveFormula(formula Formula, pointer string, anchorFactor rational) Envelope {
	const operation = "resolve_formula"
	quantities := make([]EffectiveQuantity, 0, len(formula.Terms))
	switch formula.Kind {
	case "ratio":
		if formula.Target == nil {
			return refused(operation, "missing-fact", pointer+"/target")
		}
		if formula.Target.Kind != "measured" {
			return refused(operation, "unsupported-quantity-kind", pointer+"/target")
		}
		target, problem := parseCanonicalDecimal(formula.Target.Value)
		if problem != "" {
			return refused(operation, problem, pointer+"/target/value")
		}
		if formula.Target.Scaling != "fixed" {
			target = target.multiply(anchorFactor)
		}
		parts := make([]rational, len(formula.Terms))
		total := integer(0)
		for index, term := range formula.Terms {
			part, problem := parsePositiveDecimal(term.Parts)
			if problem != "" {
				return refused(operation, problem, fmt.Sprintf("%s/terms/%d/parts", pointer, index))
			}
			parts[index] = part
			total = total.add(part)
		}
		if len(parts) == 0 || total.numerator.Sign() <= 0 {
			return refused(operation, "invalid-operation-arguments", pointer+"/terms")
		}
		for index, term := range formula.Terms {
			value, problem := formatCanonicalDecimal(target.multiply(parts[index]).divide(total))
			if problem != "" {
				return refused(operation, problem, fmt.Sprintf("%s/terms/%d/parts", pointer, index))
			}
			quantities = append(quantities, EffectiveQuantity{
				Ingredient: term.Ingredient,
				Quantity:   Quantity{Kind: "measured", Value: value, Unit: formula.Target.Unit},
			})
		}
	case "percentage":
		if formula.BasisQuantity == nil {
			return refused(operation, "missing-fact", pointer+"/basis_quantity")
		}
		if formula.BasisQuantity.Kind != "measured" {
			return refused(operation, "unsupported-quantity-kind", pointer+"/basis_quantity")
		}
		basis, problem := parseCanonicalDecimal(formula.BasisQuantity.Value)
		if problem != "" {
			return refused(operation, problem, pointer+"/basis_quantity/value")
		}
		if formula.BasisQuantity.Scaling != "fixed" {
			basis = basis.multiply(anchorFactor)
		}
		for index, term := range formula.Terms {
			percentage, problem := parsePositiveDecimal(term.Percentage)
			if problem != "" {
				return refused(operation, problem, fmt.Sprintf("%s/terms/%d/percentage", pointer, index))
			}
			value, problem := formatCanonicalDecimal(basis.multiply(percentage).divide(integer(100)))
			if problem != "" {
				return refused(operation, problem, fmt.Sprintf("%s/terms/%d/percentage", pointer, index))
			}
			quantities = append(quantities, EffectiveQuantity{
				Ingredient: term.Ingredient,
				Quantity:   Quantity{Kind: "measured", Value: value, Unit: formula.BasisQuantity.Unit},
			})
		}
	default:
		return refused(operation, "invalid-operation-arguments", pointer+"/kind")
	}
	return Envelope{Operation: operation, Status: "ok", Result: QuantitiesResult{Quantities: quantities}}
}

func Scale(recipe Recipe, factorRaw string) Envelope {
	const operation = "scale"
	factor, problem := parsePositiveDecimal(factorRaw)
	if problem != "" {
		return refused(operation, "invalid-operation-arguments", "/factor")
	}

	formulaQuantities := map[string]Quantity{}
	if recipe.Formula != nil {
		resolved := resolveFormula(*recipe.Formula, "/formula", factor)
		if resolved.Status != "ok" {
			resolved.Operation = operation
			return resolved
		}
		for _, resolvedQuantity := range resolved.Result.(QuantitiesResult).Quantities {
			formulaQuantities[resolvedQuantity.Ingredient] = resolvedQuantity.Quantity
		}
	}

	quantities := make([]EffectiveQuantity, 0, len(recipe.Ingredients))
	for index, ingredient := range recipe.Ingredients {
		if quantity, formulaTerm := formulaQuantities[ingredient.ID]; formulaTerm {
			quantities = append(quantities, EffectiveQuantity{Ingredient: ingredient.ID, Quantity: quantity})
			continue
		}
		if ingredient.Quantity == nil {
			return refused(operation, "missing-fact", fmt.Sprintf("/ingredients/%d/quantity", index))
		}
		quantity, envelope := scaleQuantity(*ingredient.Quantity, factor, fmt.Sprintf("/ingredients/%d/quantity", index))
		if envelope != nil {
			envelope.Operation = operation
			return *envelope
		}
		quantities = append(quantities, EffectiveQuantity{Ingredient: ingredient.ID, Quantity: quantity})
	}
	return Envelope{Operation: operation, Status: "ok", Result: QuantitiesResult{Quantities: quantities}}
}

func scaleQuantity(quantity Quantity, factor rational, pointer string) (Quantity, *Envelope) {
	switch quantity.Kind {
	case "measured":
		if quantity.Scaling == "fixed" {
			return quantity, nil
		}
		return scaleMeasured(quantity, factor, pointer)
	case "range":
		minimum, problem := scaledDecimal(quantity.Minimum, factor)
		if problem != "" {
			envelope := refused("scale", problem, pointer+"/minimum")
			return Quantity{}, &envelope
		}
		maximum, problem := scaledDecimal(quantity.Maximum, factor)
		if problem != "" {
			envelope := refused("scale", problem, pointer+"/maximum")
			return Quantity{}, &envelope
		}
		quantity.Minimum, quantity.Maximum = minimum, maximum
		return quantity, nil
	case "open":
		return quantity, nil
	default:
		envelope := refused("scale", "unsupported-quantity-kind", pointer)
		return Quantity{}, &envelope
	}
}

func scaleMeasured(quantity Quantity, factor rational, pointer string) (Quantity, *Envelope) {
	value, problem := scaledDecimal(quantity.Value, factor)
	if problem != "" {
		envelope := refused("scale", problem, pointer+"/value")
		return Quantity{}, &envelope
	}
	quantity.Value = value
	return quantity, nil
}

func scaledDecimal(raw string, factor rational) (string, string) {
	value, problem := parseCanonicalDecimal(raw)
	if problem != "" {
		return "", problem
	}
	return formatCanonicalDecimal(value.multiply(factor))
}

func parsePositiveDecimal(raw string) (rational, string) {
	value, problem := parseCanonicalDecimal(raw)
	if problem != "" {
		return rational{}, problem
	}
	if value.numerator.Sign() <= 0 {
		return rational{}, "invalid-decimal"
	}
	return value, ""
}

func KnownUnit(unit string) bool {
	if unit == "Cel" || unit == "[degF]" {
		return true
	}
	_, ok := unitTable[unit]
	return ok
}

func knownUnit(unit string) bool { return KnownUnit(unit) }

func convert(value rational, sourceUnit, targetUnit string) (rational, string) {
	if sourceUnit == targetUnit && knownUnit(sourceUnit) {
		return value, ""
	}
	if sourceUnit == "Cel" && targetUnit == "[degF]" {
		return value.multiply(newRational(big.NewInt(9), big.NewInt(5))).add(integer(32)), ""
	}
	if sourceUnit == "[degF]" && targetUnit == "Cel" {
		return value.subtract(integer(32)).multiply(newRational(big.NewInt(5), big.NewInt(9))), ""
	}
	if sourceUnit == "Cel" || sourceUnit == "[degF]" || targetUnit == "Cel" || targetUnit == "[degF]" {
		if !knownUnit(sourceUnit) || !knownUnit(targetUnit) {
			return rational{}, "unknown-unit"
		}
		return rational{}, "dimension-mismatch"
	}
	source, sourceKnown := unitTable[sourceUnit]
	target, targetKnown := unitTable[targetUnit]
	if !sourceKnown || !targetKnown {
		return rational{}, "unknown-unit"
	}
	if source.dimension != target.dimension {
		return rational{}, "dimension-mismatch"
	}
	return value.multiply(source.factor).divide(target.factor), ""
}

func parseCanonicalDecimal(raw string) (rational, string) {
	if raw == "" || strings.HasPrefix(raw, "+") || strings.ContainsAny(raw, "eE") {
		return rational{}, "invalid-decimal"
	}
	negative := strings.HasPrefix(raw, "-")
	unsigned := raw
	if negative {
		unsigned = raw[1:]
	}
	parts := strings.Split(unsigned, ".")
	if len(parts) > 2 || parts[0] == "" || (len(parts) == 2 && parts[1] == "") {
		return rational{}, "invalid-decimal"
	}
	if len(parts[0]) > 1 && parts[0][0] == '0' {
		return rational{}, "invalid-decimal"
	}
	if len(parts) == 2 && (len(parts[1]) > 4 || parts[1][len(parts[1])-1] == '0') {
		return rational{}, "invalid-decimal"
	}
	digitCount := 0
	for _, part := range parts {
		for _, character := range part {
			if character < '0' || character > '9' {
				return rational{}, "invalid-decimal"
			}
			digitCount++
		}
	}
	if digitCount > 16 {
		return rational{}, "resource-limit"
	}
	if negative && unsigned == "0" {
		return rational{}, "invalid-decimal"
	}
	digits := strings.Join(parts, "")
	numerator, ok := new(big.Int).SetString(digits, 10)
	if !ok {
		return rational{}, "invalid-decimal"
	}
	if negative {
		numerator.Neg(numerator)
	}
	denominator := big.NewInt(1)
	if len(parts) == 2 {
		denominator.Exp(big.NewInt(10), big.NewInt(int64(len(parts[1]))), nil)
	}
	return newRational(numerator, denominator), ""
}

func formatCanonicalDecimal(value rational) (string, string) {
	negative := value.numerator.Sign() < 0
	absNumerator := new(big.Int).Abs(new(big.Int).Set(value.numerator))
	scaledNumerator := new(big.Int).Mul(absNumerator, big.NewInt(10000))
	quotient, remainder := new(big.Int), new(big.Int)
	quotient.QuoRem(scaledNumerator, value.denominator, remainder)
	comparison := new(big.Int).Mul(remainder, big.NewInt(2)).Cmp(value.denominator)
	if comparison > 0 || (comparison == 0 && quotient.Bit(0) == 1) {
		quotient.Add(quotient, big.NewInt(1))
	}
	whole, fraction := new(big.Int), new(big.Int)
	whole.QuoRem(quotient, big.NewInt(10000), fraction)
	formatted := whole.String()
	if fraction.Sign() != 0 {
		fractionText := fmt.Sprintf("%04d", fraction.Int64())
		fractionText = strings.TrimRight(fractionText, "0")
		formatted += "." + fractionText
	}
	if negative && quotient.Sign() != 0 {
		formatted = "-" + formatted
	}
	digits := strings.ReplaceAll(strings.TrimPrefix(formatted, "-"), ".", "")
	if len(digits) > 16 {
		return "", "resource-limit"
	}
	return formatted, ""
}

func ReadingOrder(steps []Step) Envelope {
	order, problem := topologicalOrder(steps)
	if problem != nil {
		return Envelope{Operation: "reading_order", Status: "refused", Problems: []Problem{*problem}}
	}
	ids := make([]string, len(order))
	for index, stepIndex := range order {
		ids[index] = steps[stepIndex].ID
	}
	return Envelope{Operation: "reading_order", Status: "ok", Result: ReadingOrderResult{Steps: ids}}
}

func Schedule(steps []Step) Envelope {
	const operation = "schedule"
	order, problem := topologicalOrder(steps)
	if problem != nil {
		return Envelope{Operation: operation, Status: "refused", Problems: []Problem{*problem}}
	}
	durations := make([]*big.Int, len(steps))
	for index, step := range steps {
		duration, problemCode := stepDuration(step.Duration)
		if problemCode != "" {
			return refused(operation, problemCode, fmt.Sprintf("/steps/%d/duration", index))
		}
		durations[index] = duration
	}
	indexByID := make(map[string]int, len(steps))
	for index, step := range steps {
		indexByID[step.ID] = index
	}
	ends := make([]*big.Int, len(steps))
	result := make([]ScheduleStep, 0, len(steps))
	for _, index := range order {
		start := new(big.Int)
		for _, dependency := range steps[index].After {
			dependencyEnd := ends[indexByID[dependency]]
			if dependencyEnd.Cmp(start) > 0 {
				start.Set(dependencyEnd)
			}
		}
		end := new(big.Int).Add(start, durations[index])
		ends[index] = end
		result = append(result, ScheduleStep{
			ID:       steps[index].ID,
			Start:    formatElapsed(start),
			Duration: formatElapsed(durations[index]),
			End:      formatElapsed(end),
		})
	}
	return Envelope{Operation: operation, Status: "ok", Result: ScheduleResult{Steps: result}}
}

func topologicalOrder(steps []Step) ([]int, *Problem) {
	indexByID := make(map[string]int, len(steps))
	for index, step := range steps {
		if _, duplicate := indexByID[step.ID]; duplicate {
			problem := Problem{Type: problemBase + "invalid-document", Pointer: fmt.Sprintf("/steps/%d/id", index)}
			return nil, &problem
		}
		indexByID[step.ID] = index
	}
	indegree := make([]int, len(steps))
	dependents := make([][]int, len(steps))
	for index, step := range steps {
		for _, dependency := range step.After {
			dependencyIndex, exists := indexByID[dependency]
			if !exists {
				problem := Problem{Type: problemBase + "unresolved-reference", Pointer: fmt.Sprintf("/steps/%d/after", index)}
				return nil, &problem
			}
			indegree[index]++
			dependents[dependencyIndex] = append(dependents[dependencyIndex], index)
		}
	}
	order := make([]int, 0, len(steps))
	used := make([]bool, len(steps))
	for len(order) < len(steps) {
		selected := -1
		for index := range steps {
			if !used[index] && indegree[index] == 0 {
				selected = index
				break
			}
		}
		if selected == -1 {
			problem := Problem{Type: problemBase + "invalid-document", Pointer: "/steps"}
			return nil, &problem
		}
		used[selected] = true
		order = append(order, selected)
		for _, dependent := range dependents[selected] {
			indegree[dependent]--
		}
	}
	return order, nil
}

var durationPattern = regexp.MustCompile(`^P(?:(?:([1-9][0-9]*)W)|(?:([1-9][0-9]*)D)?(?:T(?:([1-9][0-9]*)H)?(?:([1-9][0-9]*)M)?(?:([1-9][0-9]*)S)?)?)$`)

func stepDuration(value any) (*big.Int, string) {
	if value == nil {
		return nil, "missing-fact"
	}
	if scalar, ok := value.(string); ok {
		return parseDuration(scalar)
	}
	window, ok := value.(map[string]any)
	if !ok {
		return nil, "invalid-operation-arguments"
	}
	target, ok := window["target"].(string)
	if !ok {
		return nil, "missing-fact"
	}
	return parseDuration(target)
}

func parseDuration(raw string) (*big.Int, string) {
	matches := durationPattern.FindStringSubmatch(raw)
	if matches == nil {
		return nil, "invalid-operation-arguments"
	}
	seconds := new(big.Int)
	units := []int64{604800, 86400, 3600, 60, 1}
	for index, match := range matches[1:] {
		if match == "" {
			continue
		}
		value, ok := new(big.Int).SetString(match, 10)
		if !ok {
			return nil, "invalid-operation-arguments"
		}
		seconds.Add(seconds, new(big.Int).Mul(value, big.NewInt(units[index])))
	}
	if seconds.Sign() <= 0 {
		return nil, "invalid-operation-arguments"
	}
	return seconds, ""
}

func formatElapsed(seconds *big.Int) string {
	if seconds.Sign() == 0 {
		return "PT0S"
	}
	week := big.NewInt(604800)
	if new(big.Int).Mod(new(big.Int).Set(seconds), week).Sign() == 0 {
		return "P" + new(big.Int).Quo(new(big.Int).Set(seconds), week).String() + "W"
	}
	remaining := new(big.Int).Set(seconds)
	days, remaining := quotientRemainder(remaining, 86400)
	hours, remaining := quotientRemainder(remaining, 3600)
	minutes, remaining := quotientRemainder(remaining, 60)
	var output strings.Builder
	output.WriteByte('P')
	if days.Sign() != 0 {
		output.WriteString(days.String())
		output.WriteByte('D')
	}
	if hours.Sign() != 0 || minutes.Sign() != 0 || remaining.Sign() != 0 {
		output.WriteByte('T')
		if hours.Sign() != 0 {
			output.WriteString(hours.String())
			output.WriteByte('H')
		}
		if minutes.Sign() != 0 {
			output.WriteString(minutes.String())
			output.WriteByte('M')
		}
		if remaining.Sign() != 0 {
			output.WriteString(remaining.String())
			output.WriteByte('S')
		}
	}
	return output.String()
}

func quotientRemainder(value *big.Int, divisor int64) (*big.Int, *big.Int) {
	quotient, remainder := new(big.Int), new(big.Int)
	quotient.QuoRem(value, big.NewInt(divisor), remainder)
	return quotient, remainder
}

func refused(operation, code, pointer string) Envelope {
	return Envelope{
		Operation: operation,
		Status:    "refused",
		Problems:  []Problem{{Type: problemBase + code, Pointer: pointer}},
	}
}
