import Foundation
import JSONSchema
import OrderedJSON

enum StructuralAdmissionResult {
    case admitted(ProjectedDocument)
    case refused([Problem])
}

enum StructuralAdmission {
    static func validate(_ parsed: ParsedDocument) -> StructuralAdmissionResult {
        do {
            let isBundle = parsed.value[member: "root"] != nil && parsed.value[member: "documents"] != nil
            let schemaData = try SchemaResources.data(isBundle ? "schemami-v1-bundle.schema.json" : "schemami-v1-core.schema.json")
            let remoteSchemas: [String: JSONValue]
            if isBundle {
                let core = try SchemaResources.data("schemami-v1-core.schema.json")
                remoteSchemas = [
                    "https://schemami.dev/schema/schemami/1/core.schema.json": try JSONValue.parse(core),
                ]
            } else {
                remoteSchemas = [:]
            }
            let schema = try Schema(
                instance: String(decoding: schemaData, as: UTF8.self),
                remoteSchemas: remoteSchemas
            )
            let result = schema.validate(parsed.schemaValue)
            guard result.isValid else {
                return .refused([Problem(type: ProblemType.schemaInvalid)])
            }
            if isBundle, let bundle = RecipeBundle(parsed.value) {
                return .admitted(.bundle(bundle))
            }
            if let recipe = Recipe(parsed.value) {
                return .admitted(.recipe(recipe))
            }
            return .refused([Problem(type: ProblemType.unsupportedDocument)])
        } catch {
            return .refused([Problem(type: ProblemType.schemaInvalid, details: String(describing: error))])
        }
    }
}

enum SchemaResources {
    static func data(_ name: String) throws -> Data {
        guard let url = Bundle.module.url(forResource: name, withExtension: nil) else {
            throw ResourceError.missing(name)
        }
        return try Data(contentsOf: url)
    }

    static func conformanceData(_ name: String) throws -> Data {
        guard let url = Bundle.module.url(forResource: name, withExtension: nil) else {
            throw ResourceError.missing(name)
        }
        return try Data(contentsOf: url)
    }

    static func fixtureData(_ name: String) throws -> Data {
        guard let url = Bundle.module.url(forResource: name, withExtension: nil) else {
            throw ResourceError.missing(name)
        }
        return try Data(contentsOf: url)
    }

    private enum ResourceError: Error {
        case missing(String)
    }
}
