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

    func testConstructedArgumentsRemainClosedAndDuplicateSafe() throws {
        let data = try SchemaResources.fixtureData("phase9.schemami-bundle.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .bundle(let bundle) = SchemamiCore.admit(parsed)
        else { return XCTFail("bundle did not admit") }

        let unknown = SchemamiCalculus.evaluate(
            .schedule(arguments: .object([SchemamiMember(name: "timezone", value: .string("Europe/Lisbon"))])),
            input: .bundle(bundle)
        )
        XCTAssertEqual(unknown.status, .refused)
        XCTAssertEqual(unknown.problems.first?.pointer.rawValue, "/arguments")

        let duplicate = SchemamiCalculus.evaluate(
            .scale(arguments: .object([
                SchemamiMember(name: "factor", value: .string("1")),
                SchemamiMember(name: "factor", value: .string("2")),
            ])),
            input: .bundle(bundle)
        )
        XCTAssertEqual(duplicate.status, .refused)
        XCTAssertEqual(duplicate.problems.first?.type, "https://schemami.dev/problems/invalid-operation-arguments")

        let wrongContainer = SchemamiCalculus.evaluate(
            .readingOrder(arguments: .array([])), input: .bundle(bundle)
        )
        XCTAssertEqual(wrongContainer.status, .refused)

        let nestedUnknown = SchemamiCalculus.evaluate(
            .resolveSelection(arguments: .object([SchemamiMember(name: "selections", value: .array([.object([
                SchemamiMember(name: "component_path", value: .array([])),
                SchemamiMember(name: "unexpected", value: .boolean(true)),
            ])]))])), input: .bundle(bundle)
        )
        XCTAssertEqual(nestedUnknown.status, .refused)

        let ambiguousPath = SchemamiCalculus.evaluate(
            .resolveSelection(arguments: .object([SchemamiMember(name: "selections", value: .array([.object([
                SchemamiMember(name: "component_path", value: .array([.string("child/nested")])),
            ])]))])), input: .bundle(bundle)
        )
        XCTAssertEqual(ambiguousPath.status, .refused)

        let duplicateBinding = SchemamiCalculus.evaluate(
            .resolveSelection(arguments: .object([SchemamiMember(name: "selections", value: .array([.object([
                SchemamiMember(name: "component_path", value: .array([])),
                SchemamiMember(name: "bindings", value: .object([
                    SchemamiMember(name: "mode", value: .string("cold")),
                    SchemamiMember(name: "mode", value: .string("ambient")),
                ])),
            ])]))])), input: .bundle(bundle)
        )
        XCTAssertEqual(duplicateBinding.status, .refused)

        let malformedTarget = SchemamiCalculus.evaluate(
            .scale(arguments: .object([SchemamiMember(name: "formula_target", value: .object([
                SchemamiMember(name: "formula_id", value: .string("mix")),
                SchemamiMember(name: "quantity", value: .object([
                    SchemamiMember(name: "kind", value: .string("measured")),
                    SchemamiMember(name: "value", value: .string("1")),
                    SchemamiMember(name: "unit", value: .string("g")),
                    SchemamiMember(name: "density", value: .string("invented")),
                ])),
            ]))])), input: .bundle(bundle)
        )
        XCTAssertEqual(malformedTarget.status, .refused)
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

        let semanticBudgets = ResourceBudgets(
            recursiveLevels: 64,
            semanticOccurrences: 20,
            bundleDocuments: 1_024,
            selectedComponentInstances: 1_024
        )
        let semanticResult = SchemamiCalculus.evaluate(
            .resolveSelection(arguments: .object([])),
            input: .bundle(bundle),
            budgets: semanticBudgets
        )
        XCTAssertEqual(semanticResult.status, .refused)
        XCTAssertEqual(semanticResult.problems.first?.type, "https://schemami.dev/problems/resource-limit")
    }
}
