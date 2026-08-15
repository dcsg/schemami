import Foundation

public struct AdmittedRecipe: Sendable, Equatable {
    public let submittedJSON: Data
    public let value: SchemamiValue
    public let recipe: Recipe

    public func canonicalJSON() throws -> Data {
        try CanonicalJSON.encode(value)
    }

    public func sha256() throws -> String {
        try CanonicalJSON.sha256(value)
    }
}

public struct AdmittedBundle: Sendable, Equatable {
    public let submittedJSON: Data
    public let value: SchemamiValue
    public let bundle: RecipeBundle

    public func canonicalJSON() throws -> Data {
        try CanonicalJSON.encode(value)
    }

    public func sha256() throws -> String {
        try CanonicalJSON.sha256(value)
    }
}

public enum AdmissionResult: Sendable, Equatable {
    case recipe(AdmittedRecipe)
    case bundle(AdmittedBundle)
    case refused([Problem])
}

public extension SchemamiCore {
    static func admit(
        _ parsed: ParsedDocument,
        budgets: ResourceBudgets = .protocolFloor
    ) -> AdmissionResult {
        switch StructuralAdmission.validate(parsed) {
        case .refused(let problems):
            return .refused(ProblemNormalizer.normalize(problems))
        case .admitted(.recipe(let recipe)):
            let problems = SemanticAdmission.validate(recipe.value, budgets: budgets)
            guard problems.isEmpty else { return .refused(problems) }
            return .recipe(AdmittedRecipe(
                submittedJSON: parsed.submittedJSON,
                value: parsed.value,
                recipe: recipe
            ))
        case .admitted(.bundle(let bundle)):
            let problems = SemanticAdmission.validateBundle(bundle, budgets: budgets)
            guard problems.isEmpty else { return .refused(problems) }
            return .bundle(AdmittedBundle(
                submittedJSON: parsed.submittedJSON,
                value: parsed.value,
                bundle: bundle
            ))
        }
    }
}

enum ProblemNormalizer {
    static func normalize(_ problems: [Problem]) -> [Problem] {
        Array(Set(problems)).sorted {
            if $0.pointer.rawValue == $1.pointer.rawValue { return $0.type < $1.type }
            return $0.pointer.rawValue < $1.pointer.rawValue
        }
    }
}
