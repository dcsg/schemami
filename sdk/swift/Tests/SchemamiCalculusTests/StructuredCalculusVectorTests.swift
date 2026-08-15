import XCTest
@testable import SchemamiCalculus
@testable import SchemamiCore

final class StructuredCalculusVectorTests: XCTestCase {
    func testEveryStructuredCalculusEnvelopeMatchesCanonicalDigest() throws {
        let data = try SchemaResources.conformanceData("structured-calculus.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data), let vectors = parsed.value[member: "vectors"]?.arrayValue else { return XCTFail("structured corpus did not parse") }
        for vector in vectors {
            let id = vector[member: "id"]?.stringValue ?? "unnamed"
            let operation = try XCTUnwrap(vector[member: "operation"]?.stringValue, id)
            let arguments = vector[member: "arguments"] ?? .object([])
            var recipe = vector[member: "recipe"]
            var bundle: SchemamiValue?
            if let fixture = vector[member: "fixture"]?.stringValue {
                let fixtureData = try SchemaResources.fixtureData(fixture)
                guard case .parsed(let fixtureParsed) = SchemamiCore.parse(fixtureData) else { return XCTFail("\(id): fixture parse refused") }
                bundle = fixtureParsed.value; recipe = nil
            } else if let fixture = vector[member: "recipe_fixture"]?.stringValue {
                let fixtureData = try SchemaResources.fixtureData(fixture)
                guard case .parsed(let fixtureParsed) = SchemamiCore.parse(fixtureData) else { return XCTFail("\(id): recipe fixture parse refused") }
                recipe = fixtureParsed.value; bundle = nil
            }
            let result = SchemamiCalculus.evaluateStructured(operation: operation, recipe: recipe, bundle: bundle, arguments: arguments)
            XCTAssertEqual(try result.canonicalSHA256(), vector[member: "expected_jcs_sha256"]?.stringValue, id)
        }
    }
}
