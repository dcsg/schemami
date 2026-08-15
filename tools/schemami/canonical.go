package main

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

// canonicalise admits I-JSON-compatible values and serialises RFC 8785 JCS
// bytes. Decimal recipe values are strings, so only revision and extension
// values exercise JSON-number canonicalisation.
func canonicalise(value any) (string, error) {
	admitted, err := admitIJSON(value)
	if err != nil {
		return "", err
	}
	var output strings.Builder
	if err := writeJCS(&output, admitted); err != nil {
		return "", err
	}
	return output.String(), nil
}

// encoding/json substitutes U+FFFD for a lone UTF-16 surrogate. That would
// make malformed input indistinguishable from a document containing U+FFFD,
// so detect it before decoding JSON source bytes.
func rejectLoneSurrogates(raw []byte) error {
	inString := false
	for index := 0; index < len(raw); index++ {
		if !inString {
			if raw[index] == '"' {
				inString = true
			}
			continue
		}
		if raw[index] == '"' {
			inString = false
			continue
		}
		if raw[index] != '\\' {
			continue
		}
		if index+1 >= len(raw) {
			return fmt.Errorf("unterminated escape")
		}
		if raw[index+1] != 'u' {
			index++
			continue
		}
		if index+5 >= len(raw) {
			return fmt.Errorf("truncated Unicode escape")
		}
		unit, ok := parseHexUnit(raw[index+2 : index+6])
		if !ok {
			return fmt.Errorf("invalid Unicode escape")
		}
		switch {
		case unit >= 0xd800 && unit <= 0xdbff:
			if index+11 >= len(raw) || raw[index+6] != '\\' || raw[index+7] != 'u' {
				return fmt.Errorf("lone high surrogate")
			}
			low, ok := parseHexUnit(raw[index+8 : index+12])
			if !ok || low < 0xdc00 || low > 0xdfff {
				return fmt.Errorf("lone high surrogate")
			}
			index += 11
		case unit >= 0xdc00 && unit <= 0xdfff:
			return fmt.Errorf("lone low surrogate")
		default:
			index += 5
		}
	}
	return nil
}

func parseHexUnit(raw []byte) (uint16, bool) {
	if len(raw) != 4 {
		return 0, false
	}
	var value uint16
	for _, b := range raw {
		value <<= 4
		switch {
		case b >= '0' && b <= '9':
			value |= uint16(b - '0')
		case b >= 'a' && b <= 'f':
			value |= uint16(b-'a') + 10
		case b >= 'A' && b <= 'F':
			value |= uint16(b-'A') + 10
		default:
			return 0, false
		}
	}
	return value, true
}

func admitIJSON(value any) (any, error) {
	switch typed := value.(type) {
	case nil, bool:
		return typed, nil
	case string:
		if !utf8.ValidString(typed) {
			return nil, fmt.Errorf("I-JSON string is not valid UTF-8")
		}
		return typed, nil
	case float64:
		if math.IsNaN(typed) || math.IsInf(typed, 0) {
			return nil, fmt.Errorf("I-JSON number is not finite binary64")
		}
		return typed, nil
	case float32:
		return nil, fmt.Errorf("I-JSON number uses float32 instead of binary64")
	case int:
		return admitInteger(int64(typed))
	case int8:
		return admitInteger(int64(typed))
	case int16:
		return admitInteger(int64(typed))
	case int32:
		return admitInteger(int64(typed))
	case int64:
		return admitInteger(typed)
	case uint:
		return admitUnsignedInteger(uint64(typed))
	case uint8:
		return admitUnsignedInteger(uint64(typed))
	case uint16:
		return admitUnsignedInteger(uint64(typed))
	case uint32:
		return admitUnsignedInteger(uint64(typed))
	case uint64:
		return admitUnsignedInteger(typed)
	case json.Number:
		parsed, err := strconv.ParseFloat(typed.String(), 64)
		if err != nil {
			return nil, fmt.Errorf("I-JSON number %q is invalid", typed)
		}
		return admitIJSON(parsed)
	case []any:
		out := make([]any, len(typed))
		for index, child := range typed {
			admitted, err := admitIJSON(child)
			if err != nil {
				return nil, fmt.Errorf("I-JSON array index %d: %w", index, err)
			}
			out[index] = admitted
		}
		return out, nil
	case map[string]any:
		out := make(map[string]any, len(typed))
		for key, child := range typed {
			if !utf8.ValidString(key) {
				return nil, fmt.Errorf("I-JSON object key is not valid UTF-8")
			}
			admitted, err := admitIJSON(child)
			if err != nil {
				return nil, fmt.Errorf("I-JSON object key %q: %w", key, err)
			}
			out[key] = admitted
		}
		return out, nil
	default:
		return nil, fmt.Errorf("I-JSON unsupported value type %T", value)
	}
}

