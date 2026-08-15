import BigInt
import Foundation
import OrderedJSON

public struct ParsedDocument: Sendable, Equatable {
    public let submittedJSON: Data
    public let value: SchemamiValue
    let schemaValue: JSONValue

    init(submittedJSON: Data, schemaValue: JSONValue, value: SchemamiValue? = nil) {
        self.submittedJSON = submittedJSON
        self.schemaValue = schemaValue
        self.value = value ?? SchemamiValue(schemaValue)
    }

    public static func == (lhs: ParsedDocument, rhs: ParsedDocument) -> Bool {
        lhs.submittedJSON == rhs.submittedJSON && lhs.value == rhs.value
    }
}

public enum ParseResult: Sendable, Equatable {
    case parsed(ParsedDocument)
    case refused([Problem])
}

public enum SchemamiCore {
    public static func parse(
        _ data: Data,
        budgets: ResourceBudgets = .protocolFloor
    ) -> ParseResult {
        do {
            let retained = try StrictJSONScanner(data: data, budgets: budgets).parse()
            let schemaValue = try JSONValue.parse(data)
            return .parsed(ParsedDocument(submittedJSON: data, schemaValue: schemaValue, value: retained))
        } catch let failure as ParseFailure {
            return .refused([failure.problem])
        } catch {
            return .refused([Problem(type: ProblemType.invalidJSON)])
        }
    }
}

private struct ParseFailure: Error {
    let problem: Problem
}

private struct StrictJSONScanner {
    let data: Data
    let budgets: ResourceBudgets

    func parse() throws -> SchemamiValue {
        var cursor = Cursor(bytes: Array(data), budgets: budgets)
        let value = try cursor.scanValue(depth: 0)
        cursor.skipWhitespace()
        guard cursor.isAtEnd else { throw cursor.failure(ProblemType.invalidJSON) }
        return value
    }

    private struct Cursor {
        let bytes: [UInt8]
        let budgets: ResourceBudgets
        var index = 0

        var isAtEnd: Bool { index == bytes.count }

        mutating func scanValue(depth: Int) throws -> SchemamiValue {
            skipWhitespace()
            guard let byte = peek else { throw failure(ProblemType.invalidJSON) }
            switch byte {
            case UInt8(ascii: "{"):
                return try scanObject(depth: depth)
            case UInt8(ascii: "["):
                return try scanArray(depth: depth)
            case UInt8(ascii: "\""):
                return .string(try scanString())
            case UInt8(ascii: "t"):
                try scanLiteral("true"); return .boolean(true)
            case UInt8(ascii: "f"):
                try scanLiteral("false"); return .boolean(false)
            case UInt8(ascii: "n"):
                try scanLiteral("null"); return .null
            case UInt8(ascii: "-"), UInt8(ascii: "0")...UInt8(ascii: "9"):
                return try scanNumber()
            default:
                throw failure(ProblemType.invalidJSON)
            }
        }

        mutating func scanObject(depth: Int) throws -> SchemamiValue {
            guard depth < 256 else { throw failure(ProblemType.resourceLimit) }
            index += 1
            skipWhitespace()
            if consume(UInt8(ascii: "}")) { return .object([]) }
            var members: [SchemamiMember] = []
            var memberNames = Set<[UInt32]>()
            while true {
                skipWhitespace()
                guard peek == UInt8(ascii: "\"") else { throw failure(ProblemType.invalidJSON) }
                let name = try scanString()
                guard memberNames.insert(name.unicodeScalars.map(\.value)).inserted else {
                    throw failure(ProblemType.duplicateObjectMember)
                }
                skipWhitespace()
                guard consume(UInt8(ascii: ":")) else { throw failure(ProblemType.invalidJSON) }
                let value = try scanValue(depth: depth + 1)
                members.append(SchemamiMember(name: name, value: value))
                skipWhitespace()
                if consume(UInt8(ascii: "}")) { return .object(members) }
                guard consume(UInt8(ascii: ",")) else { throw failure(ProblemType.invalidJSON) }
            }
        }

        mutating func scanArray(depth: Int) throws -> SchemamiValue {
            guard depth < 256 else { throw failure(ProblemType.resourceLimit) }
            index += 1
            skipWhitespace()
            if consume(UInt8(ascii: "]")) { return .array([]) }
            var values: [SchemamiValue] = []
            while true {
                values.append(try scanValue(depth: depth + 1))
                skipWhitespace()
                if consume(UInt8(ascii: "]")) { return .array(values) }
                guard consume(UInt8(ascii: ",")) else { throw failure(ProblemType.invalidJSON) }
            }
        }

