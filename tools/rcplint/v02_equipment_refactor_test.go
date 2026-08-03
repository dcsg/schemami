package main

import (
	"path/filepath"
	"testing"
)

// English-base equipment refactor (DECISIONS #24; Daniel-approved batch
// 2026-08-02): four Portuguese common-noun ids get English successors;
// old ids stay resolvable as deprecated entries per governance rule 3.
func TestEquipmentEnglishBaseRefactor(t *testing.T) {
	pairs := map[string]string{
		"equipment.batedeira-espiral":         "equipment.mixer.spiral",
		"equipment.forno-alta-temperatura":    "equipment.oven.high-temperature",
		"equipment.forno-domestico-com-vapor": "equipment.oven.domestic-steam",
		"equipment.forno-lenha":               "equipment.oven.wood-fired",
	}
	for oldID, newID := range pairs {
		newDocs, err := LoadDocuments(filepath.Join(root, "registry/entries/equipment", newID+".yaml"))
		if err != nil {
			t.Errorf("successor entry missing: %s", newID)
			continue
		}
		nm := newDocs[0].Value.(map[string]any)
		aliasFound := false
		if as, ok := nm["aliases"].([]any); ok {
			for _, a := range as {
				if a == oldID {
					aliasFound = true
				}
			}
		}
		if !aliasFound {
			t.Errorf("%s: successor does not alias %s", newID, oldID)
		}
		oldDocs, err := LoadDocuments(filepath.Join(root, "registry/entries/equipment", oldID+".yaml"))
		if err != nil {
			t.Errorf("deprecated entry deleted — append-only violated: %s", oldID)
			continue
		}
		om := oldDocs[0].Value.(map[string]any)
		if om["status"] != "deprecated" {
			t.Errorf("%s: status = %v, want deprecated", oldID, om["status"])
		}
		if om["superseded_by"] != newID {
			t.Errorf("%s: superseded_by = %v, want %s", oldID, om["superseded_by"], newID)
		}
	}
}