func admitInteger(value int64) (any, error) {
	converted := float64(value)
	if int64(converted) != value {
		return nil, fmt.Errorf("I-JSON integer %d is not exactly representable as binary64", value)
	}
	return converted, nil
}

func admitUnsignedInteger(value uint64) (any, error) {
	converted := float64(value)
	if uint64(converted) != value {
		return nil, fmt.Errorf("I-JSON integer %d is not exactly representable as binary64", value)
	}
	return converted, nil
}

func writeJCS(output *strings.Builder, value any) error {
	switch typed := value.(type) {
	case nil:
		output.WriteString("null")
	case bool:
		output.WriteString(strconv.FormatBool(typed))
	case string:
		writeJCSString(output, typed)
	case float64:
		number, err := formatJCSNumber(typed)
		if err != nil {
			return err
		}
		output.WriteString(number)
	case []any:
		output.WriteByte('[')
		for index, child := range typed {
			if index > 0 {
				output.WriteByte(',')
			}
			if err := writeJCS(output, child); err != nil {
				return err
			}
		}
		output.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sortUTF16(keys)
		output.WriteByte('{')
		for index, key := range keys {
			if index > 0 {
				output.WriteByte(',')
			}
			writeJCSString(output, key)
			output.WriteByte(':')
			if err := writeJCS(output, typed[key]); err != nil {
				return err
			}
		}
		output.WriteByte('}')
	default:
		return fmt.Errorf("I-JSON internal unsupported value type %T", value)
	}
	return nil
}

func writeJCSString(output *strings.Builder, value string) {
	output.WriteByte('"')
	for _, r := range value {
		switch r {
		case '"':
			output.WriteString(`\"`)
		case '\\':
			output.WriteString(`\\`)
		case '\b':
			output.WriteString(`\b`)
		case '\f':
			output.WriteString(`\f`)
		case '\n':
			output.WriteString(`\n`)
		case '\r':
			output.WriteString(`\r`)
		case '\t':
			output.WriteString(`\t`)
		default:
			if r < 0x20 {
				fmt.Fprintf(output, `\u%04x`, r)
			} else {
				output.WriteRune(r)
			}
		}
	}
	output.WriteByte('"')
}

func sortUTF16(keys []string) {
	sort.Slice(keys, func(left, right int) bool {
		leftUnits, rightUnits := utf16Units(keys[left]), utf16Units(keys[right])
		for index := 0; index < len(leftUnits) && index < len(rightUnits); index++ {
			if leftUnits[index] != rightUnits[index] {
				return leftUnits[index] < rightUnits[index]
			}
		}
		return len(leftUnits) < len(rightUnits)
	})
}

func utf16Units(value string) []uint16 {
	var units []uint16
	for _, r := range value {
		if r >= 0x10000 {
			r -= 0x10000
			units = append(units, uint16(0xd800+(r>>10)), uint16(0xdc00+(r&0x3ff)))
		} else {
			units = append(units, uint16(r))
		}
	}
	return units
}

func formatJCSNumber(value float64) (string, error) {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return "", fmt.Errorf("I-JSON number is not finite binary64")
	}
	if value == 0 {
		return "0", nil
	}
	scientific := strconv.FormatFloat(value, 'e', -1, 64)
	parts := strings.SplitN(scientific, "e", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("unexpected numeric form %q", scientific)
	}
	exponent, err := strconv.Atoi(parts[1])
	if err != nil {
		return "", err
	}
	mantissa := parts[0]
	sign := ""
	if strings.HasPrefix(mantissa, "-") {
		sign, mantissa = "-", mantissa[1:]
	}
	digits := strings.ReplaceAll(mantissa, ".", "")
	if exponent >= 21 || exponent <= -7 {
		out := sign + digits[:1]
		if len(digits) > 1 {
			out += "." + digits[1:]
		}
		if exponent >= 0 {
			return out + "e+" + strconv.Itoa(exponent), nil
		}
		return out + "e" + strconv.Itoa(exponent), nil
	}
	if exponent >= 0 {
		if len(digits) <= exponent+1 {
			return sign + digits + strings.Repeat("0", exponent+1-len(digits)), nil
		}
		return sign + digits[:exponent+1] + "." + digits[exponent+1:], nil
	}
	return sign + "0." + strings.Repeat("0", -exponent-1) + digits, nil
}
