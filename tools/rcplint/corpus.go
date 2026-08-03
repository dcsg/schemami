package main

// Collection-aware corpus discovery (SR-PACK-001/002).
//
// A COLLECTION is the document set a consumer loads together, and ids
// are unique WITHIN one. Before v0.4 the corpus was three copies of
// `examples/*.rcp.yaml` and a flat id→document map in which a collision
// SILENTLY overwrote — that map is what this file replaces.
//
// Discovery: a directory holding rcp-pack.yaml is a collection root; a
// corpus root with no manifest anywhere is itself one collection (so a
// pre-v0.4 layout keeps working unchanged).
//
// Resolution: an unqualified reference resolves ONLY inside the
// referring document's own collection. Crossing collections requires
// naming the target collection. Unqualified lookup NEVER falls back to
// searching elsewhere — that is what makes misbinding impossible by
// construction rather than by convention.

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Collection is one loaded collection: its identifier, its root
// directory, and its documents.
type Collection struct {
	ID   string
	Dir  string
	Docs []Document
	// Manifest is the loaded manifest; HasManifest reports whether one
	// was found (a corpus root without one is still a collection).
	Manifest    PackManifest
	HasManifest bool
}

// Corpus is every collection a consumer loaded together.
type Corpus struct {
	Collections []Collection
	// Conflicts are manifest-vs-document identifier disagreements,
	// reported rather than silently resolved (SR-PACK-003).
	Conflicts []string
	// Errors are discovery failures that must fail the run.
	Errors []string
}

// collectionRoots finds the collection roots under a corpus root: every
// directory containing a manifest, or the corpus root itself when it
// holds documents and no manifest exists below it.
func collectionRoots(corpusRoot string) ([]string, error) {
	var withManifest []string
	err := filepath.WalkDir(corpusRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if strings.HasPrefix(d.Name(), ".") && path != corpusRoot {
				return fs.SkipDir
			}
			return nil
		}
		if d.Name() == PackManifestFile {
			withManifest = append(withManifest, filepath.Dir(path))
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(withManifest) > 0 {
		sort.Strings(withManifest)
		return withManifest, nil
	}
	// No manifest anywhere: the corpus root is one unnamed collection.
	// This is what keeps a pre-v0.4 layout working untouched.
	return []string{corpusRoot}, nil
}

// LoadCorpus discovers and loads every collection under corpusRoot
// (e.g. <repo>/examples). Documents are loaded per collection, and ids
// are checked for uniqueness WITHIN each collection — a duplicate id in
// one collection is an error, while the same id in two collections is
// entirely legal.
func LoadCorpus(corpusRoot string) (*Corpus, error) {
	roots, err := collectionRoots(corpusRoot)
	if err != nil {
		return nil, err
	}
	c := &Corpus{}
	for _, dir := range roots {
		man, found, err := LoadPackManifest(dir)
		if err != nil {
			c.Errors = append(c.Errors, err.Error())
			continue
		}
		paths, _ := filepath.Glob(filepath.Join(dir, "*.rcp.yaml"))
		sort.Strings(paths)
		col := Collection{Dir: dir, Manifest: man, HasManifest: found}
		if found {
			col.ID = man.Collection
		} else {
			col.ID = filepath.Base(dir)
		}
		seen := map[string]string{}
		for _, p := range paths {
			docs, err := LoadDocuments(p)
			if err != nil {
				return nil, fmt.Errorf("load %s: %w", p, err)
			}
			for _, d := range docs {
				if _, conflict := ResolveCollection(man, found, d); conflict != "" {
					c.Conflicts = append(c.Conflicts, conflict)
				}
				if prev, dup := seen[d.ID]; dup {
					c.Errors = append(c.Errors, fmt.Sprintf(
						"collection %q: duplicate document id %q (%s and %s) — ids must be unique within a collection",
						col.ID, d.ID, filepath.Base(prev), filepath.Base(d.File)))
					continue
				}
				seen[d.ID] = d.File
				col.Docs = append(col.Docs, d)
			}
		}
		c.Collections = append(c.Collections, col)
	}
	return c, nil
}

// Documents flattens the corpus in collection-then-file order.
func (c *Corpus) Documents() []Document {
	var out []Document
	for _, col := range c.Collections {
		out = append(out, col.Docs...)
	}
	return out
}

// Index is the collection-scoped replacement for the old flat siblings
// map: collection id → document id → document body.
type Index map[string]map[string]map[string]any

// Index builds the scoped lookup. Two collections may hold the same
// document id; neither overwrites the other.
func (c *Corpus) Index() Index {
	idx := Index{}
	for _, col := range c.Collections {
		bucket := idx[col.ID]
		if bucket == nil {
			bucket = map[string]map[string]any{}
			idx[col.ID] = bucket
		}
		for _, d := range col.Docs {
			if m, ok := d.Value.(map[string]any); ok {
				bucket[d.ID] = m
			}
		}
	}
	return idx
}

// CollectionOf reports which collection a document belongs to.
func (c *Corpus) CollectionOf(d Document) string {
	for _, col := range c.Collections {
		for _, x := range col.Docs {
			if x.File == d.File && x.Index == d.Index {
				return col.ID
			}
		}
	}
	return ""
}

// Resolve applies the scope rule to one reference.
//
//	from       — the collection the REFERRING document belongs to
//	qualifier  — the named target collection, or "" when unqualified
//	id         — the referenced document id
//
// An unqualified reference resolves only within `from`. A qualified one
// resolves only within the named collection. There is deliberately no
// fallback search: a reference that does not resolve in its own scope
// FAILS rather than silently binding to a same-named document elsewhere.
func (idx Index) Resolve(from, qualifier, id string) (map[string]any, bool) {
	scope := from
	if qualifier != "" {
		scope = qualifier
	}
	bucket, ok := idx[scope]
	if !ok {
		return nil, false
	}
	doc, ok := bucket[id]
	return doc, ok
}

// KnownCollection reports whether a collection identifier was loaded —
// so a qualified reference naming an absent collection can be told
// apart from one naming an absent document.
func (idx Index) KnownCollection(id string) bool {
	_, ok := idx[id]
	return ok
}

// SplitRef parses a reference into (qualifier, id). The qualified form
// is `collection/id`; anything without a separator is unqualified and
// resolves in the referring document's own collection.
func SplitRef(ref string) (qualifier, id string) {
	if i := strings.LastIndex(ref, "/"); i >= 0 {
		return ref[:i], ref[i+1:]
	}
	return "", ref
}

// corpusRootFor returns the conventional corpus root for a repo root.
func corpusRootFor(root string) string { return filepath.Join(root, "examples") }

// dirExists is a small helper used by callers that tolerate an absent
// corpus (the private collection is optional and git-ignored).
func dirExists(p string) bool {
	fi, err := os.Stat(p)
	return err == nil && fi.IsDir()
}
