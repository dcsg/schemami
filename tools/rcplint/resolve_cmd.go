package main

// The `resolve` subcommand: two modes over one corpus (SR-PUB-002).
//
//	resolve --reconcile   compute records and WRITE them
//	resolve --frozen      verify only; any divergence FAILS, nothing is written
//
// The split is npm's install/ci, and the reason is the same: a gate that
// can repair what it checks verifies nothing. Only FROZEN belongs in the
// acceptance sweep, and it reads committed records.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/dcsg/rcp/tools/rcplint/records"
)

// RecordsFile is where a collection's resolution records live —
// alongside the manifest, not inside the documents. Keeping them out of
// the documents avoids a self-reference problem: a record stored in a
// document would be part of the bytes its own hash covers.
const RecordsFile = "rcp-resolved.json"

// collectResolvable finds every cross-document reference in the corpus
// and the document each one names, scoped by the collection rule.
func collectResolvable(c *Corpus) (map[string]map[string]any, map[string]string) {
	idx := c.Index()
	present := map[string]map[string]any{}
	sources := map[string]string{}
	for _, col := range c.Collections {
		for _, d := range col.Docs {
			m, ok := d.Value.(map[string]any)
			if !ok {
				continue
			}
			comps, _ := m["components"].([]any)
			for _, cv := range comps {
				cm, ok := cv.(map[string]any)
				if !ok {
					continue
				}
				refRaw, isRef := cm["ref"].(string)
				if !isRef {
					continue
				}
				qualifier, id := SplitRef(refRaw)
				scope := col.ID
				if qualifier != "" {
					scope = qualifier
				}
				target, ok := idx.Resolve(col.ID, qualifier, id)
				if !ok {
					continue // unresolved refs are the linter's business
				}
				ver := 0
				if v, has := declaredVersion(target); has {
					ver = v
				}
				t := records.Target{Collection: scope, ID: id, Version: ver}
				present[t.String()] = target
				// Locator relative to the collection root, never absolute.
				for _, c2 := range c.Collections {
					if c2.ID != scope {
						continue
					}
					for _, td := range c2.Docs {
						if td.ID == id {
							sources[t.String()] = filepath.Join(scope, filepath.Base(td.File))
						}
					}
				}
			}
		}
	}
	return present, sources
}

func recordsPath(root string) string {
	return filepath.Join(corpusRootFor(root), RecordsFile)
}

func loadRecords(root string) ([]records.Record, error) {
	raw, err := os.ReadFile(recordsPath(root))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // an absent file is a frozen-mode FAILURE, not an error here
		}
		return nil, err
	}
	var recs []records.Record
	if err := json.Unmarshal(raw, &recs); err != nil {
		return nil, fmt.Errorf("%s: unparseable record file: %w", RecordsFile, err)
	}
	return recs, nil
}

func runResolve(root string, args []string) int {
	mode := ""
	for _, a := range args {
		switch a {
		case "--reconcile", "--frozen":
			mode = a
		}
	}
	if mode == "" {
		fmt.Fprintln(os.Stderr, "usage: rcplint resolve <root> --reconcile|--frozen")
		return 2
	}

	corpus, err := LoadCorpus(corpusRootFor(root))
	if err != nil {
		fmt.Fprintln(os.Stderr, "resolve:", err)
		return 2
	}
	present, sources := collectResolvable(corpus)

	if mode == "--reconcile" {
		var recs []records.Record
		var keys []string
		for k := range present {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			var t records.Target
			fmt.Sscanf(strings.ReplaceAll(k, "/", " "), "%s", &t.Collection)
			parts := strings.SplitN(k, "/", 2)
			idver := strings.SplitN(parts[1], "@", 2)
			t.Collection = parts[0]
			t.ID = idver[0]
			fmt.Sscanf(idver[1], "%d", &t.Version)
			r, err := records.NewRecord(t, sources[k], present[k])
			if err != nil {
				fmt.Fprintln(os.Stderr, "resolve:", err)
				return 2
			}
			recs = append(recs, r)
		}
		out, _ := json.MarshalIndent(recs, "", "  ")
		if err := os.WriteFile(recordsPath(root), append(out, '\n'), 0o644); err != nil {
			fmt.Fprintln(os.Stderr, "resolve:", err)
			return 2
		}
		fmt.Printf("resolve: wrote %d record(s) to %s\n", len(recs), RecordsFile)
		return 0
	}

	// --frozen: verify only, write nothing.
	recs, err := loadRecords(root)
	if err != nil {
		fmt.Fprintln(os.Stderr, "resolve:", err)
		return 1
	}
	v := records.VerifyFrozen(recs, present)
	for _, f := range v.Failures {
		fmt.Printf("RESOLVE FAIL %s\n", f)
	}
	if !v.OK() {
		fmt.Printf("resolve: FAILED (%d verified, %d failure(s))\n", v.Verified, len(v.Failures))
		return 1
	}
	fmt.Printf("resolve: %d reference(s) verified against their records\n", v.Verified)
	return 0
}
