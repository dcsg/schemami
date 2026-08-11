import XCTest
@testable import SchemamiCalculus
@testable import SchemamiCore

final class LegacyCalculusVectorTests: XCTestCase {
    func testEveryOriginalSharedCalculusVectorMatchesExactly() throws {
        let data = try SchemaResources.conformanceData("calculus.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              let vectors = parsed.value.arrayValue else { return XCTFail("calculus corpus did not parse") }
        for vector in vectors {
            let name = vector[member: "name"]?.stringValue ?? "unnamed"
            let operation = try XCTUnwrap(vector[member: "operation"]?.stringValue, name)
            let input = try XCTUnwrap(vector[member: "input"], name)
            let expected = try XCTUnwrap(vector[member: "expected"], name)
            XCTAssertEqual(SchemamiCalculus.evaluateLegacy(operation: operation, input: input), expected, name)
        }
    }
}
