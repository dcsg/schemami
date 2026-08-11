import Foundation
import XCTest
@testable import SchemamiCore

final class StructuralAdmissionTests: XCTestCase {
    func testEverySharedSchemaPositiveProjectsWithoutLoss() throws {
        let raw = try SchemaResources.conformanceData("validation.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["vectors"] as? [[String: Any]])
        for vector in vectors where vector["expected_valid"] as? Bool == true {
            let id = try XCTUnwrap(vector["id"] as? String)
            let document = try XCTUnwrap(vector["document"] as? [String: Any])
            let data = try JSONSerialization.data(withJSONObject: document, options: [.sortedKeys])
            guard case .parsed(let parsed) = SchemamiCore.parse(data) else {
                return XCTFail("\(id): strict parse refused")
            }
            guard case .admitted(let projected) = StructuralAdmission.validate(parsed) else {
                return XCTFail("\(id): structural admission refused")
            }
            guard case .recipe(let recipe) = projected else {
                return XCTFail("\(id): projected as bundle")
            }
            XCTAssertEqual(recipe.value, parsed.value, id)
            XCTAssertEqual(recipe.contentLanguage, document["content_language"] as? String, id)
        }
    }

    func testRepresentativeStructuralInvalidVectorsRefuse() throws {
        let expected: Set<String> = [
            "flattened-steps-refuse",
            "singular-formula-refuses",
            "locale-map-title-refuses",
            "uppercase-local-id-refuses",
            "recursive-open-guide-refuses",
            "empty-source-uri-refuses",
            "deferred-endpoint-refuses",
        ]
        let raw = try SchemaResources.conformanceData("validation.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["vectors"] as? [[String: Any]])
        for vector in vectors where expected.contains(vector["id"] as? String ?? "") {
            let id = try XCTUnwrap(vector["id"] as? String)
            let document = try XCTUnwrap(vector["document"] as? [String: Any])
            let data = try JSONSerialization.data(withJSONObject: document)
            guard case .parsed(let parsed) = SchemamiCore.parse(data) else {
                return XCTFail("\(id): strict parse refused before schema")
            }
            guard case .refused = StructuralAdmission.validate(parsed) else {
                return XCTFail("\(id): expected structural refusal")
            }
        }
    }

    func testBundleProjectsEveryEmbeddedRecipe() throws {
        let raw = try SchemaResources.fixtureData("phase9.schemami-bundle.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(raw) else {
            return XCTFail("bundle parse refused")
        }
        guard case .admitted(.bundle(let bundle)) = StructuralAdmission.validate(parsed) else {
            return XCTFail("bundle structural admission refused")
        }
        XCTAssertFalse(bundle.documents.isEmpty)
        XCTAssertEqual(bundle.value, parsed.value)
        XCTAssertTrue(bundle.documents.allSatisfy { !$0.recipe.id.isEmpty })
    }

    func testExtensionAndRecursiveMethodRemainInRetainedModel() throws {
        let data = Data(#"{"schemami":"1","collection":"tests","id":"extended","revision":1,"content_language":"pt-PT","title":"Teste","ingredients":[],"method":{"sequence":[{"kind":"section","id":"section-1","name":"Parte","sequence":[{"kind":"step","id":"step-1","instruction":"Fazer","x-example-note":{"nested":true}}]}]},"x-example-root":{"value":1}}"#.utf8)
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .admitted(.recipe(let recipe)) = StructuralAdmission.validate(parsed)
        else { return XCTFail("extended recipe refused") }
        XCTAssertEqual(recipe.extensions.map(\.name), ["x-example-root"])
        XCTAssertEqual(JSONPointer(rawValue: "/method/sequence/0/sequence/0/x-example-note/nested")?.resolve(in: recipe.value), .boolean(true))
    }

    func testTaggedUnionViewsCoverStructuredFixture() throws {
        let raw = try SchemaResources.fixtureData("phase9-structured.schemami.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(raw),
              case .admitted(.recipe(let recipe)) = StructuralAdmission.validate(parsed)
        else { return XCTFail("structured fixture refused") }

        XCTAssertEqual(recipe.parameters.count, 3)
        if case .choice = recipe.parameters[0] {} else { XCTFail("choice parameter not projected") }
        if case .toggle = recipe.parameters[1] {} else { XCTFail("toggle parameter not projected") }
        if case .measurement = recipe.parameters[2] {} else { XCTFail("measurement parameter not projected") }

        let seeds = try XCTUnwrap(recipe.ingredients.first(where: { $0.id == "seeds" }))
        if case .measured = seeds.quantity {} else { XCTFail("measured quantity not projected") }
        if case .toggleIs = seeds.activation {} else { XCTFail("toggle activation not projected") }

        XCTAssertEqual(recipe.formulas.count, 1)
        if case .percentage = recipe.formulas[0] {} else { XCTFail("percentage formula not projected") }
        XCTAssertEqual(recipe.method.sequence.count, 4)
        guard case .step(let bake) = recipe.method.sequence[3],
              case .all(_, let conditions)? = bake.completion
        else { return XCTFail("recursive completion union not projected") }
        XCTAssertEqual(conditions.count, 2)
    }
}
