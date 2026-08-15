package schemami

import _ "embed"

// Embedded schema bytes are generated from the repository v1 authorities.

//go:embed resources/schema/schemami-v1-core.schema.json
var embeddedCoreSchema []byte

//go:embed resources/schema/schemami-v1-bundle.schema.json
var embeddedBundleSchema []byte
