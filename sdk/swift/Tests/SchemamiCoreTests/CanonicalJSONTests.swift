import Foundation
import XCTest
@testable import SchemamiCore

final class CanonicalJSONTests: XCTestCase {
    func testSharedCanonicalizationCorpus() throws {
        let raw = try SchemaResources.conformanceData("canonicalization.json")
        let corpus = try XCTUnwrap(JSONSerialization.jsonObject(with: raw) as? [String: Any])
        let vectors = try XCTUnwrap(corpus["vectors"] as? [[String: Any]])
        XCTAssertEqual(vectors.count, 5)

        for vector in vectors {
            let id = try XCTUnwrap(vector["id"] as? String)
            let fixture = try XCTUnwrap(vector["fixture"] as? String)
            let name = URL(fileURLWithPath: fixture).lastPathComponent
            let expected = try XCTUnwrap(vector["expected_canonical"] as? String)
            let digest = try XCTUnwrap(vector["expected_sha256"] as? String)
            let fixtureData = try SchemaResources.fixtureData(name)
            guard case .parsed(let parsed) = SchemamiCore.parse(fixtureData) else {
                return XCTFail("\(id): strict parse refused")
            }
            XCTAssertEqual(String(decoding: try CanonicalJSON.encode(parsed.value), as: UTF8.self), expected, id)
            XCTAssertEqual(try CanonicalJSON.sha256(parsed.value), digest, id)
        }
    }
}
