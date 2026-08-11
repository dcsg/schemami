package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"os"
	"path/filepath"
	"strconv"

	jsonschema "github.com/santhosh-tekuri/jsonschema/v6"
)

const contractID = "https://schemami.dev/contracts/source-to-candidate/1"

type problem struct {
	Type    string `json:"type"`
	Pointer string `json:"pointer"`
}

type admission struct {
	Operation       string    `json:"operation"`
	Status          string    `json:"status"`
	SubmittedSHA256 string    `json:"submitted_sha256"`
	CanonicalSHA256 string    `json:"canonical_sha256,omitempty"`
	Problems        []problem `json:"problems"`
}

type repairRequest struct {
	Contract          string    `json:"contract"`
	ManifestSHA256    string    `json:"manifest_sha256"`
	SubmittedSHA256   string    `json:"submitted_sha256"`
	Attempt           int       `json:"attempt"`
	Problems          []problem `json:"problems"`
	AuthorizedSources []string  `json:"authorized_sources,omitempty"`
}

type acquisitionReport struct {
	SubmittedSHA256 string `json:"submitted_sha256"`
	Adapter         struct {
		ID      string `json:"id"`
		Release string `json:"release"`
	} `json:"adapter"`
	Coverage []struct {
		Source           string `json:"source"`
		Status           string `json:"status"`
		CandidatePointer string `json:"candidate_pointer,omitempty"`
	} `json:"coverage"`
	ReviewItems []struct {
		Code             string `json:"code"`
		CandidatePointer string `json:"candidate_pointer,omitempty"`
		Message          string `json:"message,omitempty"`
	} `json:"review_items"`
}

type adversarialCorpus struct {
	SchemaVersion int               `json:"schema_version"`
	Cases         []adversarialCase `json:"cases"`
}

type adversarialCase struct {
	ID                  string   `json:"id"`
	SourceKind          string   `json:"source_kind"`
	SourceExcerpt       string   `json:"source_excerpt"`
	Pressures           []string `json:"pressures"`
	Candidate           string   `json:"candidate"`
	Report              string   `json:"report"`
	ExpectedAdmission   string   `json:"expected_admission"`
	ExpectedReviewCodes []string `json:"expected_review_codes"`
	RepairOutcome       string   `json:"repair_outcome"`
}

func main() {
	if len(os.Args) < 2 {
		fail("usage: acquisition-harness <prepare-repair|verify-replacement|render|verify-corpus|list-cases|verify-case> ...")
	}
	var err error
	switch os.Args[1] {
	case "prepare-repair":
		if len(os.Args) != 8 {
			fail("usage: acquisition-harness prepare-repair <contract-dir> <candidate> <admission> <attempt> <max-attempts> <output>")
		}
		attempt, attemptErr := strconv.Atoi(os.Args[5])
		maximum, maximumErr := strconv.Atoi(os.Args[6])
		if attemptErr != nil || maximumErr != nil {
			fail("attempt values must be integers")
		}
		err = prepareRepair(os.Args[2], os.Args[3], os.Args[4], attempt, maximum, os.Args[7])
	case "verify-replacement":
		if len(os.Args) != 8 {
			fail("usage: acquisition-harness verify-replacement <contract-dir> <repair-request> <previous-candidate> <replacement-candidate> <replacement-report> <replacement-admission>")
		}
		err = verifyReplacement(os.Args[2], os.Args[3], os.Args[4], os.Args[5], os.Args[6], os.Args[7])
	case "render":
		if len(os.Args) != 5 {
			fail("usage: acquisition-harness render <admission> <report> <output-html>")
		}
		err = renderReport(os.Args[2], os.Args[3], os.Args[4])
	case "verify-corpus":
		if len(os.Args) != 5 {
			fail("usage: acquisition-harness verify-corpus <contract-dir> <corpus> <repository-root>")
		}
		err = verifyCorpus(os.Args[2], os.Args[3], os.Args[4])
	case "list-cases":
		if len(os.Args) != 3 {
			fail("usage: acquisition-harness list-cases <corpus>")
		}
		err = listCases(os.Args[2])
	case "verify-case":
		if len(os.Args) != 5 {
			fail("usage: acquisition-harness verify-case <corpus> <case-id> <admission>")
		}
		err = verifyCase(os.Args[2], os.Args[3], os.Args[4])
	default:
		fail("unknown command " + os.Args[1])
	}
	if err != nil {
		fail(err.Error())
	}
	if os.Args[1] != "list-cases" {
		fmt.Printf("acquisition-harness: %s passed\n", os.Args[1])
	}
}

