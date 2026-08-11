import XCTest
@testable import SchemamiCalculus
@testable import SchemamiCore

final class ComponentCompositionParityTests: XCTestCase {
    func testSiblingAndNestedComponentInstancesRemainDistinctAndPreordered() throws {
        let base = try bundleFixture()

        var siblingDocuments = try XCTUnwrap(base[member: "documents"]?.arrayValue)
        var siblingRootEntry = siblingDocuments[0]
        var siblingRoot = try XCTUnwrap(siblingRootEntry[member: "document"])
        var components = try XCTUnwrap(siblingRoot[member: "components"]?.arrayValue)
        var sibling = components[0]
        sibling = set(sibling, "id", .string("child_two"))
        sibling = set(sibling, "name", .string("Second component"))
        sibling = set(sibling, "quantity", measured("300", "g"))
        components.append(sibling)
        siblingRoot = set(siblingRoot, "components", .array(components))
        let siblingDigest = try siblingRoot.canonicalSHA256()
        siblingRootEntry = set(set(siblingRootEntry, "document", siblingRoot), "sha256", .string(siblingDigest))
        siblingDocuments[0] = siblingRootEntry
        var siblingBundle = set(base, "documents", .array(siblingDocuments))
        siblingBundle = set(siblingBundle, "root", set(try XCTUnwrap(base[member: "root"]), "sha256", .string(siblingDigest)))

        let siblingResult = SchemamiCalculus.evaluateStructured(
            operation: "scale", recipe: nil, bundle: siblingBundle,
            arguments: object([("factor", .string("1"))])
        )
        XCTAssertEqual(siblingResult[member: "status"]?.stringValue, "ok")
        let siblingInstances = try XCTUnwrap(siblingResult[member: "result"]?[member: "component_instances"]?.arrayValue)
        XCTAssertEqual(siblingInstances.count, 2)
        XCTAssertEqual(siblingInstances[1][member: "component_path"]?.arrayValue?.compactMap(\.stringValue), ["child_two"])
        XCTAssertEqual(quantityValues(siblingInstances[1]), ["180", "120"])

        var nestedDocuments = try XCTUnwrap(base[member: "documents"]?.arrayValue)
        var nestedRootEntry = nestedDocuments[0]
        var nestedRoot = try XCTUnwrap(nestedRootEntry[member: "document"])
        var nestedChildEntry = nestedDocuments[1]
        var nestedChild = try XCTUnwrap(nestedChildEntry[member: "document"])
        let grandchild = object([
            ("schemami", .string("1")), ("collection", .string("conformance")), ("id", .string("z-grandchild")),
            ("revision", .integer(1)), ("content_language", .string("pt-PT")), ("title", .string("Grandchild")),
            ("ingredients", .array([object([("id", .string("salt")), ("name", .string("Salt")), ("quantity", measured("25", "g"))])])),
            ("outputs", .array([object([("id", .string("portion")), ("name", .string("Portion")), ("yield", measured("25", "g"))])])),
            ("method", object([("sequence", .array([object([
                ("kind", .string("step")), ("id", .string("prepare")), ("instruction", .string("Prepare.")),
                ("uses", .array([object([("kind", .string("ingredient")), ("id", .string("salt"))])])),
                ("produces", .array([object([("kind", .string("output")), ("id", .string("portion"))])])),
            ])]))])),
        ])
        let grandchildDigest = try grandchild.canonicalSHA256()
        let nestedComponent = object([
            ("id", .string("nested")), ("name", .string("Nested")),
            ("recipe", object([("collection", .string("conformance")), ("id", .string("z-grandchild")), ("revision", .integer(1)), ("sha256", .string(grandchildDigest))])),
            ("output", .string("portion")), ("quantity", measured("50", "g")),
        ])
        nestedChild = set(nestedChild, "components", .array([nestedComponent]))
        let childDigest = try nestedChild.canonicalSHA256()
        nestedChildEntry = set(set(nestedChildEntry, "document", nestedChild), "sha256", .string(childDigest))
        nestedDocuments[1] = nestedChildEntry
        var rootComponents = try XCTUnwrap(nestedRoot[member: "components"]?.arrayValue)
        var rootComponent = rootComponents[0]
        rootComponent = set(rootComponent, "recipe", set(try XCTUnwrap(rootComponent[member: "recipe"]), "sha256", .string(childDigest)))
        rootComponents[0] = rootComponent
        nestedRoot = set(nestedRoot, "components", .array(rootComponents))
        let rootDigest = try nestedRoot.canonicalSHA256()
        nestedRootEntry = set(set(nestedRootEntry, "document", nestedRoot), "sha256", .string(rootDigest))
        nestedDocuments[0] = nestedRootEntry
        nestedDocuments.append(object([("sha256", .string(grandchildDigest)), ("document", grandchild)]))
        var nestedBundle = set(base, "documents", .array(nestedDocuments))
        nestedBundle = set(nestedBundle, "root", set(try XCTUnwrap(base[member: "root"]), "sha256", .string(rootDigest)))

        let nestedResult = SchemamiCalculus.evaluateStructured(
            operation: "scale", recipe: nil, bundle: nestedBundle,
            arguments: object([("factor", .string("1"))])
        )
        XCTAssertEqual(nestedResult[member: "status"]?.stringValue, "ok")
        let nestedInstances = try XCTUnwrap(nestedResult[member: "result"]?[member: "component_instances"]?.arrayValue)
        XCTAssertEqual(nestedInstances.count, 2)
        XCTAssertEqual(nestedInstances[1][member: "component_path"]?.arrayValue?.compactMap(\.stringValue), ["child", "nested"])
        XCTAssertEqual(quantityValues(nestedInstances[1]), ["100"])
    }

