import Foundation
import SchemamiCore

public enum ChangeKind: String, Sendable, Equatable, Hashable, Codable {
    case added
    case removed
    case renamed
    case modified
    case reordered
}

public struct DocumentIdentity: Sendable, Equatable, Hashable {
    public let collection: String
    public let id: String
    public let revision: Int
    public let sha256: String
}

/// One exact protocol-structure change. Pointers always address the admitted
/// source/candidate values; `pointer` is the candidate pointer when present and
/// otherwise the source pointer.
public struct ProtocolChange: Sendable, Equatable, Hashable {
    public let kind: ChangeKind
    public let pointer: JSONPointer
    public let sourcePointer: JSONPointer?
    public let candidatePointer: JSONPointer?
    public let sourceValue: SchemamiValue?
    public let candidateValue: SchemamiValue?
}

public struct ComparisonResult: Sendable, Equatable {
    public let source: DocumentIdentity
    public let candidate: DocumentIdentity
    public let changes: [ProtocolChange]

    public var hasChanges: Bool { !changes.isEmpty }
}

public enum SchemamiDiff {
    public static func compare(source: AdmittedRecipe, candidate: AdmittedRecipe) -> ComparisonResult {
        var changes: [ProtocolChange] = []
        compareValues(
            source.value,
            candidate.value,
            sourcePointer: .root,
            candidatePointer: .root,
            changes: &changes
        )
        changes.sort {
            if $0.pointer.rawValue != $1.pointer.rawValue { return $0.pointer.rawValue < $1.pointer.rawValue }
            if $0.kind.order != $1.kind.order { return $0.kind.order < $1.kind.order }
            return ($0.sourcePointer?.rawValue ?? "") < ($1.sourcePointer?.rawValue ?? "")
        }
        return ComparisonResult(
            source: identity(source.value, digest: (try? source.sha256()) ?? ""),
            candidate: identity(candidate.value, digest: (try? candidate.sha256()) ?? ""),
            changes: changes
        )
    }

    private static func compareValues(
        _ source: SchemamiValue,
        _ candidate: SchemamiValue,
        sourcePointer: JSONPointer,
        candidatePointer: JSONPointer,
        changes: inout [ProtocolChange]
    ) {
        guard !jsonEqual(source, candidate) else { return }
        switch (source, candidate) {
        case (.object(let sourceMembers), .object(let candidateMembers)):
            let sourceMap = Dictionary(uniqueKeysWithValues: sourceMembers.map { (ExactScalarKey($0.name), $0) })
            let candidateMap = Dictionary(uniqueKeysWithValues: candidateMembers.map { (ExactScalarKey($0.name), $0) })
            for key in Set(sourceMap.keys).union(candidateMap.keys).sorted() {
                let name = sourceMap[key]?.name ?? candidateMap[key]!.name
                let sourceChild = sourcePointer.appending(name)
                let candidateChild = candidatePointer.appending(name)
                let sourceValue = sourceMap[key]?.value
                let candidateValue = candidateMap[key]?.value
                switch (sourceValue, candidateValue) {
                case (.none, .some(let value)):
                    changes.append(change(.added, source: nil, candidate: candidateChild, sourceValue: nil, candidateValue: value))
                case (.some(let value), .none):
                    changes.append(change(.removed, source: sourceChild, candidate: nil, sourceValue: value, candidateValue: nil))
                case (.some(let left), .some(let right)):
                    compareValues(left, right, sourcePointer: sourceChild, candidatePointer: candidateChild, changes: &changes)
                default:
                    break
                }
            }
        case (.array(let sourceValues), .array(let candidateValues)):
            if let sourceIDs = identified(sourceValues), let candidateIDs = identified(candidateValues) {
                compareIdentifiedArrays(
                    sourceValues, candidateValues,
                    sourceIDs: sourceIDs, candidateIDs: candidateIDs,
                    sourcePointer: sourcePointer, candidatePointer: candidatePointer,
                    changes: &changes
                )
            } else if sameMultiset(sourceValues, candidateValues) {
                changes.append(change(
                    .reordered, source: sourcePointer, candidate: candidatePointer,
                    sourceValue: .array(sourceValues), candidateValue: .array(candidateValues)
                ))
            } else {
                let common = min(sourceValues.count, candidateValues.count)
                for index in 0..<common {
                    compareValues(
                        sourceValues[index], candidateValues[index],
                        sourcePointer: sourcePointer.appending(String(index)),
                        candidatePointer: candidatePointer.appending(String(index)),
                        changes: &changes
                    )
                }
                if sourceValues.count > common {
                    for index in common..<sourceValues.count {
                        let pointer = sourcePointer.appending(String(index))
                        changes.append(change(.removed, source: pointer, candidate: nil, sourceValue: sourceValues[index], candidateValue: nil))
                    }
                }
                if candidateValues.count > common {
                    for index in common..<candidateValues.count {
                        let pointer = candidatePointer.appending(String(index))
                        changes.append(change(.added, source: nil, candidate: pointer, sourceValue: nil, candidateValue: candidateValues[index]))
                    }
                }
            }
        default:
            changes.append(change(
                candidatePointer.tokens.last == "name" ? .renamed : .modified,
                source: sourcePointer, candidate: candidatePointer,
                sourceValue: source, candidateValue: candidate
            ))
        }
    }

