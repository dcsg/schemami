import XCTest
import SchemamiCalculus
@testable import SchemamiCore

final class PublicCalculusAPITests: XCTestCase {
    func testAdmittedBundleUsesClosedPublicOperationAPI() throws {
        let data = try SchemaResources.fixtureData("phase9.schemami-bundle.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .bundle(let bundle) = SchemamiCore.admit(parsed)
        else { return XCTFail("bundle did not admit") }

        let result = SchemamiCalculus.evaluate(
            .resolveSelection(arguments: .object([])),
            input: .bundle(bundle)
        )
        XCTAssertEqual(result.status, .ok)
        XCTAssertEqual(result.operation, "resolve_selection")
        XCTAssertNotNil(result.result)
        XCTAssertTrue(result.problems.isEmpty)
    }

    func testStandaloneConversionHasNoRecipeMetadata() {
        let quantity = SchemamiValue.object([
            SchemamiMember(name: "kind", value: .string("measured")),
            SchemamiMember(name: "value", value: .string("1")),
            SchemamiMember(name: "unit", value: .string("kg")),
        ])
        let result = SchemamiCalculus.evaluate(
            .convertQuantity(quantity: quantity, targetUnit: "g", pointer: .root),
            input: .standalone
        )
        XCTAssertEqual(result.status, .ok)
        XCTAssertNil(result.evaluation)
        XCTAssertEqual(result.result?[member: "quantity"]?[member: "value"]?.stringValue, "1000")
    }

    func testInvalidInputKindReturnsStableProblem() {
        let result = SchemamiCalculus.evaluate(
            .schedule(arguments: .object([])),
            input: .standalone
        )
        XCTAssertEqual(result.status, .refused)
        XCTAssertEqual(result.problems.first?.pointer.rawValue, "/input")
        XCTAssertEqual(result.problems.first?.type, "https://schemami.dev/problems/invalid-operation-arguments")
    }

    func testSelectionResourceLimitRefusesWithoutTrapping() throws {
        let data = try SchemaResources.fixtureData("phase9.schemami-bundle.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .bundle(let bundle) = SchemamiCore.admit(parsed)
        else { return XCTFail("bundle did not admit") }
        let budgets = ResourceBudgets(
            recursiveLevels: 64,
            semanticOccurrences: 10_000,
            bundleDocuments: 1_024,
            selectedComponentInstances: 1
        )
        let result = SchemamiCalculus.evaluate(
            .resolveSelection(arguments: .object([])),
            input: .bundle(bundle),
            budgets: budgets
        )
        XCTAssertEqual(result.status, .refused)
        XCTAssertEqual(result.problems.first?.type, "https://schemami.dev/problems/resource-limit")
    }
}
