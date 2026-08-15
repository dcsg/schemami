import Foundation
import SchemamiCore

/// The admitted document context for a Recipe Calculus operation.
///
/// `standalone` is valid only for `convertQuantity`; every other operation
/// requires an admitted recipe or bundle.
public enum OperationInput: Sendable, Equatable {
    case recipe(AdmittedRecipe)
    case bundle(AdmittedBundle)
    case standalone
}

/// The closed Schemami v1 operation set. Arguments remain retained protocol
/// values so an SDK update cannot silently normalize or discard request data.
public enum OperationRequest: Sendable, Equatable {
    case resolveSelection(arguments: SchemamiValue)
    case resolveFormula(arguments: SchemamiValue)
    case scale(arguments: SchemamiValue)
    case convertQuantity(quantity: SchemamiValue, targetUnit: String, pointer: JSONPointer)
    case readingOrder(arguments: SchemamiValue)
    case schedule(arguments: SchemamiValue)
}

public enum EvaluationStatus: String, Sendable, Equatable, Codable {
    case ok
    case refused
    case notApplicable = "not_applicable"
}

/// A complete, non-publishable Recipe Calculus result envelope.
public struct EvaluationResult: Sendable, Equatable {
    public let operation: String
    public let status: EvaluationStatus
    public let envelope: SchemamiValue
    public let problems: [Problem]

    public var result: SchemamiValue? { envelope[member: "result"] }
    public var evaluation: SchemamiValue? { envelope[member: "evaluation"] }

    init(envelope: SchemamiValue) {
        self.envelope = envelope
        self.operation = envelope[member: "operation"]?.stringValue ?? ""
        self.status = EvaluationStatus(rawValue: envelope[member: "status"]?.stringValue ?? "") ?? .refused
        self.problems = (envelope[member: "problems"]?.arrayValue ?? []).map { value in
            let pointer = JSONPointer(rawValue: value[member: "pointer"]?.stringValue ?? "") ?? .root
            return Problem(type: value[member: "type"]?.stringValue ?? "", pointer: pointer)
        }
    }
}

public enum SchemamiCalculus {
    public static func evaluate(
        _ request: OperationRequest,
        input: OperationInput,
        budgets: ResourceBudgets = .protocolFloor
    ) -> EvaluationResult {
        let envelope: SchemamiValue
        switch request {
        case .convertQuantity(let quantity, let targetUnit, let pointer):
            guard input == .standalone else {
                return EvaluationResult(envelope: invalidArguments(operation: "convert_quantity", pointer: "/input"))
            }
            envelope = LegacyCalculus.evaluate(operation: "convert_quantity", input: .object([
                SchemamiMember(name: "quantity", value: quantity),
                SchemamiMember(name: "target_unit", value: .string(targetUnit)),
                SchemamiMember(name: "pointer", value: .string(pointer.rawValue)),
            ]))
        default:
            let operation: String
            let arguments: SchemamiValue
            switch request {
            case .resolveSelection(let value): operation = "resolve_selection"; arguments = value
            case .resolveFormula(let value): operation = "resolve_formula"; arguments = value
            case .scale(let value): operation = "scale"; arguments = value
            case .readingOrder(let value): operation = "reading_order"; arguments = value
            case .schedule(let value): operation = "schedule"; arguments = value
            case .convertQuantity: preconditionFailure("handled above")
            }
            guard validArguments(operation: operation, arguments: arguments) else {
                return EvaluationResult(envelope: invalidArguments(operation: operation, pointer: "/arguments"))
            }
            switch input {
            case .recipe(let admitted):
                envelope = StructuredCalculus.evaluate(
                    operation: operation,
                    recipe: admitted.value,
                    bundle: nil,
                    arguments: arguments,
                    recursiveLimit: budgets.recursiveLevels,
                    semanticLimit: budgets.semanticOccurrences,
                    selectedComponentLimit: budgets.selectedComponentInstances
                )
            case .bundle(let admitted):
                envelope = StructuredCalculus.evaluate(
                    operation: operation,
                    recipe: nil,
                    bundle: admitted.value,
                    arguments: arguments,
                    recursiveLimit: budgets.recursiveLevels,
                    semanticLimit: budgets.semanticOccurrences,
                    selectedComponentLimit: budgets.selectedComponentInstances
                )
            case .standalone:
                envelope = invalidArguments(operation: operation, pointer: "/input")
            }
        }
        return EvaluationResult(envelope: envelope)
    }

    // Kept internal solely for direct replay of the pre-v1 standalone vectors.
    static func evaluateLegacy(operation: String, input: SchemamiValue) -> SchemamiValue {
        LegacyCalculus.evaluate(operation: operation, input: input)
    }

