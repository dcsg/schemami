package main

// Pack manifests (SR-PACK-003): a collection declares its identity in
// rcp-pack.yaml beside its documents. A SEPARATE file format, never a
// `kind:` value on the recipe core — that keeps the kind enum and the
// decode-compatibility surface untouched.
//
// Authority rule: the manifest is authoritative. A document MAY carry
// `collection` for lone travel; where both exist and disagree, the
// MANIFEST WINS and the conflict is REPORTED — never silently resolved.

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	yaml "gopkg.in/yaml.v3"
)

// PackManifestFile is the conventional manifest filename inside a
// collection root.
const PackManifestFile = "rcp-pack.yaml"

// PackManifest is a loaded collection manifest.
type PackManifest struct {
	// Dir is the collection root (the directory holding the manifest).
	Dir string
	// Collection is the authoritative collection identifier.
	Collection string
	// Value is the raw manifest for schema validation.
	Value any
}

// LoadPackManifest reads dir/rcp-pack.yaml. found=false with no error
// means the directory simply has no manifest — callers decide whether
// that is legal (a lone document may self-declare instead).
func LoadPackManifest(dir string) (m PackManifest, found bool, err error) {
	path := filepath.Join(dir, PackManifestFile)
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return PackManifest{}, false, nil
		}
		return PackManifest{}, false, err
	}
	var v any
	if err := yaml.Unmarshal(raw, &v); err != nil {
		return PackManifest{}, false, fmt.Errorf("%s: %w", path, err)
	}
	jv := toJSON(v)
	mm, ok := jv.(map[string]any)
	if !ok {
		return PackManifest{}, false, fmt.Errorf("%s: manifest is not a mapping", path)
	}
	id, _ := mm["collection"].(string)
	if strings.TrimSpace(id) == "" {
		return PackManifest{}, false, fmt.Errorf("%s: manifest declares no collection identifier", path)
	}
	return PackManifest{Dir: dir, Collection: id, Value: jv}, true, nil
}

// DocumentCollection reports the collection a document self-declares,
// or "" when it declares none.
func DocumentCollection(d Document) string {
	m, ok := d.Value.(map[string]any)
	if !ok {
		return ""
	}
	c, _ := m["collection"].(string)
	return c
}

// ResolveCollection applies the authority rule to one document: the
// manifest wins, and a disagreeing self-declaration is reported.
// conflict is empty when there is nothing to report.
func ResolveCollection(man PackManifest, hasManifest bool, d Document) (collection, conflict string) {
	self := DocumentCollection(d)
	if !hasManifest {
		return self, ""
	}
	if self != "" && self != man.Collection {
		return man.Collection, fmt.Sprintf(
			"%s#%s: document declares collection %q but the manifest at %s declares %q — the manifest wins",
			relPath(man.Dir, d.File), d.ID, self, filepath.Join(man.Dir, PackManifestFile), man.Collection)
	}
	return man.Collection, ""
}
