package schemami

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/big"
	"mime"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/dcsg/schemami/sdk/go/calculus"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v6"
	"golang.org/x/text/language"
)

func validateDocumentData(doc map[string]any, schema *jsonschema.Schema) error {
	if marker, ok := doc["schemami"].(string); !ok || marker != "1" {
		return fmt.Errorf("unsupported document marker")
	}
	if err := validateStructuralDiagnostics(doc); err != nil {
		return err
	}
	if err := schema.Validate(doc); err != nil {
		return err
	}
	if _, err := canonicalise(doc); err != nil {
		return err
	}
	return validateSemantics(doc)
}

func validateDocumentDataWithAdmissionBudget(doc map[string]any, schema *jsonschema.Schema, budget *calculus.AdmissionBudget, chargeStatic bool, recursiveLevels int) error {
	if marker, ok := doc["schemami"].(string); !ok || marker != "1" {
		return fmt.Errorf("unsupported document marker")
	}
	if err := validateStructuralDiagnostics(doc); err != nil {
		return err
	}
	if err := schema.Validate(doc); err != nil {
		return err
	}
	if _, err := canonicalise(doc); err != nil {
		return err
	}
	problems := stableAdmissionProblemsWithBudget(doc, nil, budget, chargeStatic, recursiveLevels)
	if len(problems) == 0 {
		return nil
	}
	if problems[0].Type == stableProblemBase+"resource-limit" {
		return fmt.Errorf("resource-limit: document admission exhausted its request budget")
	}
	return fmt.Errorf("%s%s: semantic admission failed", problems[0].Type, problems[0].Pointer)
}

// validateStructuralDiagnostics recognizes high-value tagged-union mistakes
// before JSON Schema expands them into nested oneOf traces. The schema remains
// the admission authority; this function only makes known failures concise.
func validateStructuralDiagnostics(doc map[string]any) error {
	validateQuantity := func(value any, pointer string) error {
		quantity, ok := value.(map[string]any)
		if !ok || quantity["kind"] != "open" {
			return nil
		}
		guide, present := quantity["guide"].(map[string]any)
		if !present {
			return nil
		}
		if guide["kind"] != "measured" && guide["kind"] != "range" {
			return fmt.Errorf("%s/guide: Open quantity guide must be measured or range.", pointer)
		}
		return nil
	}
	if ingredients, ok := doc["ingredients"].([]any); ok {
		for index, value := range ingredients {
			if ingredient, ok := value.(map[string]any); ok {
				if err := validateQuantity(ingredient["quantity"], fmt.Sprintf("/ingredients/%d/quantity", index)); err != nil {
					return err
				}
			}
		}
	}
	if formula, ok := doc["formula"].(map[string]any); ok {
		for _, field := range []string{"target", "basis_quantity"} {
			if err := validateQuantity(formula[field], "/formula/"+field); err != nil {
				return err
			}
		}
	}
	return nil
}

func positiveInteger(value any) (int64, error) {
	switch typed := value.(type) {
	case int:
		if typed > 0 {
			return int64(typed), nil
		}
	case int64:
		if typed > 0 {
			return typed, nil
		}
	case float64:
		if typed > 0 && typed == float64(int64(typed)) {
			return int64(typed), nil
		}
	}
	return 0, fmt.Errorf("must be a positive integer")
}

func schemaFor(path string) (*jsonschema.Schema, error) {
	return namedSchemaFor(path, "schemami-v1-core.schema.json")
}

func namedSchemaFor(path, schemaName string) (*jsonschema.Schema, error) {
	_ = path
	b := embeddedCoreSchema
	if schemaName == "schemami-v1-bundle.schema.json" {
		b = embeddedBundleSchema
	}
	var schema any
	if err := json.Unmarshal(b, &schema); err != nil {
		return nil, err
	}
	c := jsonschema.NewCompiler()
	c.DefaultDraft(jsonschema.Draft2020)
	c.AssertFormat()
	if schemaName == "schemami-v1-bundle.schema.json" {
		var core any
		if err := json.Unmarshal(embeddedCoreSchema, &core); err != nil {
			return nil, err
		}
		if err := c.AddResource("https://schemami.dev/schema/schemami/1/core.schema.json", core); err != nil {
			return nil, err
		}
	}
	resourceID := "https://schemami.dev/schema/schemami/1/core.schema.json"
	if schemaName == "schemami-v1-bundle.schema.json" {
		resourceID = "https://schemami.dev/schema/schemami/1/bundle.schema.json"
	}
	if err := c.AddResource(resourceID, schema); err != nil {
		return nil, err
	}
	return c.Compile(resourceID)
}

