import Foundation

public enum Measurement: Sendable, Equatable, Hashable {
    case measured(SchemamiObject)
    case range(SchemamiObject)

    public var value: SchemamiValue {
        switch self {
        case .measured(let object), .range(let object): object.value
        }
    }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "measured": self = .measured(object)
        case "range": self = .range(object)
        default: return nil
        }
    }
}

public enum QuantityGuide: Sendable, Equatable, Hashable {
    case measured(SchemamiObject)
    case range(SchemamiObject)

    public var value: SchemamiValue {
        switch self {
        case .measured(let object), .range(let object): object.value
        }
    }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "measured": self = .measured(object)
        case "range": self = .range(object)
        default: return nil
        }
    }
}

public enum Quantity: Sendable, Equatable, Hashable {
    case measured(SchemamiObject)
    case range(SchemamiObject)
    case open(SchemamiObject)

    public var value: SchemamiValue {
        switch self {
        case .measured(let object), .range(let object), .open(let object): object.value
        }
    }

    public var unit: String? { value[member: "unit"]?.stringValue }
    public var scaling: String? { value[member: "scaling"]?.stringValue }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "measured": self = .measured(object)
        case "range": self = .range(object)
        case "open": self = .open(object)
        default: return nil
        }
    }
}

public enum Parameter: Sendable, Equatable, Hashable {
    case choice(SchemamiObject)
    case toggle(SchemamiObject)
    case measurement(SchemamiObject)

    public var value: SchemamiValue {
        switch self {
        case .choice(let object), .toggle(let object), .measurement(let object): object.value
        }
    }

    public var id: String? { value[member: "id"]?.stringValue }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "choice": self = .choice(object)
        case "toggle": self = .toggle(object)
        case "measurement": self = .measurement(object)
        default: return nil
        }
    }
}

public indirect enum Activation: Sendable, Equatable, Hashable {
    case choiceIs(SchemamiObject)
    case toggleIs(SchemamiObject)
    case measurementCompare(SchemamiObject)
    case all(SchemamiObject, [Activation])
    case any(SchemamiObject, [Activation])
    case not(SchemamiObject, Activation)

    public var value: SchemamiValue {
        switch self {
        case .choiceIs(let object), .toggleIs(let object), .measurementCompare(let object),
             .all(let object, _), .any(let object, _), .not(let object, _):
            object.value
        }
    }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "choice_is": self = .choiceIs(object)
        case "toggle_is": self = .toggleIs(object)
        case "measurement_compare": self = .measurementCompare(object)
        case "all", "any":
            guard let rawConditions = value[member: "conditions"]?.arrayValue else { return nil }
            let conditions = rawConditions.compactMap(Activation.init)
            guard conditions.count == rawConditions.count else { return nil }
            self = kind == "all" ? .all(object, conditions) : .any(object, conditions)
        case "not":
            guard let rawCondition = value[member: "condition"], let condition = Activation(rawCondition) else { return nil }
            self = .not(object, condition)
        default: return nil
        }
    }
}

public indirect enum Completion: Sendable, Equatable, Hashable {
    case observation(SchemamiObject)
    case measurement(SchemamiObject)
    case all(SchemamiObject, [Completion])
    case any(SchemamiObject, [Completion])

    public var value: SchemamiValue {
        switch self {
        case .observation(let object), .measurement(let object),
             .all(let object, _), .any(let object, _):
            object.value
        }
    }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "observation": self = .observation(object)
        case "measurement": self = .measurement(object)
        case "all", "any":
            guard let rawConditions = value[member: "conditions"]?.arrayValue else { return nil }
            let conditions = rawConditions.compactMap(Completion.init)
            guard conditions.count == rawConditions.count else { return nil }
            self = kind == "all" ? .all(object, conditions) : .any(object, conditions)
        default: return nil
        }
    }
}

public struct Ingredient: Sendable, Equatable, Hashable {
    public enum Identity: Sendable, Equatable, Hashable {
        case named(String)
        case alternatives(SchemamiObject)
    }