    private static func compareIdentifiedArrays(
        _ sourceValues: [SchemamiValue],
        _ candidateValues: [SchemamiValue],
        sourceIDs: [String],
        candidateIDs: [String],
        sourcePointer: JSONPointer,
        candidatePointer: JSONPointer,
        changes: inout [ProtocolChange]
    ) {
        let sourceIndex = Dictionary(uniqueKeysWithValues: sourceIDs.enumerated().map { ($0.element, $0.offset) })
        let candidateIndex = Dictionary(uniqueKeysWithValues: candidateIDs.enumerated().map { ($0.element, $0.offset) })
        for id in Set(sourceIDs).union(candidateIDs).sorted() {
            switch (sourceIndex[id], candidateIndex[id]) {
            case (.none, .some(let index)):
                let pointer = candidatePointer.appending(String(index))
                changes.append(change(.added, source: nil, candidate: pointer, sourceValue: nil, candidateValue: candidateValues[index]))
            case (.some(let index), .none):
                let pointer = sourcePointer.appending(String(index))
                changes.append(change(.removed, source: pointer, candidate: nil, sourceValue: sourceValues[index], candidateValue: nil))
            case (.some(let left), .some(let right)):
                compareValues(
                    sourceValues[left], candidateValues[right],
                    sourcePointer: sourcePointer.appending(String(left)),
                    candidatePointer: candidatePointer.appending(String(right)),
                    changes: &changes
                )
            default:
                break
            }
        }
        let common = Set(sourceIDs).intersection(candidateIDs)
        let sourceOrder = sourceIDs.filter(common.contains)
        let candidateOrder = candidateIDs.filter(common.contains)
        if sourceOrder != candidateOrder {
            changes.append(change(
                .reordered, source: sourcePointer, candidate: candidatePointer,
                sourceValue: .array(sourceOrder.map(SchemamiValue.string)),
                candidateValue: .array(candidateOrder.map(SchemamiValue.string))
            ))
        }
    }

    private static func identified(_ values: [SchemamiValue]) -> [String]? {
        let ids = values.compactMap { $0[member: "id"]?.stringValue }
        guard ids.count == values.count, Set(ids).count == ids.count else { return nil }
        return ids
    }

    private static func sameMultiset(_ source: [SchemamiValue], _ candidate: [SchemamiValue]) -> Bool {
        guard source.count == candidate.count,
              let sourceKeys = try? source.map({ try $0.canonicalJSON() }),
              let candidateKeys = try? candidate.map({ try $0.canonicalJSON() }),
              sourceKeys != candidateKeys else { return false }
        var counts: [Data: Int] = [:]
        for key in sourceKeys { counts[key, default: 0] += 1 }
        for key in candidateKeys {
            guard let count = counts[key], count > 0 else { return false }
            if count == 1 { counts.removeValue(forKey: key) } else { counts[key] = count - 1 }
        }
        return counts.isEmpty
    }

    private static func jsonEqual(_ left: SchemamiValue, _ right: SchemamiValue) -> Bool {
        switch (left, right) {
        case (.object(let lhs), .object(let rhs)):
            guard lhs.count == rhs.count else { return false }
            let rightByName = Dictionary(uniqueKeysWithValues: rhs.map { (ExactScalarKey($0.name), $0.value) })
            return lhs.allSatisfy { member in
                rightByName[ExactScalarKey(member.name)].map { jsonEqual(member.value, $0) } ?? false
            }
        case (.array(let lhs), .array(let rhs)):
            return lhs.count == rhs.count && zip(lhs, rhs).allSatisfy(jsonEqual)
        default:
            return left == right
        }
    }

    private static func exactStringEqual(_ left: String, _ right: String) -> Bool {
        left.unicodeScalars.elementsEqual(right.unicodeScalars)
    }

    private static func change(
        _ kind: ChangeKind,
        source: JSONPointer?,
        candidate: JSONPointer?,
        sourceValue: SchemamiValue?,
        candidateValue: SchemamiValue?
    ) -> ProtocolChange {
        ProtocolChange(
            kind: kind,
            pointer: candidate ?? source ?? .root,
            sourcePointer: source,
            candidatePointer: candidate,
            sourceValue: sourceValue,
            candidateValue: candidateValue
        )
    }

    private static func identity(_ value: SchemamiValue, digest: String) -> DocumentIdentity {
        DocumentIdentity(
            collection: value[member: "collection"]?.stringValue ?? "",
            id: value[member: "id"]?.stringValue ?? "",
            revision: value[member: "revision"]?.integerValue ?? 0,
            sha256: digest
        )
    }
}

private struct ExactScalarKey: Hashable, Comparable {
    let scalars: [UInt32]

    init(_ value: String) { scalars = value.unicodeScalars.map(\.value) }

    static func < (left: ExactScalarKey, right: ExactScalarKey) -> Bool {
        for (a, b) in zip(left.scalars, right.scalars) where a != b { return a < b }
        return left.scalars.count < right.scalars.count
    }
}

private extension ChangeKind {
    var order: Int {
        switch self {
        case .removed: return 0
        case .added: return 1
        case .renamed: return 2
        case .modified: return 3
        case .reordered: return 4
        }
    }
}