func verifyCorpus(contractDirectory, corpusPath, repositoryRoot string) error {
	var corpus adversarialCorpus
	if err := readStrictJSON(corpusPath, &corpus); err != nil {
		return fmt.Errorf("corpus: %w", err)
	}
	if corpus.SchemaVersion != 1 || len(corpus.Cases) < 20 {
		return errors.New("corpus must use schema_version 1 and contain at least 20 cases")
	}
	requiredKinds := map[string]bool{"text": false, "url": false, "image": false, "document": false, "audio": false, "application_data": false}
	requiredPressures := map[string]bool{
		"hostile-instruction": false, "ambiguous-measure": false, "invention-pressure": false,
		"local-concept": false, "structured-method": false, "variation": false,
		"multiple-formulas": false, "components": false, "invalid-json": false,
		"invalid-extension": false, "source-report-identity": false, "repair-outcome": false,
	}
	seen := map[string]bool{}
	repairKinds := map[string]bool{}
	for _, test := range corpus.Cases {
		if test.ID == "" || seen[test.ID] {
			return fmt.Errorf("case id is empty or duplicated: %q", test.ID)
		}
		seen[test.ID] = true
		if _, ok := requiredKinds[test.SourceKind]; !ok {
			return fmt.Errorf("%s: unknown source kind %q", test.ID, test.SourceKind)
		}
		requiredKinds[test.SourceKind] = true
		if test.SourceExcerpt == "" || len(test.Pressures) == 0 {
			return fmt.Errorf("%s: source excerpt and pressures are required", test.ID)
		}
		for _, pressure := range test.Pressures {
			if _, ok := requiredPressures[pressure]; ok {
				requiredPressures[pressure] = true
			}
		}
		if test.ExpectedAdmission != "ok" && test.ExpectedAdmission != "refused" {
			return fmt.Errorf("%s: invalid expected admission", test.ID)
		}
		if test.RepairOutcome != "none" && test.RepairOutcome != "complete-replacement-requested" {
			return fmt.Errorf("%s: invalid repair outcome", test.ID)
		}
		repairKinds[test.RepairOutcome] = true
		candidatePath, err := safeRepositoryPath(repositoryRoot, test.Candidate)
		if err != nil {
			return fmt.Errorf("%s candidate: %w", test.ID, err)
		}
		reportPath, err := safeRepositoryPath(repositoryRoot, test.Report)
		if err != nil {
			return fmt.Errorf("%s report: %w", test.ID, err)
		}
		candidateDigest, err := fileDigest(candidatePath)
		if err != nil {
			return fmt.Errorf("%s candidate: %w", test.ID, err)
		}
		if err := validateAgainst(filepath.Join(contractDirectory, "acquisition-report.schema.json"), mustRead(reportPath)); err != nil {
			return fmt.Errorf("%s report schema: %w", test.ID, err)
		}
		var report acquisitionReport
		if err := readStrictJSON(reportPath, &report); err != nil {
			return fmt.Errorf("%s report: %w", test.ID, err)
		}
		if report.SubmittedSHA256 != candidateDigest {
			return fmt.Errorf("%s: report does not identify exact candidate bytes", test.ID)
		}
		codes := map[string]bool{}
		for _, item := range report.ReviewItems {
			codes[item.Code] = true
		}
		for _, code := range test.ExpectedReviewCodes {
			if !codes[code] {
				return fmt.Errorf("%s: report lacks expected review code %q", test.ID, code)
			}
		}
	}
	for kind, covered := range requiredKinds {
		if !covered {
			return fmt.Errorf("source kind %q is not covered", kind)
		}
	}
	for pressure, covered := range requiredPressures {
		if !covered {
			return fmt.Errorf("required pressure %q is not covered", pressure)
		}
	}
	if !repairKinds["none"] || !repairKinds["complete-replacement-requested"] {
		return errors.New("corpus must cover both admitted/no-repair and refused/complete-replacement outcomes")
	}
	return nil
}