func rejectDuplicateJSONKeys(raw []byte) error {
	if !utf8.Valid(raw) {
		return fmt.Errorf("invalid JSON: input is not valid UTF-8")
	}
	if err := rejectLoneSurrogates(raw); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if err := scanJSONValue(decoder, 0); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	if _, err := decoder.Token(); err != io.EOF {
		if err == nil {
			return fmt.Errorf("invalid JSON: multiple top-level values")
		}
		return fmt.Errorf("invalid JSON: %w", err)
	}
	return nil
}

func scanJSONValue(decoder *json.Decoder, depth int) error {
	if depth > 256 {
		return fmt.Errorf("JSON nesting exceeds parser safety limit")
	}
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	delim, ok := token.(json.Delim)
	if !ok {
		if number, isNumber := token.(json.Number); isNumber {
			if err := validateIJSONNumber(number.String()); err != nil {
				return err
			}
		}
		return nil
	}
	switch delim {
	case '{':
		seen := map[string]struct{}{}
		for decoder.More() {
			keyToken, err := decoder.Token()
			if err != nil {
				return err
			}
			key, ok := keyToken.(string)
			if !ok {
				return fmt.Errorf("object key is not a string")
			}
			if _, duplicate := seen[key]; duplicate {
				return fmt.Errorf("duplicate object member %q", key)
			}
			seen[key] = struct{}{}
			if err := scanJSONValue(decoder, depth+1); err != nil {
				return err
			}
		}
		_, err = decoder.Token()
		return err
	case '[':
		for decoder.More() {
			if err := scanJSONValue(decoder, depth+1); err != nil {
				return err
			}
		}
		_, err = decoder.Token()
		return err
	default:
		return fmt.Errorf("unexpected delimiter %q", delim)
	}
}

// validateIJSONNumber rejects values that cannot survive the interoperable
// IEEE-754/JCS data model without becoming non-finite, underflowing a non-zero
// token to zero, or losing an integer outside the exact safe range.
func validateIJSONNumber(raw string) error {
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || math.IsInf(value, 0) || math.IsNaN(value) {
		return fmt.Errorf("number %q is outside the I-JSON binary64 range", raw)
	}
	mantissa := raw
	if index := strings.IndexAny(mantissa, "eE"); index >= 0 {
		mantissa = mantissa[:index]
	}
	if value == 0 && strings.ContainsAny(mantissa, "123456789") {
		return fmt.Errorf("number %q underflows the I-JSON binary64 range", raw)
	}
	return nil
}

func validateFlattenedCandidateSemantics(doc map[string]any) error {
	contentLanguage, _ := doc["content_language"].(string)
	if _, err := language.Parse(contentLanguage); err != nil {
		return fmt.Errorf("content_language is not a well-formed BCP 47 tag: %w", err)
	}
	if err := validateOrigin(doc); err != nil {
		return err
	}

	ingredients, err := namedCollection(doc, "ingredients")
	if err != nil {
		return err
	}
	techniques, err := namedCollection(doc, "techniques")
	if err != nil {
		return err
	}
	equipment, err := namedCollection(doc, "equipment")
	if err != nil {
		return err
	}
	steps, err := namedCollection(doc, "steps")
	if err != nil {
		return err
	}
	if err := validateSteps(doc, ingredients, techniques, equipment, steps); err != nil {
		return err
	}
	if err := validateFormula(doc, ingredients); err != nil {
		return err
	}
	if err := validateSourcesAndEvidence(doc); err != nil {
		return err
	}
	if err := validateUnits(doc); err != nil {
		return err
	}
	return validateRanges(doc)
}

func namedCollection(doc map[string]any, name string) (map[string]map[string]any, error) {
	value, present := doc[name]
	if !present {
		return map[string]map[string]any{}, nil
	}
	items, ok := value.([]any)
	if !ok {
		return nil, fmt.Errorf("%s must be an array", name)
	}
	result := make(map[string]map[string]any, len(items))
	for index, item := range items {
		object, ok := item.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("%s/%d must be an object", name, index)
		}
		id, _ := object["id"].(string)
		if _, duplicate := result[id]; duplicate {
			return nil, fmt.Errorf("duplicate %s id %q", name, id)
		}
		result[id] = object
	}
	return result, nil
}

