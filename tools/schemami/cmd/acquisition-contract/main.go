package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"mime"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"

	jsonschema "github.com/santhosh-tekuri/jsonschema/v6"
	"golang.org/x/text/language"
)

const contractID = "https://schemami.dev/contracts/source-to-candidate/1"

type manifest struct {
	Contract     string         `json:"contract"`
	SchemamiWire string         `json:"schemami_wire"`
	Files        []manifestFile `json:"files"`
}

type manifestFile struct {
	Path   string `json:"path"`
	SHA256 string `json:"sha256"`
}

type fixtureIndex struct {
	Cases []fixtureCase `json:"cases"`
}

type fixtureCase struct {
	ID            string `json:"id"`
	Schema        string `json:"schema"`
	Path          string `json:"path"`
	ExpectedValid bool   `json:"expected_valid"`
}

func main() {
	if len(os.Args) != 3 {
		fail("usage: acquisition-contract <build|verify|check> <contract-directory>")
	}
	directory, err := filepath.Abs(os.Args[2])
	if err != nil {
		fail(err.Error())
	}
	switch os.Args[1] {
	case "build":
		err = buildManifest(directory)
	case "verify":
		err = verifyManifest(directory)
	case "check":
		if err = verifyManifest(directory); err == nil {
			err = checkFixtures(directory)
		}
	default:
		fail("unknown command " + os.Args[1])
	}
	if err != nil {
		fail(err.Error())
	}
	fmt.Printf("acquisition-contract: %s passed\n", os.Args[1])
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, "acquisition-contract:", message)
	os.Exit(1)
}

func buildManifest(directory string) error {
	files, err := inventory(directory)
	if err != nil {
		return err
	}
	value := manifest{Contract: contractID, SchemamiWire: "1", Files: files}
	encoded, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')
	return os.WriteFile(filepath.Join(directory, "manifest.json"), encoded, 0o644)
}

func verifyManifest(directory string) error {
	raw, err := os.ReadFile(filepath.Join(directory, "manifest.json"))
	if err != nil {
		return err
	}
	if err := rejectDuplicateMembers(raw); err != nil {
		return fmt.Errorf("manifest: %w", err)
	}
	var got manifest
	if err := json.Unmarshal(raw, &got); err != nil {
		return fmt.Errorf("manifest: %w", err)
	}
	if got.Contract != contractID || got.SchemamiWire != "1" {
		return errors.New("manifest contract identity mismatch")
	}
	if err := validateFile(filepath.Join(directory, "manifest.schema.json"), raw); err != nil {
		return fmt.Errorf("manifest schema: %w", err)
	}
	want, err := inventory(directory)
	if err != nil {
		return err
	}
	if !equalFiles(got.Files, want) {
		return errors.New("manifest file inventory or digest mismatch; run build")
	}
	return nil
}

func inventory(directory string) ([]manifestFile, error) {
	var files []manifestFile
	err := filepath.WalkDir(directory, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() || entry.Name() == "manifest.json" {
			return nil
		}
		relative, err := filepath.Rel(directory, path)
		if err != nil {
			return err
		}
		relative = filepath.ToSlash(relative)
		if strings.HasPrefix(relative, "../") || strings.HasPrefix(relative, "/") {
			return fmt.Errorf("unsafe manifest path %q", relative)
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		digest := sha256.Sum256(raw)
		files = append(files, manifestFile{Path: relative, SHA256: hex.EncodeToString(digest[:])})
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	return files, nil
}

func equalFiles(left, right []manifestFile) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}

func checkFixtures(directory string) error {
	indexRaw, err := os.ReadFile(filepath.Join(directory, "fixtures", "index.json"))
	if err != nil {
		return err
	}
	var index fixtureIndex
	if err := json.Unmarshal(indexRaw, &index); err != nil {
		return err
	}
	if len(index.Cases) == 0 {
		return errors.New("fixture index is empty")
	}
	compiled := map[string]*jsonschema.Schema{}
	seen := map[string]bool{}
	for _, test := range index.Cases {
		if test.ID == "" || seen[test.ID] {
			return fmt.Errorf("fixture id %q is empty or duplicated", test.ID)
		}
		seen[test.ID] = true
		schema := compiled[test.Schema]
		if schema == nil {
			schema, err = compileSchema(filepath.Join(directory, test.Schema))
			if err != nil {
				return fmt.Errorf("compile %s: %w", test.Schema, err)
			}
			compiled[test.Schema] = schema
		}
		raw, err := os.ReadFile(filepath.Join(directory, filepath.FromSlash(test.Path)))
		if err != nil {
			return fmt.Errorf("%s: %w", test.ID, err)
		}
		actualErr := validateRaw(schema, raw)
		if actualErr == nil && test.Schema == "acquisition-request.schema.json" {
			actualErr = validateRequestStandards(raw)
		}
		actualValid := actualErr == nil
		if actualValid != test.ExpectedValid {
			return fmt.Errorf("%s: expected valid=%t, got valid=%t: %v", test.ID, test.ExpectedValid, actualValid, actualErr)
		}
	}
	return validateExampleCandidateAndDigest(directory)
}

func compileSchema(path string) (*jsonschema.Schema, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	compiler.AssertFormat()
	if err := compiler.AddResource(path, value); err != nil {
		return nil, err
	}
	return compiler.Compile(path)
}

func validateFile(schemaPath string, raw []byte) error {
	schema, err := compileSchema(schemaPath)
	if err != nil {
		return err
	}
	return validateRaw(schema, raw)
}

func validateRaw(schema *jsonschema.Schema, raw []byte) error {
	if err := rejectDuplicateMembers(raw); err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return err
	}
	if decoder.More() {
		return errors.New("multiple JSON values")
	}
	return schema.Validate(value)
}