    func testMissingComponentBytesAndYieldRefuseExplicitly() throws {
        let base = try bundleFixture()
        let documents = try XCTUnwrap(base[member: "documents"]?.arrayValue)
        let missingBytes = set(base, "documents", .array([documents[0]]))
        let unresolved = SchemamiCalculus.evaluateStructured(
            operation: "scale", recipe: nil, bundle: missingBytes,
            arguments: object([("factor", .string("1"))])
        )
        XCTAssertEqual(problemType(unresolved), "https://schemami.dev/problems/unresolved-reference")
        XCTAssertEqual(problemPointer(unresolved), "/bundle/documents")

        var changed = documents
        var childEntry = changed[1]
        var child = try XCTUnwrap(childEntry[member: "document"])
        var outputs = try XCTUnwrap(child[member: "outputs"]?.arrayValue)
        outputs[0] = removing(outputs[0], "yield")
        child = set(child, "outputs", .array(outputs))
        let childDigest = try child.canonicalSHA256()
        childEntry = set(set(childEntry, "document", child), "sha256", .string(childDigest))
        changed[1] = childEntry
        var rootEntry = changed[0]
        var root = try XCTUnwrap(rootEntry[member: "document"])
        var components = try XCTUnwrap(root[member: "components"]?.arrayValue)
        components[0] = set(components[0], "recipe", set(try XCTUnwrap(components[0][member: "recipe"]), "sha256", .string(childDigest)))
        root = set(root, "components", .array(components))
        let rootDigest = try root.canonicalSHA256()
        rootEntry = set(set(rootEntry, "document", root), "sha256", .string(rootDigest))
        changed[0] = rootEntry
        var missingYield = set(base, "documents", .array(changed))
        missingYield = set(missingYield, "root", set(try XCTUnwrap(base[member: "root"]), "sha256", .string(rootDigest)))
        let refused = SchemamiCalculus.evaluateStructured(
            operation: "scale", recipe: nil, bundle: missingYield,
            arguments: object([("factor", .string("1"))])
        )
        XCTAssertEqual(problemType(refused), "https://schemami.dev/problems/missing-fact")
        XCTAssertEqual(problemPointer(refused), "/recipe/components/0/output")
    }

    func testComponentYieldUsesExactCompatibleUnitConversion() throws {
        let base = try bundleFixture()
        var documents = try XCTUnwrap(base[member: "documents"]?.arrayValue)
        var rootEntry = documents[0]
        var root = try XCTUnwrap(rootEntry[member: "document"])
        var components = try XCTUnwrap(root[member: "components"]?.arrayValue)
        components[0] = set(components[0], "quantity", measured("0.2", "kg"))
        root = set(root, "components", .array(components))
        let rootDigest = try root.canonicalSHA256()
        rootEntry = set(set(rootEntry, "document", root), "sha256", .string(rootDigest))
        documents[0] = rootEntry
        var bundle = set(base, "documents", .array(documents))
        bundle = set(bundle, "root", set(try XCTUnwrap(base[member: "root"]), "sha256", .string(rootDigest)))
        let result = SchemamiCalculus.evaluateStructured(
            operation: "scale", recipe: nil, bundle: bundle,
            arguments: object([("factor", .string("2"))])
        )
        XCTAssertEqual(result[member: "status"]?.stringValue, "ok")
        let instance = try XCTUnwrap(result[member: "result"]?[member: "component_instances"]?.arrayValue?.first)
        XCTAssertEqual(quantityValues(instance), ["240", "160"])
    }

    private func bundleFixture() throws -> SchemamiValue {
        let data = try SchemaResources.fixtureData("phase9.schemami-bundle.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data) else { throw FixtureError.parse }
        return parsed.value
    }

    private func quantityValues(_ instance: SchemamiValue) -> [String] {
        (instance[member: "quantities"]?.arrayValue ?? []).compactMap { $0[member: "quantity"]?[member: "value"]?.stringValue }
    }

    private func problemType(_ value: SchemamiValue) -> String? { value[member: "problems"]?.arrayValue?.first?[member: "type"]?.stringValue }
    private func problemPointer(_ value: SchemamiValue) -> String? { value[member: "problems"]?.arrayValue?.first?[member: "pointer"]?.stringValue }
    private func measured(_ value: String, _ unit: String) -> SchemamiValue { object([("kind", .string("measured")), ("value", .string(value)), ("unit", .string(unit))]) }
    private func object(_ values: [(String, SchemamiValue)]) -> SchemamiValue { .object(values.map { SchemamiMember(name: $0.0, value: $0.1) }) }
    private func set(_ value: SchemamiValue, _ name: String, _ replacement: SchemamiValue) -> SchemamiValue {
        var members = value.objectMembers ?? []
        if let index = members.firstIndex(where: { $0.name == name }) { members[index] = SchemamiMember(name: name, value: replacement) }
        else { members.append(SchemamiMember(name: name, value: replacement)) }
        return .object(members)
    }
    private func removing(_ value: SchemamiValue, _ name: String) -> SchemamiValue { .object((value.objectMembers ?? []).filter { $0.name != name }) }
    private enum FixtureError: Error { case parse }
}