func validateOrigin(doc map[string]any) error {
	origin, present := doc["origin"].(map[string]any)
	if !present {
		return nil
	}
	country, hasCountry := origin["country"].(string)
	subdivision, hasSubdivision := origin["subdivision"].(string)
	if hasCountry && hasSubdivision && !strings.HasPrefix(subdivision, country+"-") {
		return fmt.Errorf("origin/subdivision must belong to origin/country")
	}
	return nil
}

func validateSteps(doc map[string]any, ingredients, techniques, equipment, steps map[string]map[string]any) error {
	items, _ := doc["steps"].([]any)
	calculusSteps := make([]calculus.Step, 0, len(items))
	for index, item := range items {
		step := item.(map[string]any)
		stepID, _ := step["id"].(string)
		afterValues, _ := step["after"].([]any)
		after := make([]string, 0, len(afterValues))
		for _, value := range afterValues {
			after = append(after, value.(string))
		}
		calculusSteps = append(calculusSteps, calculus.Step{ID: stepID, After: after})
		if err := referencedIDs(step["after"], steps, "after", index, stepID, true); err != nil {
			return err
		}
		if err := referencedIDs(step["uses"], ingredients, "uses", index, "", false); err != nil {
			return err
		}
		if err := referencedIDs(step["produces"], ingredients, "produces", index, "", false); err != nil {
			return err
		}
		if err := referencedIDs(step["techniques"], techniques, "techniques", index, "", false); err != nil {
			return err
		}
		if err := referencedIDs(step["equipment"], equipment, "equipment", index, "", false); err != nil {
			return err
		}
		if duration, present := step["duration"]; present && calculus.ValidateDurationWindow(duration) != "" {
			return fmt.Errorf("steps/%d/duration window is not ordered", index)
		}
	}
	if result := calculus.ReadingOrder(calculusSteps); result.Status != "ok" {
		return fmt.Errorf("step dependency graph contains a cycle")
	}
	return nil
}

func referencedIDs(value any, declared map[string]map[string]any, field string, stepIndex int, self string, forbidSelf bool) error {
	if value == nil {
		return nil
	}
	ids, ok := value.([]any)
	if !ok {
		return fmt.Errorf("steps/%d/%s must be an array", stepIndex, field)
	}
	for _, candidate := range ids {
		id, _ := candidate.(string)
		if forbidSelf && id == self {
			return fmt.Errorf("steps/%d/%s must not reference itself", stepIndex, field)
		}
		if _, ok := declared[id]; !ok {
			return fmt.Errorf("steps/%d/%s references undeclared id %q", stepIndex, field, id)
		}
	}
	return nil
}

func validateFormula(doc map[string]any, ingredients map[string]map[string]any) error {
	value, present := doc["formula"]
	if !present {
		return nil
	}
	formula, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("formula must be an object")
	}
	if basis, present := formula["basis"].(string); present {
		if _, ok := ingredients[basis]; !ok {
			return fmt.Errorf("formula/basis references undeclared ingredient %q", basis)
		}
	}
	terms, _ := formula["terms"].([]any)
	seen := map[string]struct{}{}
	basis, isPercentage := formula["basis"].(string)
	basisIndex := -1
	for index, value := range terms {
		term, _ := value.(map[string]any)
		ingredient, _ := term["ingredient"].(string)
		if _, ok := ingredients[ingredient]; !ok {
			return fmt.Errorf("formula/terms/%d/ingredient references undeclared ingredient %q", index, ingredient)
		}
		if _, duplicate := seen[ingredient]; duplicate {
			return fmt.Errorf("formula repeats ingredient %q", ingredient)
		}
		if _, present := ingredients[ingredient]["quantity"]; present {
			return fmt.Errorf("formula term ingredient %q must not carry explicit quantity", ingredient)
		}
		seen[ingredient] = struct{}{}
		if isPercentage && ingredient == basis {
			basisIndex = index
		}
	}
	if isPercentage {
		if basisIndex < 0 {
			return fmt.Errorf("formula/basis must occur exactly once in formula/terms")
		}
		basisTerm, _ := terms[basisIndex].(map[string]any)
		if basisTerm["percentage"] != "100" {
			return fmt.Errorf("formula/terms/%d/percentage must be 100 for the named basis", basisIndex)
		}
	}
	return nil
}