        mutating func scanString() throws -> String {
            let start = index
            guard consume(UInt8(ascii: "\"")) else { throw failure(ProblemType.invalidJSON) }
            var escaped = false
            while let byte = peek {
                index += 1
                if escaped {
                    escaped = false
                    if byte == UInt8(ascii: "u") {
                        for _ in 0..<4 {
                            guard let hex = peek, isHex(hex) else { throw failure(ProblemType.invalidJSON) }
                            index += 1
                        }
                    } else if ![UInt8(ascii: "\""), UInt8(ascii: "\\"), UInt8(ascii: "/"), UInt8(ascii: "b"), UInt8(ascii: "f"), UInt8(ascii: "n"), UInt8(ascii: "r"), UInt8(ascii: "t")].contains(byte) {
                        throw failure(ProblemType.invalidJSON)
                    }
                } else if byte == UInt8(ascii: "\\") {
                    escaped = true
                } else if byte == UInt8(ascii: "\"") {
                    let slice = Data(bytes[start..<index])
                    do {
                        return try JSONDecoder().decode(String.self, from: slice)
                    } catch {
                        throw failure(ProblemType.invalidJSON)
                    }
                } else if byte < 0x20 {
                    throw failure(ProblemType.invalidJSON)
                }
            }
            throw failure(ProblemType.invalidJSON)
        }

        mutating func scanNumber() throws -> SchemamiValue {
            let start = index
            if consume(UInt8(ascii: "-")), isAtEnd { throw failure(ProblemType.invalidJSON) }
            if consume(UInt8(ascii: "0")) {
                if let next = peek, isDigit(next) { throw failure(ProblemType.invalidJSON) }
            } else {
                guard let first = peek, first >= UInt8(ascii: "1"), first <= UInt8(ascii: "9") else {
                    throw failure(ProblemType.invalidJSON)
                }
                index += 1
                while let next = peek, isDigit(next) { index += 1 }
            }
            if consume(UInt8(ascii: ".")) {
                guard let next = peek, isDigit(next) else { throw failure(ProblemType.invalidJSON) }
                while let next = peek, isDigit(next) { index += 1 }
            }
            if consume(UInt8(ascii: "e")) || consume(UInt8(ascii: "E")) {
                _ = consume(UInt8(ascii: "+")) || consume(UInt8(ascii: "-"))
                guard let next = peek, isDigit(next) else { throw failure(ProblemType.invalidJSON) }
                while let next = peek, isDigit(next) { index += 1 }
            }
            let raw = String(decoding: bytes[start..<index], as: UTF8.self)
            guard let value = Double(raw), value.isFinite else { throw failure(ProblemType.invalidJSON) }
            let mantissa = raw.split(whereSeparator: { $0 == "e" || $0 == "E" }).first ?? ""
            if value == 0, mantissa.contains(where: { $0 >= "1" && $0 <= "9" }) {
                throw failure(ProblemType.invalidJSON)
            }
            if let exactInteger = exactIntegerLexeme(raw),
               BigInt(String(format: "%.0f", locale: Locale(identifier: "en_US_POSIX"), value)) != exactInteger {
                throw failure(ProblemType.invalidJSON)
            }
            if !raw.contains(".") && !raw.lowercased().contains("e"), let integer = Int(raw) { return .integer(integer) }
            return .number(value)
        }

        private func exactIntegerLexeme(_ raw: String) -> BigInt? {
            let pieces = raw.lowercased().split(separator: "e", omittingEmptySubsequences: false)
            guard pieces.count <= 2, let exponent = Int(pieces.count == 2 ? pieces[1] : "0") else { return nil }
            let mantissa = String(pieces[0]); let negative = mantissa.hasPrefix("-")
            let unsigned = negative ? String(mantissa.dropFirst()) : mantissa
            let decimals = unsigned.split(separator: ".", omittingEmptySubsequences: false)
            let fractionCount = decimals.count == 2 ? decimals[1].count : 0
            guard let magnitude = BigInt(decimals.joined()) else { return nil }
            if magnitude == 0 { return 0 }
            let scale = exponent - fractionCount
            if scale >= 0 { return (negative ? -magnitude : magnitude) * BigInt(10).power(scale) }
            let divisor = BigInt(10).power(-scale)
            guard magnitude % divisor == 0 else { return nil }
            let integral = magnitude / divisor
            return negative ? -integral : integral
        }

        mutating func scanLiteral(_ literal: StaticString) throws {
            for byte in String(describing: literal).utf8 {
                guard consume(byte) else { throw failure(ProblemType.invalidJSON) }
            }
        }

        mutating func skipWhitespace() {
            while let byte = peek, [0x20, 0x09, 0x0a, 0x0d].contains(byte) { index += 1 }
        }

        var peek: UInt8? { index < bytes.count ? bytes[index] : nil }

        mutating func consume(_ byte: UInt8) -> Bool {
            guard peek == byte else { return false }
            index += 1
            return true
        }

        func isDigit(_ byte: UInt8) -> Bool {
            byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9")
        }

        func isHex(_ byte: UInt8) -> Bool {
            isDigit(byte)
                || (byte >= UInt8(ascii: "a") && byte <= UInt8(ascii: "f"))
                || (byte >= UInt8(ascii: "A") && byte <= UInt8(ascii: "F"))
        }

        func failure(_ type: String) -> ParseFailure {
            ParseFailure(problem: Problem(type: type))
        }
    }
}