func safeRepositoryPath(root, relative string) (string, error) {
	if filepath.IsAbs(relative) || relative == "" {
		return "", errors.New("path must be non-empty and repository-relative")
	}
	cleanRoot, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	resolved, err := filepath.Abs(filepath.Join(cleanRoot, filepath.Clean(relative)))
	if err != nil {
		return "", err
	}
	within, err := filepath.Rel(cleanRoot, resolved)
	if err != nil || within == ".." || filepath.IsAbs(within) || len(within) >= 3 && within[:3] == "../" {
		return "", errors.New("path escapes repository root")
	}
	return resolved, nil
}

func listCases(corpusPath string) error {
	var corpus adversarialCorpus
	if err := readStrictJSON(corpusPath, &corpus); err != nil {
		return err
	}
	for _, test := range corpus.Cases {
		if bytes.ContainsAny([]byte(test.ID+test.Candidate), "\t\r\n") {
			return fmt.Errorf("%s: unsafe list value", test.ID)
		}
		fmt.Printf("%s\t%s\n", test.ID, test.Candidate)
	}
	return nil
}

func verifyCase(corpusPath, id, admissionPath string) error {
	var corpus adversarialCorpus
	if err := readStrictJSON(corpusPath, &corpus); err != nil {
		return err
	}
	var selected *adversarialCase
	for index := range corpus.Cases {
		if corpus.Cases[index].ID == id {
			selected = &corpus.Cases[index]
			break
		}
	}
	if selected == nil {
		return fmt.Errorf("unknown adversarial case %q", id)
	}
	var result admission
	if err := readStrictJSON(admissionPath, &result); err != nil {
		return fmt.Errorf("admission: %w", err)
	}
	if result.Operation != "admit" || result.Status != selected.ExpectedAdmission {
		return fmt.Errorf("%s: admission status %q, expected %q", id, result.Status, selected.ExpectedAdmission)
	}
	if result.Status == "ok" && (result.CanonicalSHA256 == "" || len(result.Problems) != 0) {
		return fmt.Errorf("%s: successful admission envelope is inconsistent", id)
	}
	if result.Status == "refused" && (result.CanonicalSHA256 != "" || len(result.Problems) == 0) {
		return fmt.Errorf("%s: refused admission envelope is inconsistent", id)
	}
	return nil
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, "acquisition-harness:", message)
	os.Exit(1)
}

func prepareRepair(contractDirectory, candidatePath, admissionPath string, attempt, maximum int, outputPath string) error {
	if maximum < 1 || attempt < 1 {
		return errors.New("attempt budget must use positive integers")
	}
	if attempt > maximum {
		return errors.New("repair attempt budget exhausted")
	}
	manifestDigest, err := fileDigest(filepath.Join(contractDirectory, "manifest.json"))
	if err != nil {
		return err
	}
	candidateDigest, err := fileDigest(candidatePath)
	if err != nil {
		return err
	}
	var result admission
	if err := readStrictJSON(admissionPath, &result); err != nil {
		return fmt.Errorf("admission: %w", err)
	}
	if result.Operation != "admit" || result.Status != "refused" || len(result.Problems) == 0 {
		return errors.New("repair requires a refused deterministic admission with problems")
	}
	if result.CanonicalSHA256 != "" {
		return errors.New("refused admission must not claim canonical identity")
	}
	if result.SubmittedSHA256 != candidateDigest {
		return errors.New("stale admission submitted digest")
	}
	request := repairRequest{
		Contract: contractID, ManifestSHA256: manifestDigest,
		SubmittedSHA256: candidateDigest, Attempt: attempt, Problems: result.Problems,
	}
	encoded, err := json.MarshalIndent(request, "", "  ")
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')
	if err := validateAgainst(filepath.Join(contractDirectory, "repair-request.schema.json"), encoded); err != nil {
		return fmt.Errorf("generated repair request: %w", err)
	}
	return os.WriteFile(outputPath, encoded, 0o600)
}

