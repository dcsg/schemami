import Foundation

public struct JSONPointer: RawRepresentable, Sendable, Equatable, Hashable, Codable, CustomStringConvertible {
    public let rawValue: String

    public static let root = JSONPointer(unchecked: "")

    public init?(rawValue: String) {
        guard Self.isValid(rawValue) else { return nil }
        self.rawValue = rawValue
    }

    init(unchecked rawValue: String) {
        self.rawValue = rawValue
    }

    public var description: String { rawValue }

    public var tokens: [String] {
        guard !rawValue.isEmpty else { return [] }
        return rawValue.dropFirst().split(separator: "/", omittingEmptySubsequences: false).map { token in
            token.replacingOccurrences(of: "~1", with: "/")
                .replacingOccurrences(of: "~0", with: "~")
        }
    }

    public func appending(_ token: String) -> JSONPointer {
        let escaped = token.replacingOccurrences(of: "~", with: "~0")
            .replacingOccurrences(of: "/", with: "~1")
        return JSONPointer(unchecked: rawValue + "/" + escaped)
    }

    public func resolve(in value: SchemamiValue) -> SchemamiValue? {
        tokens.reduce(Optional(value)) { current, token in
            guard let current else { return nil }
            switch current {
            case .object(let members):
                return members.first(where: { $0.name == token })?.value
            case .array(let values):
                guard token == "0" || (!token.hasPrefix("0") && !token.isEmpty),
                      let index = Int(token), values.indices.contains(index)
                else { return nil }
                return values[index]
            default:
                return nil
            }
        }
    }

    private static func isValid(_ value: String) -> Bool {
        if value.isEmpty { return true }
        guard value.first == "/" else { return false }
        var iterator = value.makeIterator()
        while let character = iterator.next() {
            guard character == "~" else { continue }
            guard let escaped = iterator.next(), escaped == "0" || escaped == "1" else {
                return false
            }
        }
        return true
    }
}
