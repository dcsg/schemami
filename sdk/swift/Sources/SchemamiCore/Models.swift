import Foundation

public struct SchemamiObject: Sendable, Equatable, Hashable {
    public let value: SchemamiValue

    public init?(_ value: SchemamiValue) {
        guard value.objectMembers != nil else { return nil }
        self.value = value
    }

    public subscript(_ member: String) -> SchemamiValue? { value[member: member] }
    public var id: String? { self["id"]?.stringValue }
    public var name: String? { self["name"]?.stringValue }
    public var kind: String? { self["kind"]?.stringValue }
    public var extensions: [SchemamiMember] {
        value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

public struct RecipeReference: Sendable, Equatable, Hashable {
    public let collection: String
    public let id: String
    public let revision: Int
    public let sha256: String

    init?(_ value: SchemamiValue) {
        guard let collection = value[member: "collection"]?.stringValue,
              let id = value[member: "id"]?.stringValue,
              let revision = value[member: "revision"]?.integerValue,
              let sha256 = value[member: "sha256"]?.stringValue
        else { return nil }
        self.collection = collection
        self.id = id
        self.revision = revision
        self.sha256 = sha256
    }
}

public struct Recipe: Sendable, Equatable {
    public let value: SchemamiValue
    public let collection: String
    public let id: String
    public let revision: Int
    public let contentLanguage: String
    public let title: String
    public let notes: [String]?
    public let origin: SchemamiObject?
    public let parameters: [Parameter]
    public let ingredients: [Ingredient]
    public let components: [SchemamiObject]
    public let preparations: [SchemamiObject]
    public let outputs: [SchemamiObject]
    public let techniques: [SchemamiObject]
    public let equipment: [SchemamiObject]
    public let formulas: [Formula]
    public let method: RecipeMethod
    public let lineage: SchemamiObject?
    public let sources: [SchemamiObject]
    public let evidence: [SchemamiObject]
    public let externalReferences: [String]
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard value[member: "schemami"]?.stringValue == "1",
              let collection = value[member: "collection"]?.stringValue,
              let id = value[member: "id"]?.stringValue,
              let revision = value[member: "revision"]?.integerValue,
              let contentLanguage = value[member: "content_language"]?.stringValue,
              let title = value[member: "title"]?.stringValue,
              let methodValue = value[member: "method"],
              let method = RecipeMethod(methodValue)
        else { return nil }

        self.value = value
        self.collection = collection
        self.id = id
        self.revision = revision
        self.contentLanguage = contentLanguage
        self.title = title
        self.notes = Self.strings(value[member: "notes"])
        self.origin = value[member: "origin"].flatMap(SchemamiObject.init)
        self.parameters = value[member: "parameters"]?.arrayValue?.compactMap(Parameter.init) ?? []
        self.ingredients = value[member: "ingredients"]?.arrayValue?.compactMap(Ingredient.init) ?? []
        self.components = Self.objects(value[member: "components"])
        self.preparations = Self.objects(value[member: "preparations"])
        self.outputs = Self.objects(value[member: "outputs"])
        self.techniques = Self.objects(value[member: "techniques"])
        self.equipment = Self.objects(value[member: "equipment"])
        self.formulas = value[member: "formulas"]?.arrayValue?.compactMap(Formula.init) ?? []
        self.method = method
        self.lineage = value[member: "lineage"].flatMap(SchemamiObject.init)
        self.sources = Self.objects(value[member: "sources"])
        self.evidence = Self.objects(value[member: "evidence"])
        self.externalReferences = Self.strings(value[member: "external_references"]) ?? []
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }

    private static func objects(_ value: SchemamiValue?) -> [SchemamiObject] {
        value?.arrayValue?.compactMap(SchemamiObject.init) ?? []
    }

    private static func strings(_ value: SchemamiValue?) -> [String]? {
        guard let values = value?.arrayValue else { return nil }
        let strings = values.compactMap(\.stringValue)
        return strings.count == values.count ? strings : nil
    }
}

public struct BundledRecipe: Sendable, Equatable {
    public let sha256: String
    public let recipe: Recipe
    public let extensions: [SchemamiMember]
}

public struct RecipeBundle: Sendable, Equatable {
    public let value: SchemamiValue
    public let root: RecipeReference
    public let documents: [BundledRecipe]
    public let extensions: [SchemamiMember]

    init?(_ value: SchemamiValue) {
        guard value[member: "schemami"]?.stringValue == "1",
              let rootValue = value[member: "root"],
              let root = RecipeReference(rootValue),
              let documentValues = value[member: "documents"]?.arrayValue
        else { return nil }
        var documents: [BundledRecipe] = []
        for documentValue in documentValues {
            guard let sha256 = documentValue[member: "sha256"]?.stringValue,
                  let recipeValue = documentValue[member: "document"],
                  let recipe = Recipe(recipeValue)
            else { return nil }
            documents.append(BundledRecipe(
                sha256: sha256,
                recipe: recipe,
                extensions: documentValue.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
            ))
        }
        self.value = value
        self.root = root
        self.documents = documents
        self.extensions = value.objectMembers?.filter { $0.name.hasPrefix("x-") } ?? []
    }
}

enum ProjectedDocument: Sendable, Equatable {
    case recipe(Recipe)
    case bundle(RecipeBundle)
}
