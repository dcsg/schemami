import Foundation
import XCTest
@testable import SchemamiCore

final class SemanticAdmissionTests: XCTestCase {
    func testReachableGraphAdmissionPrunesUnusedParameters() throws {
        let parameters = (0..<64).map { ["id": "toggle_\($0)", "kind": "toggle", "name": "Unused"] }
        let object: [String: Any] = [
            "schemami": "1", "collection": "test", "id": "unused", "revision": 1,
            "content_language": "pt-PT", "title": "Unused", "parameters": parameters,
            "ingredients": [], "method": ["sequence": []],
            "x-adversary": ["kind": "toggle_is", "parameter": "toggle_0", "enabled": true],
        ]
        let data = try JSONSerialization.data(withJSONObject: object)
        guard case .parsed(let parsed) = SchemamiCore.parse(data), case .recipe = SchemamiCore.admit(parsed) else {
            return XCTFail("unused parameters caused graph-analysis refusal")
        }
    }

    func testOpaqueExtensionDoesNotSupplyProtocolQuantitySemantics() throws {
        let raw = Data(#"{"schemami":"1","collection":"test","id":"opaque","revision":1,"content_language":"en-GB","title":"Opaque","ingredients":[],"method":{"sequence":[]},"x-adversary":{"kind":"measured","value":"1","unit":"not-a-protocol-unit","nested":{"a":{"b":true}}}}"#.utf8)
        let budgets = ResourceBudgets(
            recursiveLevels: 64, semanticOccurrences: 4,
            bundleDocuments: 1_024, selectedComponentInstances: 1_024
        )
        guard case .parsed(let parsed) = SchemamiCore.parse(raw),
              case .recipe = SchemamiCore.admit(parsed, budgets: budgets)
        else { return XCTFail("opaque extension affected semantic validation or budget") }
    }

    func testReachableGraphAdmissionDeduplicatesEquivalentActivationRegions() throws {
        let parameters = (0..<14).map { ["id": "toggle_\($0)", "kind": "toggle", "name": "Toggle"] }
        let conditions: [[String: Any]] = parameters.map { parameter in
            ["kind": "any", "conditions": [
                ["kind": "toggle_is", "parameter": parameter["id"]!, "enabled": true],
                ["kind": "toggle_is", "parameter": parameter["id"]!, "enabled": false],
            ]]
        }
        let object: [String: Any] = [
            "schemami": "1", "collection": "test", "id": "bounded", "revision": 1,
            "content_language": "pt-PT", "title": "Bounded", "parameters": parameters,
            "ingredients": [["id": "always", "name": "Always", "activation": ["kind": "all", "conditions": conditions]]],
            "method": ["sequence": []],
        ]
        let data = try JSONSerialization.data(withJSONObject: object)
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .recipe = SchemamiCore.admit(parsed)
        else { return XCTFail("equivalent activation regions were not deduplicated") }
    }

    func testResidualAnalysisMatchesSharedToggleVectorEqualityBudget() throws {
        let raw = try SchemaResources.conformanceData("resource-budgets.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["vectors"] as? [[String: Any]])
        let vector = try XCTUnwrap(vectors.first { $0["id"] as? String == "toggle-vector-equality-14" })
        let generator = try XCTUnwrap(vector["generator"] as? [String: Any])
        let expected = try XCTUnwrap(vector["expected"] as? [String: Any])
        let width = try XCTUnwrap(generator["width"] as? Int)
        let staticSemantic = try XCTUnwrap(expected["static_semantic_occurrences"] as? Int)
        let graphCount = try XCTUnwrap(expected["distinct_reachable_graphs"] as? Int)
        let semanticBoundary = try XCTUnwrap(expected["total_semantic_occurrences"] as? Int)
        let analysisStates = try XCTUnwrap(expected["analysis_states"] as? Int)
        let defaultAnalysisStates = try XCTUnwrap(expected["default_analysis_states"] as? Int)
        let belowAnalysisBoundary = try XCTUnwrap(expected["below_exact_analysis_states"] as? Int)
        let exactAnalysisBoundary = try XCTUnwrap(expected["exact_analysis_states"] as? Int)
        XCTAssertEqual(semanticBoundary, staticSemantic * (graphCount + 1))
        XCTAssertEqual(analysisStates, exactAnalysisBoundary)
        XCTAssertEqual(ResourceBudgets.protocolFloor.analysisStates, defaultAnalysisStates)

        let left = (0..<width).map { ["id": "left_\($0)", "kind": "toggle", "name": "Left"] }
        let right = (0..<width).map { ["id": "right_\($0)", "kind": "toggle", "name": "Right"] }
        let equality: [[String: Any]] = (0..<width).map { index in
            ["kind": "any", "conditions": [
                ["kind": "all", "conditions": [
                    ["kind": "toggle_is", "parameter": "left_\(index)", "enabled": true],
                    ["kind": "toggle_is", "parameter": "right_\(index)", "enabled": true],
                ]],
                ["kind": "all", "conditions": [
                    ["kind": "toggle_is", "parameter": "left_\(index)", "enabled": false],
                    ["kind": "toggle_is", "parameter": "right_\(index)", "enabled": false],
                ]],
            ]]
        }
        let object: [String: Any] = [
            "schemami": "1", "collection": "test", "id": "equality", "revision": 1,
            "content_language": "en-GB", "title": "Equality", "parameters": left + right,
            "ingredients": [[
                "id": "conditional", "name": "Conditional",
                "activation": ["kind": "all", "conditions": equality],
            ]],
            "method": ["sequence": []],
        ]
        let data = try JSONSerialization.data(withJSONObject: object)
        guard case .parsed(let parsed) = SchemamiCore.parse(data) else {
            return XCTFail("equality vector did not parse")
        }

        let belowCanonicalBoundary = ResourceBudgets(
            recursiveLevels: 64, semanticOccurrences: semanticBoundary,
            bundleDocuments: 1_024, selectedComponentInstances: 1_024,
            analysisStates: belowAnalysisBoundary
        )
        guard case .refused(let problems) = SchemamiCore.admit(parsed, budgets: belowCanonicalBoundary) else {
            return XCTFail("analysis-state budget below the canonical boundary did not refuse")
        }
        XCTAssertEqual(problems.map(\.type), [ProblemType.resourceLimit])

        let canonicalBoundary = ResourceBudgets(
            recursiveLevels: 64, semanticOccurrences: semanticBoundary,
            bundleDocuments: 1_024, selectedComponentInstances: 1_024,
            analysisStates: exactAnalysisBoundary
        )
        guard case .recipe = SchemamiCore.admit(parsed, budgets: canonicalBoundary) else {
            return XCTFail("canonical analysis-state boundary did not admit the two-graph equality vector")
        }
    }

    func testResourceDiagnosticsMatchSharedCorpus() throws {
        let raw = try SchemaResources.conformanceData("resource-budgets.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["diagnostic_vectors"] as? [[String: Any]])
        for vector in vectors {
            let id = try XCTUnwrap(vector["id"] as? String)
            let fixture = try XCTUnwrap(vector["fixture"] as? String)
            let budget = try XCTUnwrap(vector["budgets"] as? [String: Int])
            let expected = try XCTUnwrap(vector["expected_problems"] as? [[String: String]])
            guard case .parsed(let parsed) = SchemamiCore.parse(try SchemaResources.fixtureData(fixture)) else {
                return XCTFail("\(id) did not parse")
            }
            let budgets = ResourceBudgets(
                recursiveLevels: try XCTUnwrap(budget["recursive_levels"]),
                semanticOccurrences: try XCTUnwrap(budget["semantic_occurrences"]),
                bundleDocuments: try XCTUnwrap(budget["bundle_documents"]),
                selectedComponentInstances: try XCTUnwrap(budget["selected_component_instances"]),
                analysisStates: try XCTUnwrap(budget["analysis_states"])
            )
            guard case .refused(let problems) = SchemamiCore.admit(parsed, budgets: budgets) else {
                return XCTFail("\(id) did not refuse")
            }
            XCTAssertEqual(problems.map(\.type), expected.compactMap { $0["type"] }, id)
            XCTAssertEqual(problems.map(\.pointer.rawValue), expected.compactMap { $0["pointer"] }, id)
        }
    }

    func testEverySharedValidationVectorMatchesPublicAdmission() throws {
        let raw = try SchemaResources.conformanceData("validation.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["vectors"] as? [[String: Any]])
        for vector in vectors {
            let id = try XCTUnwrap(vector["id"] as? String)
            let expected = try XCTUnwrap(vector["expected_valid"] as? Bool)
            let document = try XCTUnwrap(vector["document"] as? [String: Any])
            let data = try JSONSerialization.data(withJSONObject: document, options: [.sortedKeys])
            guard case .parsed(let parsed) = SchemamiCore.parse(data) else {
                return XCTFail("\(id): strict parse refused")
            }
            switch SchemamiCore.admit(parsed) {
            case .recipe(let admitted):
                XCTAssertTrue(expected, "\(id): unexpectedly admitted")
                XCTAssertEqual(admitted.submittedJSON, data, id)
                XCTAssertEqual(admitted.value, parsed.value, id)
                XCTAssertEqual(try admitted.sha256().count, 64, id)
            case .bundle:
                XCTFail("\(id): projected as bundle")
            case .refused(let problems):
                XCTAssertFalse(expected, "\(id): unexpectedly refused with \(problems)")
                XCTAssertFalse(problems.isEmpty, id)
                XCTAssertEqual(problems, ProblemNormalizer.normalize(problems), id)
                let expectedProblems = try XCTUnwrap(vector["expected_problems"] as? [[String: String]], id)
                XCTAssertEqual(problems.map { ["type": $0.type, "pointer": $0.pointer.rawValue] }, expectedProblems, id)
            }
        }
    }

    func testBundleSemanticAdmissionAndCanonicalIdentity() throws {
        let data = try SchemaResources.fixtureData("phase9.schemami-bundle.json")
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .bundle(let admitted) = SchemamiCore.admit(parsed)
        else { return XCTFail("valid bundle refused") }
        XCTAssertEqual(admitted.submittedJSON, data)
        XCTAssertEqual(admitted.value, parsed.value)
        XCTAssertEqual(try admitted.sha256().count, 64)

        let constrained = ResourceBudgets(
            recursiveLevels: 64, semanticOccurrences: 20,
            bundleDocuments: 1_024, selectedComponentInstances: 1_024
        )
        guard case .refused(let problems) = SchemamiCore.admit(parsed, budgets: constrained) else {
            return XCTFail("aggregate bundle semantic budget was reset per document")
        }
        XCTAssertEqual(problems.first?.type, ProblemType.resourceLimit)
        XCTAssertEqual(problems.first?.pointer.rawValue, "/documents")

        let aggregateAnalysis = ResourceBudgets(
            recursiveLevels: 64, semanticOccurrences: 10_000,
            bundleDocuments: 1_024, selectedComponentInstances: 1_024,
            analysisStates: 1
        )
        for fixture in ["phase9-root.schemami.json", "phase9-child.schemami.json"] {
            let recipeData = try SchemaResources.fixtureData(fixture)
            guard case .parsed(let recipeParsed) = SchemamiCore.parse(recipeData),
                  case .recipe = SchemamiCore.admit(recipeParsed, budgets: aggregateAnalysis)
            else { return XCTFail("single recipe exceeded one analysis state: \(fixture)") }
        }
        guard case .refused(let aggregateProblems) = SchemamiCore.admit(parsed, budgets: aggregateAnalysis) else {
            return XCTFail("bundle analysis-state budget was reset per document")
        }
        XCTAssertEqual(aggregateProblems.map(\.type), [ProblemType.resourceLimit])
        XCTAssertEqual(aggregateProblems.first?.pointer.rawValue, "/documents/1/document")
    }

    func testIndependentProblemsAreDeduplicatedAndPointerSorted() throws {
        let data = Data(#"{"schemami":"1","collection":"tests","id":"problems","revision":1,"content_language":"pt-PT","title":"Problems","ingredients":[{"id":"a","name":"A"}],"method":{"sequence":[{"kind":"step","id":"work","instruction":"Work","uses":[{"kind":"ingredient","id":"missing"}],"techniques":["missing"]}]}}"#.utf8)
        guard case .parsed(let parsed) = SchemamiCore.parse(data),
              case .refused(let problems) = SchemamiCore.admit(parsed)
        else { return XCTFail("invalid document did not refuse") }
        XCTAssertEqual(problems.map(\.pointer.rawValue), [
            "/method/sequence/0/techniques/0",
            "/method/sequence/0/uses/0",
        ])
        XCTAssertTrue(problems.allSatisfy { $0.type == ProblemType.invalidDocument })
    }
}
