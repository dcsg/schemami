// Package records implements verified publish-time reference
// resolution: the record format, its canonicalisation, and the two
// verification modes.
//
// Standard library ONLY (the dependency freeze). Nothing here imports
// beyond encoding/json, sort, strconv, strings, math, fmt, crypto —
// asserted by a test, because a hashing implementation that quietly
// grows a dependency is a supply-chain surface.
package records

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

// Canonicalise serialises a value per RFC 8785 (JSON Canonicalization
// Scheme). The scheme is named explicitly because "canonical JSON" is
// not a thing: Go's encoding/json HTML-escapes < > & by default and
// formats floats its own way, so two implementations reading the same
// document would hash differently. RFC 8785 fixes:
//
//   - object keys sorted by their UTF-16 code units
//   - no insignificant whitespace
//   - minimal string escaping (only ", \ and C0 controls)
//   - numbers per ECMAScript Number::toString
//
// The input MUST be a generic parsed value (map[string]any, []any,
// string, float64, bool, nil) — never a typed struct. A struct silently
// drops exactly the unknown fields the decode-compatibility contract
// requires readers to tolerate, so hashing one would let an attacker
// append fields a newer reader honours while the hash still matched.
func Canonicalise(v any) (string, error) {
	var b strings.Builder
	if err := write(&b, v); err != nil {
		return "", err
	}
	return b.String(), nil
}

func write(b *strings.Builder, v any) error {
	switch t := v.(type) {
	case nil:
		b.WriteString("null")
	case bool:
		if t {
			b.WriteString("true")
		} else {
			b.WriteString("false")
		}
	case string:
		writeString(b, t)
	case float64:
		s, err := formatNumber(t)
		if err != nil {
			return err
		}
		b.WriteString(s)
	case int:
		b.WriteString(strconv.Itoa(t))
	case int64:
		b.WriteString(strconv.FormatInt(t, 10))
	case []any:
		b.WriteByte('[')
		for i, e := range t {
			if i > 0 {
				b.WriteByte(',')
			}
			if err := write(b, e); err != nil {
				return err
			}
		}
		b.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(t))
		for k := range t {
			keys = append(keys, k)
		}
		sortUTF16(keys)
		b.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				b.WriteByte(',')
			}
			writeString(b, k)
			b.WriteByte(':')
			if err := write(b, t[k]); err != nil {
				return err
			}
		}
		b.WriteByte('}')
	default:
		return fmt.Errorf("canonicalise: unsupported type %T — the input must be a generic parsed value, never a typed struct", v)
	}
	return nil
}

// sortUTF16 orders keys by UTF-16 code units, as RFC 8785 requires.
// This differs from Go's byte-wise string comparison for characters
// outside the BMP: a supplementary character sorts as its surrogate
// pair, which is BELOW U+E000..U+FFFF, whereas UTF-8 bytes sort it
// above. Recipe documents use accented Latin (all BMP) so the two agree
// today — the distinction is implemented anyway, because a hash that is
// only correct for the corpus you happened to test is not a hash.
func sortUTF16(keys []string) {
	sort.Slice(keys, func(i, j int) bool {
		a, b := utf16Units(keys[i]), utf16Units(keys[j])
		for k := 0; k < len(a) && k < len(b); k++ {
			if a[k] != b[k] {
				return a[k] < b[k]
			}
		}
		return len(a) < len(b)
	})
}

func utf16Units(s string) []uint16 {
	var out []uint16
	for _, r := range s {
		if r >= 0x10000 {
			r -= 0x10000
			out = append(out, uint16(0xD800+(r>>10)), uint16(0xDC00+(r&0x3FF)))
		} else {
			out = append(out, uint16(r))
		}
	}
	return out
}

// writeString applies RFC 8785's minimal escaping. Notably it does NOT
// escape <, > or & — Go's encoding/json does by default, and that alone
// would make two conforming implementations disagree.
func writeString(b *strings.Builder, s string) {
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\b':
			b.WriteString(`\b`)
		case '\f':
			b.WriteString(`\f`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		default:
			if r < 0x20 {
				fmt.Fprintf(b, `\u%04x`, r)
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
}

// formatNumber renders a float per ECMAScript Number::toString, which
// RFC 8785 mandates. NaN and infinities are not representable in JSON
// and are an error rather than a silent substitution.
func formatNumber(f float64) (string, error) {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "", fmt.Errorf("canonicalise: %v is not representable in JSON", f)
	}
	if f == 0 {
		return "0", nil // ES prints -0 as "0"
	}
	// Integers below 1e21 print without an exponent, as ES does.
	if f == math.Trunc(f) && math.Abs(f) < 1e21 {
		return strconv.FormatFloat(f, 'f', -1, 64), nil
	}
	s := strconv.FormatFloat(f, 'g', -1, 64)
	// Go writes "1e+21"/"1e-07"; ES writes "1e+21"/"1e-7" — strip the
	// zero-padded exponent so both implementations agree.
	if i := strings.IndexAny(s, "eE"); i >= 0 {
		mant, exp := s[:i], s[i+1:]
		sign := ""
		if exp[0] == '+' || exp[0] == '-' {
			sign, exp = string(exp[0]), exp[1:]
		}
		exp = strings.TrimLeft(exp, "0")
		if exp == "" {
			exp = "0"
		}
		return mant + "e" + sign + exp, nil
	}
	return s, nil
}
