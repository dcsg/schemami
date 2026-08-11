import Foundation
import OrderedJSON

public struct SchemamiMember: Sendable, Equatable, Hashable {
    public let name: String
    public let value: SchemamiValue

    public init(name: String, value: SchemamiValue) {
        self.name = name
        self.value = value
    }
}

public indirect enum SchemamiValue: Sendable, Equatable, Hashable {
    case string(String)
    case number(Double)
    case integer(Int)
    case object([SchemamiMember])
    case array([SchemamiValue])
    case boolean(Bool)
    case null

    init(_ value: JSONValue) {
        switch value {
        case .string(let string): self = .string(string)
        case .number(let number): self = .number(number)
        case .integer(let integer): self = .integer(integer)
        case .object(let object):
            self = .object(object.map { SchemamiMember(name: $0.key, value: SchemamiValue($0.value)) })
        case .array(let array): self = .array(array.map(SchemamiValue.init))
        case .boolean(let boolean): self = .boolean(boolean)
        case .null: self = .null
        }
    }

    public var stringValue: String? {
        guard case .string(let value) = self else { return nil }
        return value
    }

    public var integerValue: Int? {
        guard case .integer(let value) = self else { return nil }
        return value
    }

    public var arrayValue: [SchemamiValue]? {
        guard case .array(let value) = self else { return nil }
        return value
    }

    public var objectMembers: [SchemamiMember]? {
        guard case .object(let value) = self else { return nil }
        return value
    }

    public subscript(member name: String) -> SchemamiValue? {
        objectMembers?.first(where: { $0.name == name })?.value
    }

    public func encodedJSON() throws -> Data {
        var output = Data()
        try encode(into: &output)
        return output
    }

    public func canonicalJSON() throws -> Data {
        try CanonicalJSON.encode(self)
    }

    public func canonicalSHA256() throws -> String {
        try CanonicalJSON.sha256(self)
    }

    private func encode(into output: inout Data) throws {
        switch self {
        case .string(let value):
            output.append(try JSONEncoder().encode(value))
        case .number(let value):
            guard value.isFinite else { throw ValueEncodingError.nonFiniteNumber }
            output.append(Data(String(value).utf8))
        case .integer(let value):
            output.append(Data(String(value).utf8))
        case .object(let members):
            output.append(UInt8(ascii: "{"))
            for (index, member) in members.enumerated() {
                if index > 0 { output.append(UInt8(ascii: ",")) }
                output.append(try JSONEncoder().encode(member.name))
                output.append(UInt8(ascii: ":"))
                try member.value.encode(into: &output)
            }
            output.append(UInt8(ascii: "}"))
        case .array(let values):
            output.append(UInt8(ascii: "["))
            for (index, value) in values.enumerated() {
                if index > 0 { output.append(UInt8(ascii: ",")) }
                try value.encode(into: &output)
            }
            output.append(UInt8(ascii: "]"))
        case .boolean(let value):
            output.append(Data((value ? "true" : "false").utf8))
        case .null:
            output.append(Data("null".utf8))
        }
    }
}

private enum ValueEncodingError: Error {
    case nonFiniteNumber
}