func validateSourcesAndEvidence(doc map[string]any) error {
	sources, err := namedCollection(doc, "sources")
	if err != nil {
		return err
	}
	for id, source := range sources {
		if mediaType, present := source["media_type"].(string); present {
			if _, _, err := mime.ParseMediaType(mediaType); err != nil {
				return fmt.Errorf("sources/%s/media_type is invalid: %w", id, err)
			}
		}
	}
	evidence, err := namedCollection(doc, "evidence")
	if err != nil {
		return err
	}
	for id, record := range evidence {
		if source, present := record["source"].(string); present {
			if _, ok := sources[source]; !ok {
				return fmt.Errorf("evidence/%s/source references undeclared source %q", id, source)
			}
		}
		pointer, _ := record["pointer"].(string)
		if _, err := resolveJSONPointer(doc, pointer); err != nil {
			return fmt.Errorf("evidence/%s/pointer: %w", id, err)
		}
		if selector, present := record["selector"].(map[string]any); present {
			if err := validateSelector(selector); err != nil {
				return fmt.Errorf("evidence/%s/selector: %w", id, err)
			}
		}
	}
	return nil
}

const mediaFragmentsSpecification = "https://www.w3.org/TR/media-frags/"

var nptTimePattern = regexp.MustCompile(`^(?:[0-9]+(?:\.[0-9]+)?|[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?|[0-9]+:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?)$`)

func validateSelector(selector map[string]any) error {
	if selector["conforms_to"] != mediaFragmentsSpecification {
		return nil
	}
	value, _ := selector["value"].(string)
	for _, component := range strings.Split(value, "&") {
		if !strings.HasPrefix(component, "t=") {
			continue
		}
		if err := validateNPTFragment(strings.TrimPrefix(component, "t=")); err != nil {
			return err
		}
	}
	return nil
}

func validateNPTFragment(value string) error {
	value = strings.TrimPrefix(value, "npt:")
	parts := strings.Split(value, ",")
	if len(parts) > 2 || len(parts) == 0 || (len(parts) == 2 && parts[1] == "") {
		return fmt.Errorf("invalid W3C media temporal fragment")
	}
	var start, end *big.Rat
	var err error
	if parts[0] != "" {
		start, err = parseNPTTime(parts[0])
		if err != nil {
			return err
		}
	}
	if len(parts) == 2 {
		end, err = parseNPTTime(parts[1])
		if err != nil {
			return err
		}
	}
	if start == nil && end == nil {
		return fmt.Errorf("invalid W3C media temporal fragment")
	}
	if start != nil && end != nil && start.Cmp(end) >= 0 {
		return fmt.Errorf("W3C media temporal fragment start must be less than end")
	}
	return nil
}

func parseNPTTime(value string) (*big.Rat, error) {
	if !nptTimePattern.MatchString(value) {
		return nil, fmt.Errorf("invalid W3C normal play time")
	}
	parts := strings.Split(value, ":")
	if len(parts) == 1 {
		result, ok := new(big.Rat).SetString(value)
		if !ok {
			return nil, fmt.Errorf("invalid W3C normal play time")
		}
		return result, nil
	}
	secondsText := parts[len(parts)-1]
	minutesText := parts[len(parts)-2]
	seconds, ok := new(big.Rat).SetString(secondsText)
	if !ok {
		return nil, fmt.Errorf("invalid W3C normal play time")
	}
	minutes, ok := new(big.Int).SetString(minutesText, 10)
	if !ok || minutes.Cmp(big.NewInt(59)) > 0 || seconds.Cmp(big.NewRat(60, 1)) >= 0 {
		return nil, fmt.Errorf("invalid W3C normal play time")
	}
	result := new(big.Rat).Add(seconds, new(big.Rat).SetInt(new(big.Int).Mul(minutes, big.NewInt(60))))
	if len(parts) == 3 {
		hours, ok := new(big.Int).SetString(parts[0], 10)
		if !ok {
			return nil, fmt.Errorf("invalid W3C normal play time")
		}
		result.Add(result, new(big.Rat).SetInt(new(big.Int).Mul(hours, big.NewInt(3600))))
	}
	return result, nil
}

