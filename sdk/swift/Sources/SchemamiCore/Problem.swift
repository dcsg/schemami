import Foundation

public struct Problem: Sendable, Equatable, Hashable, Codable {
    public let type: String
    public let pointer: JSONPointer
    public let details: String?

    public init(type: String, pointer: JSONPointer = .root, details: String? = nil) {
        self.type = type
        self.pointer = pointer
        self.details = details
    }
}

public struct ResourceBudgets: Sendable, Equatable {
    public let recursiveLevels: Int
    public let semanticOccurrences: Int
    public let analysisStates: Int
    public let bundleDocuments: Int
    public let selectedComponentInstances: Int

    public init(
        recursiveLevels: Int,
        semanticOccurrences: Int,
        bundleDocuments: Int,
        selectedComponentInstances: Int,
        analysisStates: Int = 10_000
    ) {
        self.recursiveLevels = recursiveLevels
        self.semanticOccurrences = semanticOccurrences
        self.analysisStates = analysisStates
        self.bundleDocuments = bundleDocuments
        self.selectedComponentInstances = selectedComponentInstances
    }

    public static let protocolFloor = ResourceBudgets(
        recursiveLevels: 64,
        semanticOccurrences: 10_000,
        bundleDocuments: 1_024,
        selectedComponentInstances: 1_024,
        analysisStates: 10_000
    )
}

enum ProblemType {
    static let base = "https://schemami.dev/problems/"
    static let invalidJSON = base + "invalid-json"
    static let duplicateObjectMember = base + "duplicate-object-member"
    static let invalidPointer = base + "invalid-pointer"
    static let resourceLimit = base + "resource-limit"
    static let invalidDocument = base + "invalid-document"
    static let schemaInvalid = invalidDocument
    static let unsupportedDocument = invalidDocument
    static let inactiveReference = base + "inactive-reference"
    static let dependencyCycle = base + "dependency-cycle"
    static let relativeTimingConflict = base + "relative-timing-conflict"
    static let multipleProducers = base + "multiple-producers"
    static let missingProducer = base + "missing-producer"
    static let missingFact = base + "missing-fact"
    static let componentCycle = base + "component-cycle"
    static let unresolvedReference = base + "unresolved-reference"
}
