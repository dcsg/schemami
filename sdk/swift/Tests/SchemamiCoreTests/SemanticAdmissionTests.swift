import Foundation
import XCTest
@testable import SchemamiCore

final class SemanticAdmissionTests: XCTestCase {
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