    // Kept internal so the shared corpus can verify engine output independently
    // from parsing and admission.
    static func evaluateStructured(
        operation: String,
        recipe: SchemamiValue?,
        bundle: SchemamiValue?,
        arguments: SchemamiValue
    ) -> SchemamiValue {
        StructuredCalculus.evaluate(operation: operation, recipe: recipe, bundle: bundle, arguments: arguments)
    }

    private static func validArguments(operation: String, arguments: SchemamiValue) -> Bool {
        guard let members = arguments.objectMembers else { return false }
        let allowed: Set<String>
        switch operation {
        case "resolve_selection", "reading_order", "schedule": allowed = ["selections"]
        case "resolve_formula": allowed = ["formula_id", "selections"]
        case "scale": allowed = ["factor", "formula_target", "selections"]
        default: return false
        }
        for index in members.indices {
            guard allowed.contains(members[index].name) else { return false }
            for previous in members[..<index] where exactStringEqual(previous.name, members[index].name) { return false }
        }
        if let selections = arguments[member: "selections"], selections.arrayValue == nil { return false }
        if operation == "resolve_formula", arguments[member: "formula_id"]?.stringValue == nil { return false }
        if operation == "scale" {
            if let factor = arguments[member: "factor"], factor.stringValue == nil { return false }
            if let target = arguments[member: "formula_target"],
               !closedObject(target, allowed: ["formula_id", "quantity"])
                || target[member: "formula_id"]?.stringValue == nil
                || !measuredQuantity(target[member: "quantity"]) { return false }
        }
        return validSelections(arguments[member: "selections"])
    }

    private static func validSelections(_ value: SchemamiValue?) -> Bool {
        guard let value else { return true }
        guard let selections = value.arrayValue else { return false }
        for selection in selections {
            guard closedObject(selection, allowed: ["component_path", "bindings", "alternatives"]),
                  let path = selection[member: "component_path"]?.arrayValue,
                  path.allSatisfy({ $0.stringValue.map(isLocalID) == true }) else { return false }
            if let bindings = selection[member: "bindings"] {
                guard let members = bindings.objectMembers else { return false }
                guard uniqueLocalNames(members) else { return false }
                for member in members where member.value.stringValue == nil && !isBoolean(member.value) && !measuredQuantity(member.value) { return false }
            }
            if let alternatives = selection[member: "alternatives"] {
                guard let members = alternatives.objectMembers,
                      uniqueLocalNames(members),
                      members.allSatisfy({ $0.value.stringValue.map(isLocalID) == true }) else { return false }
            }
        }
        return true
    }

    private static func measuredQuantity(_ value: SchemamiValue?) -> Bool {
        guard let value, closedObject(value, allowed: ["kind", "value", "unit"]) else { return false }
        return value[member: "kind"]?.stringValue == "measured" && value[member: "value"]?.stringValue != nil && value[member: "unit"]?.stringValue != nil
    }

    private static func isBoolean(_ value: SchemamiValue) -> Bool {
        if case .boolean = value { return true }
        return false
    }

    private static func closedObject(_ value: SchemamiValue, allowed: Set<String>) -> Bool {
        guard let members = value.objectMembers else { return false }
        for index in members.indices {
            guard allowed.contains(members[index].name) else { return false }
            for previous in members[..<index] where exactStringEqual(previous.name, members[index].name) { return false }
        }
        return true
    }

    private static func exactStringEqual(_ left: String, _ right: String) -> Bool {
        left.unicodeScalars.elementsEqual(right.unicodeScalars)
    }

    private static func uniqueLocalNames(_ members: [SchemamiMember]) -> Bool {
        for index in members.indices {
            guard isLocalID(members[index].name) else { return false }
            for previous in members[..<index] where exactStringEqual(previous.name, members[index].name) { return false }
        }
        return true
    }

    private static func isLocalID(_ value: String) -> Bool {
        let bytes = Array(value.utf8)
        guard let first = bytes.first, isLowerAlphaNumeric(first) else { return false }
        return bytes.dropFirst().allSatisfy { isLowerAlphaNumeric($0) || $0 == 0x2D || $0 == 0x5F }
    }

    private static func isLowerAlphaNumeric(_ byte: UInt8) -> Bool {
        (byte >= 0x61 && byte <= 0x7A) || (byte >= 0x30 && byte <= 0x39)
    }

    private static func invalidArguments(operation: String, pointer: String) -> SchemamiValue {
        .object([
            SchemamiMember(name: "operation", value: .string(operation)),
            SchemamiMember(name: "problems", value: .array([.object([
                SchemamiMember(name: "pointer", value: .string(pointer)),
                SchemamiMember(name: "type", value: .string("https://schemami.dev/problems/invalid-operation-arguments")),
            ])])),
            SchemamiMember(name: "status", value: .string("refused")),
        ])
    }
}