func verifyReplacement(contractDirectory, repairPath, previousCandidatePath, replacementCandidatePath, reportPath, admissionPath string) error {
	var repair repairRequest
	if err := readStrictJSON(repairPath, &repair); err != nil {
		return fmt.Errorf("repair request: %w", err)
	}
	manifestDigest, err := fileDigest(filepath.Join(contractDirectory, "manifest.json"))
	if err != nil {
		return err
	}
	if repair.Contract != contractID || repair.ManifestSHA256 != manifestDigest {
		return errors.New("stale repair contract manifest digest")
	}
	previousDigest, err := fileDigest(previousCandidatePath)
	if err != nil {
		return err
	}
	if previousDigest != repair.SubmittedSHA256 {
		return errors.New("stale repair candidate digest")
	}
	replacementRaw, err := os.ReadFile(replacementCandidatePath)
	if err != nil {
		return err
	}
	var candidate map[string]any
	if err := decodeStrict(replacementRaw, &candidate); err != nil {
		return fmt.Errorf("replacement candidate: %w", err)
	}
	if candidate["schemami"] != "1" {
		return errors.New("replacement must be a complete Schemami recipe, not a patch or fragment")
	}
	replacementDigest := digest(replacementRaw)
	if replacementDigest == previousDigest {
		return errors.New("replacement candidate bytes are unchanged")
	}
	if err := validateAgainst(filepath.Join(contractDirectory, "acquisition-report.schema.json"), mustRead(reportPath)); err != nil {
		return fmt.Errorf("replacement report: %w", err)
	}
	var report acquisitionReport
	if err := readStrictJSON(reportPath, &report); err != nil {
		return fmt.Errorf("replacement report: %w", err)
	}
	if report.SubmittedSHA256 != replacementDigest {
		return errors.New("replacement report submitted digest mismatch")
	}
	var result admission
	if err := readStrictJSON(admissionPath, &result); err != nil {
		return fmt.Errorf("replacement admission: %w", err)
	}
	if result.Operation != "admit" || result.SubmittedSHA256 != replacementDigest {
		return errors.New("replacement admission submitted digest mismatch")
	}
	if result.Status == "ok" {
		if result.CanonicalSHA256 == "" || len(result.Problems) != 0 {
			return errors.New("successful replacement admission shape is inconsistent")
		}
	} else if result.Status == "refused" {
		if result.CanonicalSHA256 != "" || len(result.Problems) == 0 {
			return errors.New("refused replacement admission shape is inconsistent")
		}
	} else {
		return errors.New("unknown replacement admission status")
	}
	return nil
}

