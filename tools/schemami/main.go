package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"mime"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/dcsg/schemami/tools/schemami/calculus"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v6"
	"golang.org/x/text/language"
	yaml "gopkg.in/yaml.v3"
)

func main() {
	if len(os.Args) < 2 || !knownCommand(os.Args[1]) || (os.Args[1] == "verify-pack" && len(os.Args) != 4) || (os.Args[1] != "verify-pack" && len(os.Args) != 3) {
		fmt.Fprintln(os.Stderr, "usage: schemami <validate|validate-pack|canonicalize|digest> <document>\n       schemami verify-pack <pack.schemami-pack.{yaml,json}> <document-directory>")
		os.Exit(2)
	}
	command, path := os.Args[1], os.Args[2]
	var err error
	switch command {
	case "validate":
		err = validate(path)
	case "validate-pack":
		err = validatePack(path)
	case "canonicalize":
		var canonical string
		canonical, err = canonicaliseFile(path)
		if err == nil {
			_, err = fmt.Fprint(os.Stdout, canonical)
		}
	case "digest":
		var canonical string
		canonical, err = canonicaliseFile(path)
		if err == nil {
			digest := sha256.Sum256([]byte(canonical))
			_, err = fmt.Println(hex.EncodeToString(digest[:]))
		}
	case "verify-pack":
		err = verifyPack(path, os.Args[3])
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "schemami:", err)
		os.Exit(1)
	}
	if command == "validate" || command == "validate-pack" || command == "verify-pack" {
		fmt.Println("schemami: valid")
	}
}

func knownCommand(command string) bool {
	return command == "validate" || command == "validate-pack" || command == "verify-pack" || command == "canonicalize" || command == "digest"
}

