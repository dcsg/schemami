import XCTest
import SchemamiDiff
@testable import SchemamiCore

final class SchemamiDiffTests: XCTestCase {
    func testIdenticalAdmittedRecipeHasNoChangesAndPreservesIdentity() throws {
        let recipe = try admittedFixture()
        let result = SchemamiDiff.compare(source: recipe, candidate: recipe)
        XCTAssertFalse(result.hasChanges)
        XCTAssertEqual(result.source, result.candidate)
        XCTAssertTrue(result.changes.isEmpty)
    }

    func testReportsEveryRequiredStructuralFamilyInDeterministicPointerOrder() throws {
        let source = try admittedFixture()
        var candidate = source.value
        candidate = set(candidate, ["revision"], .integer(2))
        candidate = set(candidate, ["title"], .string("Receita estruturada revista"))
        candidate = set(candidate, ["lineage", "derived_from", "0", "sha256"], .string(String(repeating: "3", count: 64)))

        var ingredients = try XCTUnwrap(candidate[member: "ingredients"]?.arrayValue)
        ingredients[1] = set(ingredients[1], ["name"], .string("Água filtrada"))
        ingredients.swapAt(0, 1)
        ingredients.append(object([
            ("id", .string("oil")), ("name", .string("Azeite")),
            ("quantity", measured("10", "g")),
        ]))
        candidate = set(candidate, ["ingredients"], .array(ingredients))
        candidate = set(candidate, ["formulas", "0", "basis_quantity", "value"], .string("1200"))
        candidate = set(candidate, ["method", "sequence", "0", "name"], .string("Preparar a massa"))
        candidate = set(candidate, ["method", "sequence", "0", "sequence", "0", "actions", "0", "instruction"], .string("Misture cuidadosamente."))
        candidate = set(candidate, ["method", "sequence", "2", "sequence", "0", "environment", "location"], .string("Câmara fria"))
        candidate = set(candidate, ["method", "sequence", "3", "completion", "conditions", "0", "cue"], .string("A côdea está bem dourada."))
        candidate = set(candidate, ["techniques", "0", "name"], .string("Fermentação refrigerada"))

        var equipment = try XCTUnwrap(candidate[member: "equipment"]?.arrayValue)
        equipment.swapAt(0, 1)
        candidate = set(candidate, ["equipment"], .array(equipment))
        candidate = set(candidate, ["components", "0", "name"], .string("Levain ativo"))
        candidate = set(candidate, ["outputs", "0", "yield", "value"], .string("2"))
        candidate = set(candidate, ["x-review"], .string("candidate-only extension"))

        let admittedCandidate = try admit(candidate)
        let sourceDigestBefore = try source.sha256()
        let candidateDigestBefore = try admittedCandidate.sha256()
        let first = SchemamiDiff.compare(source: source, candidate: admittedCandidate)
        let second = SchemamiDiff.compare(source: source, candidate: admittedCandidate)

        XCTAssertEqual(first, second)
        XCTAssertEqual(first.source.sha256, sourceDigestBefore)
        XCTAssertEqual(first.candidate.sha256, candidateDigestBefore)
        XCTAssertEqual(try source.sha256(), sourceDigestBefore)
        XCTAssertEqual(try admittedCandidate.sha256(), candidateDigestBefore)
        XCTAssertTrue(first.hasChanges)

        let pointers = first.changes.map(\.pointer.rawValue)
        XCTAssertEqual(pointers, pointers.sorted())
        for required in [
            "/revision", "/title", "/lineage/derived_from/0/sha256", "/ingredients",
            "/formulas/0/basis_quantity/value", "/method/sequence/0/name",
            "/method/sequence/0/sequence/0/actions/0/instruction",
            "/method/sequence/2/sequence/0/environment/location",
            "/method/sequence/3/completion/conditions/0/cue", "/techniques/0/name",
            "/equipment", "/components/0/name", "/outputs/0/yield/value", "/x-review",
        ] {
            XCTAssertTrue(pointers.contains(required), "missing change at \(required): \(pointers)")
        }
        XCTAssertEqual(first.changes.first(where: { $0.pointer.rawValue == "/ingredients" })?.kind, .reordered)
        XCTAssertEqual(first.changes.first(where: { $0.pointer.rawValue == "/equipment" })?.kind, .reordered)
        XCTAssertEqual(first.changes.first(where: { $0.pointer.rawValue == "/x-review" })?.kind, .added)
        XCTAssertEqual(first.changes.first(where: { $0.pointer.rawValue == "/ingredients/0/name" })?.kind, .renamed)
    }

    func testRemovedValueKeepsSourcePointerAndAddedValueKeepsCandidatePointer() throws {
        let source = try admittedFixture()
        var candidate = source.value
        candidate = removing(candidate, "lineage")
        candidate = set(candidate, ["x-candidate"], .boolean(true))
        let result = SchemamiDiff.compare(source: source, candidate: try admit(candidate))
        let removed = try XCTUnwrap(result.changes.first { $0.pointer.rawValue == "/lineage" })
        XCTAssertEqual(removed.kind, .removed)
        XCTAssertNotNil(removed.sourcePointer)
        XCTAssertNil(removed.candidatePointer)
        let added = try XCTUnwrap(result.changes.first { $0.pointer.rawValue == "/x-candidate" })
        XCTAssertEqual(added.kind, .added)
        XCTAssertNil(added.sourcePointer)
        XCTAssertNotNil(added.candidatePointer)
    }