func resolveJSONPointer(value any, pointer string) (any, error) {
	if pointer == "" {
		return value, nil
	}
	if !strings.HasPrefix(pointer, "/") {
		return nil, fmt.Errorf("must be an RFC 6901 JSON Pointer")
	}
	current := value
	for _, rawToken := range strings.Split(pointer[1:], "/") {
		token, err := decodePointerToken(rawToken)
		if err != nil {
			return nil, err
		}
		switch typed := current.(type) {
		case map[string]any:
			next, ok := typed[token]
			if !ok {
				return nil, fmt.Errorf("does not identify an existing value")
			}
			current = next
		case []any:
			index, err := strconv.Atoi(token)
			if err != nil || index < 0 || index >= len(typed) || token != strconv.Itoa(index) {
				return nil, fmt.Errorf("does not identify an existing array value")
			}
			current = typed[index]
		default:
			return nil, fmt.Errorf("does not identify an existing value")
		}
	}
	return current, nil
}

func decodePointerToken(token string) (string, error) {
	for index := 0; index < len(token); index++ {
		if token[index] != '~' {
			continue
		}
		if index+1 == len(token) || (token[index+1] != '0' && token[index+1] != '1') {
			return "", fmt.Errorf("contains invalid RFC 6901 escape")
		}
		index++
	}
	return strings.NewReplacer("~1", "/", "~0", "~").Replace(token), nil
}

func validateRanges(doc map[string]any) error {
	ingredients, _ := doc["ingredients"].([]any)
	for index, item := range ingredients {
		ingredient := item.(map[string]any)
		quantity, ok := ingredient["quantity"].(map[string]any)
		if !ok {
			continue
		}
		if err := validateQuantityRange(quantity, fmt.Sprintf("ingredients/%d/quantity", index)); err != nil {
			return err
		}
	}
	return nil
}

func validateQuantityRange(quantity map[string]any, pointer string) error {
	if quantity["kind"] == "range" {
		minimum, _ := quantity["minimum"].(string)
		maximum, _ := quantity["maximum"].(string)
		if compareCanonicalDecimals(minimum, maximum) > 0 {
			return fmt.Errorf("%s minimum exceeds maximum", pointer)
		}
	}
	if quantity["kind"] == "open" {
		if guide, present := quantity["guide"].(map[string]any); present {
			return validateQuantityRange(guide, pointer+"/guide")
		}
	}
	return nil
}

func validateUnits(doc map[string]any) error {
	if ingredients, ok := doc["ingredients"].([]any); ok {
		for index, value := range ingredients {
			ingredient, _ := value.(map[string]any)
			if quantity, present := ingredient["quantity"].(map[string]any); present {
				if err := validateQuantityUnit(quantity, fmt.Sprintf("/ingredients/%d/quantity", index)); err != nil {
					return err
				}
			}
		}
	}
	if formula, ok := doc["formula"].(map[string]any); ok {
		for _, field := range []string{"target", "basis_quantity"} {
			if quantity, present := formula[field].(map[string]any); present {
				if err := validateQuantityUnit(quantity, "/formula/"+field); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func validateQuantityUnit(quantity map[string]any, pointer string) error {
	switch quantity["kind"] {
	case "measured", "range":
		unit, _ := quantity["unit"].(string)
		if !calculus.KnownUnit(unit) {
			return fmt.Errorf("%s/unit must be an identity in the pinned UCUM 2.2 table", pointer)
		}
	case "open":
		if guide, present := quantity["guide"].(map[string]any); present {
			return validateQuantityUnit(guide, pointer+"/guide")
		}
	}
	return nil
}

func compareCanonicalDecimals(left, right string) int {
	leftWhole, leftFraction, _ := strings.Cut(left, ".")
	rightWhole, rightFraction, _ := strings.Cut(right, ".")
	if len(leftWhole) != len(rightWhole) {
		if len(leftWhole) < len(rightWhole) {
			return -1
		}
		return 1
	}
	if leftWhole != rightWhole {
		if leftWhole < rightWhole {
			return -1
		}
		return 1
	}
	for len(leftFraction) < 4 {
		leftFraction += "0"
	}
	for len(rightFraction) < 4 {
		rightFraction += "0"
	}
	if leftFraction < rightFraction {
		return -1
	}
	if leftFraction > rightFraction {
		return 1
	}
	return 0
}
