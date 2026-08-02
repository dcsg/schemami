// rcplint — the informative-surface harness for the RCP protocol
// (SSP-001: nothing here is normative; the protocol lives in schema/ and
// registry/). Subcommands: validate (L1). lint (L2) and clamp arrive in
// later phases of PLAN-rcp-v01.
package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: rcplint <validate> [root]")
		os.Exit(2)
	}
	root := "."
	if len(os.Args) > 2 {
		root = os.Args[2]
	}
	if abs, err := filepath.Abs(root); err == nil {
		root = abs
	}
	switch os.Args[1] {
	case "validate":
		os.Exit(runValidate(root))
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand %q\n", os.Args[1])
		os.Exit(2)
	}
}
