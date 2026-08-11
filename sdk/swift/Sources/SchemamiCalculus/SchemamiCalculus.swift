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
            switch input {
            case .recipe(let admitted):
                envelope = StructuredCalculus.evaluate(
                    operation: operation,
                    recipe: admitted.value,
                    bundle: nil,
                    arguments: arguments,
                    selectedComponentLimit: budgets.selectedComponentInstances
                )
            case .bundle(let admitted):
                envelope = StructuredCalculus.evaluate(
                    operation: operation,
                    recipe: nil,
                    bundle: admitted.value,
                    arguments: arguments,
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