func renderReport(admissionPath, reportPath, outputPath string) error {
	var result admission
	if err := readStrictJSON(admissionPath, &result); err != nil {
		return fmt.Errorf("admission: %w", err)
	}
	var report acquisitionReport
	if err := readStrictJSON(reportPath, &report); err != nil {
		return fmt.Errorf("report: %w", err)
	}
	if result.SubmittedSHA256 != report.SubmittedSHA256 {
		return errors.New("report and admission identify different candidate bytes")
	}
	const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Schemami acquisition review</title><style>body{font:16px system-ui;max-width:72rem;margin:2rem auto;padding:0 1rem;color:#1d252c}code{overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #c9d1d9;padding:.5rem;text-align:left;vertical-align:top}.ok{color:#176b36}.refused{color:#a12424}</style></head><body><h1>Schemami acquisition review</h1><p>Adapter: <code>{{.Report.Adapter.ID}}</code> ({{.Report.Adapter.Release}})</p><p>Admission: <strong class="{{.Admission.Status}}">{{.Admission.Status}}</strong></p><p>Submitted SHA-256: <code>{{.Admission.SubmittedSHA256}}</code></p>{{if .Admission.CanonicalSHA256}}<p>Canonical SHA-256: <code>{{.Admission.CanonicalSHA256}}</code></p>{{end}}<h2>Problems</h2><table><tr><th>Type</th><th>Pointer</th></tr>{{range .Admission.Problems}}<tr><td>{{.Type}}</td><td><code>{{.Pointer}}</code></td></tr>{{else}}<tr><td colspan="2">None</td></tr>{{end}}</table><h2>Review items</h2><table><tr><th>Code</th><th>Pointer</th><th>Message</th></tr>{{range .Report.ReviewItems}}<tr><td>{{.Code}}</td><td><code>{{.CandidatePointer}}</code></td><td>{{.Message}}</td></tr>{{else}}<tr><td colspan="3">None</td></tr>{{end}}</table></body></html>`
	tmpl, err := template.New("report").Parse(page)
	if err != nil {
		return err
	}
	var output bytes.Buffer
	if err := tmpl.Execute(&output, struct {
		Admission admission
		Report    acquisitionReport
	}{result, report}); err != nil {
		return err
	}
	return os.WriteFile(outputPath, output.Bytes(), 0o600)
}

func validateAgainst(schemaPath string, raw []byte) error {
	var schemaValue any
	if err := decodeStrict(mustRead(schemaPath), &schemaValue); err != nil {
		return err
	}
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	compiler.AssertFormat()
	if err := compiler.AddResource(schemaPath, schemaValue); err != nil {
		return err
	}
	schema, err := compiler.Compile(schemaPath)
	if err != nil {
		return err
	}
	var value any
	if err := decodeStrict(raw, &value); err != nil {
		return err
	}
	return schema.Validate(value)
}

func readStrictJSON(path string, target any) error { return decodeStrict(mustRead(path), target) }

func decodeStrict(raw []byte, target any) error {
	if err := scanJSON(bytes.NewReader(raw)); err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if _, err := decoder.Token(); err != io.EOF {
		return errors.New("multiple JSON values")
	}
	return nil
}

func scanJSON(reader io.Reader) error {
	decoder := json.NewDecoder(reader)
	var scanValue func() error
	scanValue = func() error {
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
			seen := map[string]bool{}
			for decoder.More() {
				keyToken, err := decoder.Token()
				if err != nil {
					return err
				}
				key, ok := keyToken.(string)
				if !ok {
					return errors.New("object key is not a string")
				}
				if seen[key] {
					return fmt.Errorf("duplicate object member %q", key)
				}
				seen[key] = true
				if err := scanValue(); err != nil {
					return err
				}
			}
			_, err = decoder.Token()
			return err
		case '[':
			for decoder.More() {
				if err := scanValue(); err != nil {
					return err
				}
			}
			_, err = decoder.Token()
			return err
		default:
			return errors.New("unexpected JSON delimiter")
		}
	}
	if err := scanValue(); err != nil {
		return err
	}
	if _, err := decoder.Token(); err != io.EOF {
		return errors.New("multiple JSON values")
	}
	return nil
}

func mustRead(path string) []byte {
	raw, err := os.ReadFile(path)
	if err != nil {
		fail(err.Error())
	}
	return raw
}

func fileDigest(path string) (string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return digest(raw), nil
}

func digest(raw []byte) string {
	value := sha256.Sum256(raw)
	return hex.EncodeToString(value[:])
}