    func testExtensionArrayReorderIgnoresObjectMemberOrder() throws {
        let fixture = try parseFixture("phase9-structured.schemami.json")
        let sourceValue = set(fixture, ["x-order"], .array([
            object([("a", .integer(1)), ("b", .integer(2))]),
            object([("a", .integer(3)), ("b", .integer(4))]),
        ]))
        let candidateValue = set(fixture, ["x-order"], .array([
            object([("b", .integer(4)), ("a", .integer(3))]),
            object([("b", .integer(2)), ("a", .integer(1))]),
        ]))
        let result = SchemamiDiff.compare(source: try admit(sourceValue), candidate: try admit(candidateValue))
        XCTAssertEqual(result.changes.count, 1)
        XCTAssertEqual(result.changes.first?.kind, .reordered)
        XCTAssertEqual(result.changes.first?.pointer.rawValue, "/x-order")
    }

    func testScalarDistinctCanonicallyEquivalentExtensionKeysDoNotTrap() throws {
        let fixture = try parseFixture("phase9-structured.schemami.json")
        let sourceValue = set(fixture, ["x-unicode"], object([
            ("é", .integer(1)), ("e\u{301}", .integer(2)),
        ]))
        let candidateValue = set(fixture, ["x-unicode"], object([
            ("é", .integer(3)), ("e\u{301}", .integer(4)),
        ]))
        let result = SchemamiDiff.compare(source: try admit(sourceValue), candidate: try admit(candidateValue))
        XCTAssertEqual(result.changes.count, 2)
        XCTAssertTrue(result.changes.allSatisfy { $0.kind == .modified })
    }

    func testLargeOpaqueObjectsUseExactKeyLookup() throws {
        let fixture = try parseFixture("phase9-structured.schemami.json")
        let members = (0..<2_000).map { ("key-\($0)", SchemamiValue.integer($0)) }
        let value = set(fixture, ["x-large"], object(members))
        let recipe = try admit(value)
        XCTAssertFalse(SchemamiDiff.compare(source: recipe, candidate: recipe).hasChanges)
    }

    func testSharedCrossLanguageDiffConformanceCorpus() throws {
        let raw = try SchemaResources.conformanceData("diff.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["vectors"] as? [[String: Any]])
        for vector in vectors {
            let id = try XCTUnwrap(vector["id"] as? String)
            let sourceData = try JSONSerialization.data(withJSONObject: try XCTUnwrap(vector["source"]), options: [.sortedKeys])
            let candidateData = try JSONSerialization.data(withJSONObject: try XCTUnwrap(vector["candidate"]), options: [.sortedKeys])
            guard case .parsed(let sourceParsed) = SchemamiCore.parse(sourceData),
                  case .parsed(let candidateParsed) = SchemamiCore.parse(candidateData),
                  case .recipe(let source) = SchemamiCore.admit(sourceParsed),
                  case .recipe(let candidate) = SchemamiCore.admit(candidateParsed)
            else { return XCTFail("\(id): parse/admit refused") }
            let actual: [[String: String]] = SchemamiDiff.compare(source: source, candidate: candidate).changes.map { change in
                var item = ["kind": change.kind.rawValue, "pointer": change.pointer.rawValue]
                if let source = change.sourcePointer { item["source_pointer"] = source.rawValue }
                if let candidate = change.candidatePointer { item["candidate_pointer"] = candidate.rawValue }
                return item
            }
            XCTAssertEqual(actual as NSArray, try XCTUnwrap(vector["expected_changes"] as? NSArray), id)
        }
    }

    private func admittedFixture() throws -> AdmittedRecipe {
        try admit(parseFixture("phase9-structured.schemami.json"))
    }

    private func parseFixture(_ name: String) throws -> SchemamiValue {
        let data = try SchemaResources.fixtureData(name)
        guard case .parsed(let parsed) = SchemamiCore.parse(data) else { throw FixtureError.parse }
        return parsed.value
    }

    private func admit(_ value: SchemamiValue) throws -> AdmittedRecipe {
        let data = try value.encodedJSON()
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .recipe(let admitted) = SchemamiCore.admit(parsed) else { throw FixtureError.admission }
        return admitted
    }

    private func set(_ value: SchemamiValue, _ tokens: [String], _ replacement: SchemamiValue) -> SchemamiValue {
        guard let head = tokens.first else { return replacement }
        let tail = Array(tokens.dropFirst())
        switch value {
        case .object(var members):
            if let index = members.firstIndex(where: { $0.name == head }) {
                members[index] = SchemamiMember(name: head, value: set(members[index].value, tail, replacement))
            } else if tail.isEmpty {
                members.append(SchemamiMember(name: head, value: replacement))
            }
            return .object(members)
        case .array(var values):
            guard let index = Int(head), values.indices.contains(index) else { return value }
            values[index] = set(values[index], tail, replacement)
            return .array(values)
        default:
            return value
        }
    }

    private func removing(_ value: SchemamiValue, _ name: String) -> SchemamiValue {
        .object((value.objectMembers ?? []).filter { $0.name != name })
    }

    private func measured(_ value: String, _ unit: String) -> SchemamiValue {
        object([("kind", .string("measured")), ("value", .string(value)), ("unit", .string(unit))])
    }

    private func object(_ values: [(String, SchemamiValue)]) -> SchemamiValue {
        .object(values.map { SchemamiMember(name: $0.0, value: $0.1) })
    }

    private enum FixtureError: Error { case parse, admission }
}