    public let value: SchemamiValue
    public let id: String
    public let identity: Identity
    public let quantity: Quantity?
    public let activation: Activation?
    public let notes: [String]
    public let externalReferences: [String]
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard let id = value[member: "id"]?.stringValue else { return nil }
        let identity: Identity
        if let name = value[member: "name"]?.stringValue {
            identity = .named(name)
        } else if let alternativesValue = value[member: "alternatives"],
                  let alternatives = SchemamiObject(alternativesValue) {
            identity = .alternatives(alternatives)
        } else {
            return nil
        }
        self.value = value
        self.id = id
        self.identity = identity
        self.quantity = value[member: "quantity"].flatMap(Quantity.init)
        self.activation = value[member: "activation"].flatMap(Activation.init)
        self.notes = value[member: "notes"]?.arrayValue?.compactMap(\.stringValue) ?? []
        self.externalReferences = value[member: "external_references"]?.arrayValue?.compactMap(\.stringValue) ?? []
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

public struct Action: Sendable, Equatable, Hashable {
    public let value: SchemamiValue
    public let id: String
    public let name: String?
    public let instruction: String
    public let activation: Activation?
    public let completion: Completion?
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard let id = value[member: "id"]?.stringValue,
              let instruction = value[member: "instruction"]?.stringValue
        else { return nil }
        self.value = value
        self.id = id
        self.name = value[member: "name"]?.stringValue
        self.instruction = instruction
        self.activation = value[member: "activation"].flatMap(Activation.init)
        self.completion = value[member: "completion"].flatMap(Completion.init)
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

public struct MethodStep: Sendable, Equatable, Hashable {
    public enum Content: Sendable, Equatable, Hashable {
        case instruction(String)
        case actions([Action])
    }

    public let value: SchemamiValue
    public let id: String
    public let name: String?
    public let content: Content
    public let activation: Activation?
    public let completion: Completion?
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard value[member: "kind"]?.stringValue == "step",
              let id = value[member: "id"]?.stringValue
        else { return nil }
        let content: Content
        if let instruction = value[member: "instruction"]?.stringValue {
            content = .instruction(instruction)
        } else if let rawActions = value[member: "actions"]?.arrayValue {
            let actions = rawActions.compactMap(Action.init)
            guard actions.count == rawActions.count else { return nil }
            content = .actions(actions)
        } else {
            return nil
        }
        self.value = value
        self.id = id
        self.name = value[member: "name"]?.stringValue
        self.content = content
        self.activation = value[member: "activation"].flatMap(Activation.init)
        self.completion = value[member: "completion"].flatMap(Completion.init)
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

public struct MethodSection: Sendable, Equatable, Hashable {
    public let value: SchemamiValue
    public let id: String
    public let name: String
    public let sequence: [MethodNode]
    public let activation: Activation?
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard value[member: "kind"]?.stringValue == "section",
              let id = value[member: "id"]?.stringValue,
              let name = value[member: "name"]?.stringValue,
              let rawSequence = value[member: "sequence"]?.arrayValue
        else { return nil }
        let sequence = rawSequence.compactMap(MethodNode.init)
        guard sequence.count == rawSequence.count else { return nil }
        self.value = value
        self.id = id
        self.name = name
        self.sequence = sequence
        self.activation = value[member: "activation"].flatMap(Activation.init)
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

public indirect enum MethodNode: Sendable, Equatable, Hashable {
    case section(MethodSection)
    case step(MethodStep)

    public var value: SchemamiValue {
        switch self {
        case .section(let section): section.value
        case .step(let step): step.value
        }
    }

    init?(_ value: SchemamiValue) {
        switch value[member: "kind"]?.stringValue {
        case "section":
            guard let section = MethodSection(value) else { return nil }
            self = .section(section)
        case "step":
            guard let step = MethodStep(value) else { return nil }
            self = .step(step)
        default: return nil
        }
    }
}

public struct RecipeMethod: Sendable, Equatable, Hashable {
    public let value: SchemamiValue
    public let sequence: [MethodNode]
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard let rawSequence = value[member: "sequence"]?.arrayValue else { return nil }
        let sequence = rawSequence.compactMap(MethodNode.init)
        guard sequence.count == rawSequence.count else { return nil }
        self.value = value
        self.sequence = sequence
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

public enum Formula: Sendable, Equatable, Hashable {
    case ratio(SchemamiObject)
    case percentage(SchemamiObject)

    public var value: SchemamiValue {
        switch self {
        case .ratio(let object), .percentage(let object): object.value
        }
    }

    public var id: String? { value[member: "id"]?.stringValue }

    init?(_ value: SchemamiValue) {
        guard let object = SchemamiObject(value), let kind = object.kind else { return nil }
        switch kind {
        case "ratio": self = .ratio(object)
        case "percentage": self = .percentage(object)
        default: return nil
        }
    }
}
