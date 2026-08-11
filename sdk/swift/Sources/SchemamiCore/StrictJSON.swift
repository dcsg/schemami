import Foundation
import OrderedJSON

public struct ParsedDocument: Sendable, Equatable {
    public let submittedJSON: Data
    public let value: SchemamiValue
    let schemaValue: JSONValue

    init(submittedJSON: Data, schemaValue: JSONValue) {
        self.submittedJSON = submittedJSON
        self.schemaValue = schemaValue
        self.value = SchemamiValue(schemaValue)
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
            try StrictJSONScanner(data: data, budgets: budgets).scan()
            let value = try JSONValue.parse(data)
            return .parsed(ParsedDocument(submittedJSON: data, schemaValue: value))
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

    func scan() throws {
        var cursor = Cursor(bytes: Array(data), budgets: budgets)
        try cursor.scanValue(depth: 0)
        cursor.skipWhitespace()
        guard cursor.isAtEnd else { throw cursor.failure(ProblemType.invalidJSON) }
    }

    private struct Cursor {
        let bytes: [UInt8]
        let budgets: ResourceBudgets
        var index = 0
        var occurrences = 0

        var isAtEnd: Bool { index == bytes.count }

        mutating func scanValue(depth: Int) throws {
            skipWhitespace()
            occurrences += 1
            guard occurrences <= budgets.semanticOccurrences else {
                throw failure(ProblemType.resourceLimit)
            }
            guard let byte = peek else { throw failure(ProblemType.invalidJSON) }
            switch byte {
            case UInt8(ascii: "{"):
                try scanObject(depth: depth)
            case UInt8(ascii: "["):
                try scanArray(depth: depth)
            case UInt8(ascii: "\""):
                _ = try scanString()
            case UInt8(ascii: "t"):
                try scanLiteral("true")
            case UInt8(ascii: "f"):
                try scanLiteral("false")
            case UInt8(ascii: "n"):
                try scanLiteral("null")
            case UInt8(ascii: "-"), UInt8(ascii: "0")...UInt8(ascii: "9"):
                try scanNumber()
            default:
                throw failure(ProblemType.invalidJSON)
            }
        }

        mutating func scanObject(depth: Int) throws {
            guard depth < budgets.recursiveLevels else { throw failure(ProblemType.resourceLimit) }
            index += 1
            skipWhitespace()
            if consume(UInt8(ascii: "}")) { return }
            var names = Set<String>()
            while true {
                skipWhitespace()
                guard peek == UInt8(ascii: "\"") else { throw failure(ProblemType.invalidJSON) }
                let name = try scanString()
                guard names.insert(name).inserted else {
                    throw failure(ProblemType.duplicateObjectMember)
                }
                skipWhitespace()
                guard consume(UInt8(ascii: ":")) else { throw failure(ProblemType.invalidJSON) }
                try scanValue(depth: depth + 1)
                skipWhitespace()
                if consume(UInt8(ascii: "}")) { return }
                guard consume(UInt8(ascii: ",")) else { throw failure(ProblemType.invalidJSON) }
            }
        }

        mutating func scanArray(depth: Int) throws {
            guard depth < budgets.recursiveLevels else { throw failure(ProblemType.resourceLimit) }
            index += 1
            skipWhitespace()
            if consume(UInt8(ascii: "]")) { return }
            while true {
                try scanValue(depth: depth + 1)
                skipWhitespace()
                if consume(UInt8(ascii: "]")) { return }
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

        mutating func scanNumber() throws {
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
