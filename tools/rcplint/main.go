// rcplint — the informative-surface harness for the RCP protocol
// (SSP-001: nothing here is normative; the protocol lives in schema/ and
// registry/). Subcommands: validate (L1). lint (L2) and clamp arrive in
// later phases of PLAN-rcp-v01.
package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: rcplint <validate|lint|facts|clamp> [root]")
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
	case "lint":
		os.Exit(runLint(root))
	case "calc-vectors":
		out := "../../calculus/vectors"
		if len(os.Args) > 3 {
			out = os.Args[3]
		}
		os.Exit(runCalcVectors(root, out))
	case "vectors":
		out := "../viewer/conformance/vectors"
		if len(os.Args) > 3 {
			out = os.Args[3]
		}
		os.Exit(runVectors(root, out))
	case "facts":
		os.Exit(runFacts(root, os.Args[3:]))
	case "clamp":
		// rcplint clamp --scale N <file>[#docid] — THROWAWAY fail-closed
		// scaler guard (DS-SAFE-001), not the Recipe Calculus.
		if len(os.Args) < 5 || os.Args[2] != "--scale" {
			fmt.Fprintln(os.Stderr, "usage: rcplint clamp --scale N <file>[#docid]")
			os.Exit(2)
		}
		var scale float64
		if _, err := fmt.Sscanf(os.Args[3], "%g", &scale); err != nil || scale <= 0 {
			fmt.Fprintln(os.Stderr, "clamp: invalid scale")
			os.Exit(2)
		}
		spec := os.Args[4]
		file, docID := spec, ""
		if i := strings.IndexByte(spec, '#'); i >= 0 {
			file, docID = spec[:i], spec[i+1:]
		}
		os.Exit(runClamp(".", scale, file, docID))
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand %q\n", os.Args[1])
		os.Exit(2)
	}
}