func validate(path string) error {
	if err := validateFileSuffix(path, false); err != nil {
		return err
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	doc, err := parseDocument(path, raw)
	if err != nil {
		return err
	}
	schema, err := schemaFor(path)
	if err != nil {
		return err
	}
	return validateDocumentData(doc, schema)
}

func canonicaliseFile(path string) (string, error) {
	if err := validateFileSuffix(path, false); err != nil {
		return "", err
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	doc, err := parseDocument(path, raw)
	if err != nil {
		return "", err
	}
	schema, err := schemaFor(path)
	if err != nil {
		return "", err
	}
	if err := validateDocumentData(doc, schema); err != nil {
		return "", err
	}
	return canonicalise(doc)
}

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

func validatePack(path string) error {
	if err := validateFileSuffix(path, true); err != nil {
		return err
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	doc, err := parseDocument(path, raw)
	if err != nil {
		return err
	}
	if marker, ok := doc["schemami"].(string); !ok || marker != "1" {
		return fmt.Errorf("unsupported document marker")
	}
	schema, err := namedSchemaFor(path, "schemami-v1-pack.schema.json")
	if err != nil {
		return err
	}
	if err := schema.Validate(doc); err != nil {
		return err
	}
	if _, err := canonicalise(doc); err != nil {
		return err
	}
	return validatePackSemantics(doc)
}

func verifyPack(packPath, documentDirectory string) error {
	if err := validatePack(packPath); err != nil {
		return err
	}
	raw, err := os.ReadFile(packPath)
	if err != nil {
		return err
	}
	pack, err := parseDocument(packPath, raw)
	if err != nil {
		return err
	}
	collection, _ := pack["collection"].(string)

	entries, err := os.ReadDir(documentDirectory)
	if err != nil {
		return err
	}
	type loadedDocument struct {
		revision int64
		digest   string
		path     string
	}
	loaded := map[string]loadedDocument{}
	for _, entry := range entries {
		if entry.IsDir() || strings.Contains(entry.Name(), ".schemami-pack.") || (!strings.HasSuffix(entry.Name(), ".schemami.json") && !strings.HasSuffix(entry.Name(), ".schemami.yaml")) {
			continue
		}
		path := filepath.Join(documentDirectory, entry.Name())
		if err := validate(path); err != nil {
			return fmt.Errorf("document %s: %w", entry.Name(), err)
		}
		documentRaw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		document, err := parseDocument(path, documentRaw)
		if err != nil {
			return err
		}
		documentCollection, _ := document["collection"].(string)
		id, _ := document["id"].(string)
		key := documentCollection + "\x00" + id
		if previous, duplicate := loaded[key]; duplicate {
			return fmt.Errorf("duplicate offline document identity (%s, %s) in %s and %s", documentCollection, id, previous.path, path)
		}
		canonical, err := canonicalise(document)
		if err != nil {
			return err
		}
		digest := sha256.Sum256([]byte(canonical))
		revision, err := positiveInteger(document["revision"])
		if err != nil {
			return fmt.Errorf("document %s revision: %w", entry.Name(), err)
		}
		loaded[key] = loadedDocument{revision: revision, digest: hex.EncodeToString(digest[:]), path: path}
	}

	locks, _ := pack["documents"].([]any)
	for index, value := range locks {
		lock, _ := value.(map[string]any)
		id, _ := lock["id"].(string)
		document, present := loaded[collection+"\x00"+id]
		if !present {
			return fmt.Errorf("documents/%d: offline document (%s, %s) is missing", index, collection, id)
		}
		lockRevision, err := positiveInteger(lock["revision"])
		if err != nil {
			return fmt.Errorf("documents/%d/revision: %w", index, err)
		}
		if document.revision != lockRevision {
			return fmt.Errorf("documents/%d/revision: lock has %d but document has %d", index, lockRevision, document.revision)
		}
		lockDigest, _ := lock["sha256"].(string)
		if document.digest != lockDigest {
			return fmt.Errorf("documents/%d/sha256: lock digest does not match %s", index, document.path)
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

func validateFileSuffix(path string, pack bool) error {
	if pack {
		if strings.HasSuffix(path, ".schemami-pack.json") || strings.HasSuffix(path, ".schemami-pack.yaml") {
			return nil
		}
		return fmt.Errorf("pack file must use .schemami-pack.json or .schemami-pack.yaml")
	}
	if strings.HasSuffix(path, ".schemami.json") || strings.HasSuffix(path, ".schemami.yaml") {
		return nil
	}
	return fmt.Errorf("recipe file must use .schemami.json or .schemami.yaml")
}

func parseDocument(path string, raw []byte) (map[string]any, error) {
	var value any
	var err error
	if filepath.Ext(path) == ".json" {
		if err := rejectDuplicateJSONKeys(raw); err != nil {
			return nil, err
		}
		err = json.Unmarshal(raw, &value)
	} else {
		var yamlValue any
		if err = yaml.Unmarshal(raw, &yamlValue); err == nil {
			value, err = jsonValue(yamlValue)
		}
	}
	if err != nil {
		return nil, err
	}
	doc, ok := value.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("document root must be an object")
	}
	return doc, nil
}

func schemaFor(path string) (*jsonschema.Schema, error) {
	return namedSchemaFor(path, "schemami-v1-core.schema.json")
}

func namedSchemaFor(path, schemaName string) (*jsonschema.Schema, error) {
	start, err := filepath.Abs(filepath.Dir(path))
	if err != nil {
		return nil, err
	}
	root, found := findSchemaRoot(start, schemaName)
	if !found {
		workingDirectory, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		root, found = findSchemaRoot(workingDirectory, schemaName)
		if !found {
			return nil, fmt.Errorf("schema %s not found from document path or tool working directory", schemaName)
		}
	}
	schPath := filepath.Join(root, "schema", schemaName)
	b, err := os.ReadFile(schPath)
	if err != nil {
		return nil, err
	}
	var schema any
	if err := json.Unmarshal(b, &schema); err != nil {
		return nil, err
	}
	c := jsonschema.NewCompiler()
	c.DefaultDraft(jsonschema.Draft2020)
	c.AssertFormat()
	if err := c.AddResource(schPath, schema); err != nil {
		return nil, err
	}
	return c.Compile(schPath)
}

func findSchemaRoot(start, schemaName string) (string, bool) {
	root := start
	for {
		if exists(filepath.Join(root, "schema", schemaName)) {
			return root, true
		}
		next := filepath.Dir(root)
		if next == root {
			return "", false
		}
		root = next
	}
}

func rejectDuplicateJSONKeys(raw []byte) error {
	if err := rejectLoneSurrogates(raw); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	if err := scanJSONValue(decoder); err != nil {
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

func scanJSONValue(decoder *json.Decoder) error {
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	delim, ok := token.(json.Delim)
	if !ok {
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
			if err := scanJSONValue(decoder); err != nil {
				return err
			}
		}
		_, err = decoder.Token()
		return err
	case '[':
		for decoder.More() {
			if err := scanJSONValue(decoder); err != nil {
				return err
			}
		}
		_, err = decoder.Token()
		return err
	default:
		return fmt.Errorf("unexpected delimiter %q", delim)
	}
}

func jsonValue(value any) (any, error) {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, child := range typed {
			converted, err := jsonValue(child)
			if err != nil {
				return nil, err
			}
			result[key] = converted
		}
		return result, nil
	case map[any]any:
		result := make(map[string]any, len(typed))
		for key, child := range typed {
			stringKey, ok := key.(string)
			if !ok {
				return nil, fmt.Errorf("YAML object key %q is not a string", key)
			}
			converted, err := jsonValue(child)
			if err != nil {
				return nil, err
			}
			result[stringKey] = converted
		}
		return result, nil
	case []any:
		result := make([]any, len(typed))
		for index, child := range typed {
			converted, err := jsonValue(child)
			if err != nil {
				return nil, err
			}
			result[index] = converted
		}
		return result, nil
	default:
		return value, nil
	}
}

func validatePackSemantics(doc map[string]any) error {
	documents, ok := doc["documents"].([]any)
	if !ok {
		return fmt.Errorf("documents must be an array")
	}
	seen := map[string]struct{}{}
	for index, value := range documents {
		document, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("documents/%d must be an object", index)
		}
		id, _ := document["id"].(string)
		if _, duplicate := seen[id]; duplicate {
			return fmt.Errorf("duplicate document lock id %q", id)
		}
		seen[id] = struct{}{}
	}
	return nil
}

func validateSemantics(doc map[string]any) error {
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

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
