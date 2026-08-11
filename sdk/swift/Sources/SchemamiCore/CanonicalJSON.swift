import CryptoKit
import Foundation

enum CanonicalJSON {
    static func encode(_ value: SchemamiValue) throws -> Data {
        var data = Data()
        try append(value, to: &data)
        return data
    }

    static func sha256(_ value: SchemamiValue) throws -> String {
        let digest = SHA256.hash(data: try encode(value))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    private static func append(_ value: SchemamiValue, to data: inout Data) throws {
        switch value {
        case .null:
            data.append(contentsOf: "null".utf8)
        case .boolean(let boolean):
            data.append(contentsOf: (boolean ? "true" : "false").utf8)
        case .string(let string):
            appendString(string, to: &data)
        case .integer(let integer):
            let number = Double(integer)
            guard Int(exactly: number) == integer else { throw CanonicalError.numberNotIJSON }
            data.append(contentsOf: try formatNumber(number).utf8)
        case .number(let number):
            data.append(contentsOf: try formatNumber(number).utf8)
        case .array(let values):
            data.append(UInt8(ascii: "["))
            for (index, child) in values.enumerated() {
                if index > 0 { data.append(UInt8(ascii: ",")) }
                try append(child, to: &data)
            }
            data.append(UInt8(ascii: "]"))
        case .object(let members):
            data.append(UInt8(ascii: "{"))
            let sorted = members.sorted { utf16Less($0.name, $1.name) }
            for (index, member) in sorted.enumerated() {
                if index > 0 { data.append(UInt8(ascii: ",")) }
                appendString(member.name, to: &data)
                data.append(UInt8(ascii: ":"))
                try append(member.value, to: &data)
            }
            data.append(UInt8(ascii: "}"))
        }
    }

    private static func appendString(_ value: String, to data: inout Data) {
        data.append(UInt8(ascii: "\""))
        for scalar in value.unicodeScalars {
            switch scalar.value {
            case 0x22: data.append(contentsOf: #"\""#.utf8)
            case 0x5c: data.append(contentsOf: #"\\"#.utf8)
            case 0x08: data.append(contentsOf: #"\b"#.utf8)
            case 0x0c: data.append(contentsOf: #"\f"#.utf8)
            case 0x0a: data.append(contentsOf: #"\n"#.utf8)
            case 0x0d: data.append(contentsOf: #"\r"#.utf8)
            case 0x09: data.append(contentsOf: #"\t"#.utf8)
            case 0x00...0x1f:
                data.append(contentsOf: String(format: "\\u%04x", scalar.value).utf8)
            default:
                data.append(contentsOf: String(scalar).utf8)
            }
        }
        data.append(UInt8(ascii: "\""))
    }

    private static func utf16Less(_ left: String, _ right: String) -> Bool {
        let lhs = Array(left.utf16)
        let rhs = Array(right.utf16)
        for index in 0..<min(lhs.count, rhs.count) where lhs[index] != rhs[index] {
            return lhs[index] < rhs[index]
        }
        return lhs.count < rhs.count
    }

    private static func formatNumber(_ value: Double) throws -> String {
        guard value.isFinite else { throw CanonicalError.numberNotIJSON }
        if value == 0 { return "0" }

        let source = String(value).lowercased()
        let parts = source.split(separator: "e", omittingEmptySubsequences: false)
        if parts.count == 1 {
            return trimDecimal(String(parts[0]))
        }
        guard parts.count == 2, let exponent = Int(parts[1]) else {
            throw CanonicalError.unexpectedNumber(source)
        }
        var mantissa = String(parts[0])
        let sign = mantissa.first == "-" ? "-" : ""
        if !sign.isEmpty { mantissa.removeFirst() }
        let digits = mantissa.replacingOccurrences(of: ".", with: "")
        guard !digits.isEmpty else { throw CanonicalError.unexpectedNumber(source) }

        if exponent >= 21 || exponent <= -7 {
            var output = sign + String(digits.first!)
            if digits.count > 1 { output += "." + digits.dropFirst() }
            return output + "e" + (exponent >= 0 ? "+" : "") + String(exponent)
        }
        if exponent >= 0 {
            if digits.count <= exponent + 1 {
                return sign + digits + String(repeating: "0", count: exponent + 1 - digits.count)
            }
            let split = digits.index(digits.startIndex, offsetBy: exponent + 1)
            return sign + digits[..<split] + "." + digits[split...]
        }
        return sign + "0." + String(repeating: "0", count: -exponent - 1) + digits
    }

    private static func trimDecimal(_ source: String) -> String {
        guard source.contains(".") else { return source }
        var result = source
        while result.last == "0" { result.removeLast() }
        if result.last == "." { result.removeLast() }
        return result == "-0" ? "0" : result
    }

    private enum CanonicalError: Error {
        case numberNotIJSON
        case unexpectedNumber(String)
    }
}