func validateRequestStandards(raw []byte) error {
	var request struct {
		Document struct {
			ContentLanguage string `json:"content_language"`
		} `json:"document"`
		Sources []struct {
			ID        string `json:"id"`
			MediaType string `json:"media_type"`
			URI       string `json:"uri"`
		} `json:"sources"`
	}
	if err := json.Unmarshal(raw, &request); err != nil {
		return err
	}
	tag, err := language.Parse(request.Document.ContentLanguage)
	if err != nil {
		return fmt.Errorf("content_language is not a BCP 47 language tag: %w", err)
	}
	if tag.String() != request.Document.ContentLanguage {
		return fmt.Errorf("content_language must use canonical BCP 47 spelling; got %q, canonical %q", request.Document.ContentLanguage, tag.String())
	}
	seen := map[string]bool{}
	for _, source := range request.Sources {
		if seen[source.ID] {
			return fmt.Errorf("duplicate source id %q", source.ID)
		}
		seen[source.ID] = true
		if source.MediaType != "" {
			if _, _, err := mime.ParseMediaType(source.MediaType); err != nil {
				return fmt.Errorf("source %s media_type: %w", source.ID, err)
			}
		}
		if source.URI != "" {
			if _, err := url.Parse(source.URI); err != nil {
				return fmt.Errorf("source %s uri: %w", source.ID, err)
			}
		}
	}
	return nil
}

func validateExampleCandidateAndDigest(directory string) error {
	candidate, err := os.ReadFile(filepath.Join(directory, "examples", "candidate.schemami.json"))
	if err != nil {
		return err
	}
	reportRaw, err := os.ReadFile(filepath.Join(directory, "examples", "acquisition-report.json"))
	if err != nil {
		return err
	}
	var report struct {
		SubmittedSHA256 string `json:"submitted_sha256"`
	}
	if err := json.Unmarshal(reportRaw, &report); err != nil {
		return err
	}
	digest := sha256.Sum256(candidate)
	if report.SubmittedSHA256 != hex.EncodeToString(digest[:]) {
		return errors.New("example report submitted_sha256 does not match exact candidate bytes")
	}
	return nil
}

func rejectDuplicateMembers(raw []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	return scanValue(decoder)
}

func scanValue(decoder *json.Decoder) error {
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	delimiter, ok := token.(json.Delim)
	if !ok {
		return nil
	}
	switch delimiter {
	case '{':
		seen := map[string]bool{}
		for decoder.More() {
			nameToken, err := decoder.Token()
			if err != nil {
				return err
			}
			name, ok := nameToken.(string)
			if !ok {
				return errors.New("object member name is not a string")
			}
			if seen[name] {
				return fmt.Errorf("duplicate object member %q", name)
			}
			seen[name] = true
			if err := scanValue(decoder); err != nil {
				return err
			}
		}
	case '[':
		for decoder.More() {
			if err := scanValue(decoder); err != nil {
				return err
			}
		}
	default:
		return errors.New("unexpected JSON delimiter")
	}
	_, err = decoder.Token()
	return err
}
