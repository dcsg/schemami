import Foundation
import XCTest
@testable import SchemamiCore

final class StrictJSONTests: XCTestCase {
    func testRetainsExactSubmittedBytesAndAuthoredOrder() throws {
        let data = Data(#"{"b":1,"a":[true,null,"texto"]}"#.utf8)
        guard case .parsed(let parsed) = SchemamiCore.parse(data) else {
            return XCTFail("expected parsed document")
        }
        XCTAssertEqual(parsed.submittedJSON, data)
        XCTAssertEqual(parsed.value.objectMembers?.map(\.name), ["b", "a"])
        XCTAssertEqual(try parsed.value.encodedJSON(), data)
    }

    func testDuplicateMemberRefusesBeforeDependencyLastWinsParsing() {
        let data = Data(#"{"id":"a","id":"b"}"#.utf8)
        guard case .refused(let problems) = SchemamiCore.parse(data) else {
            return XCTFail("expected refusal")
        }
        XCTAssertEqual(problems.map(\.type), ["https://schemami.dev/problems/duplicate-object-member"])
    }

    func testInvalidUTF8AndLoneSurrogateRefuse() {
        let invalidUTF8 = Data([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xed, 0xa0, 0x80, 0x22, 0x7d])
        let loneSurrogate = Data(#"{"a":"\uD800"}"#.utf8)
        for data in [invalidUTF8, loneSurrogate] {
            guard case .refused(let problems) = SchemamiCore.parse(data) else {
                return XCTFail("expected invalid Unicode refusal")
            }
            XCTAssertEqual(problems.first?.type, "https://schemami.dev/problems/invalid-json")
        }
    }

    func testRecursiveAndOccurrenceBudgetsRefuseDeterministically() {
        let shallow = ResourceBudgets(recursiveLevels: 1, semanticOccurrences: 10, bundleDocuments: 1, selectedComponentInstances: 1)
        let tiny = ResourceBudgets(recursiveLevels: 64, semanticOccurrences: 1, bundleDocuments: 1, selectedComponentInstances: 1)
        for result in [
            SchemamiCore.parse(Data(#"{"a":{"b":1}}"#.utf8), budgets: shallow),
            SchemamiCore.parse(Data(#"[1,2]"#.utf8), budgets: tiny),
        ] {
            guard case .refused(let problems) = result else { return XCTFail("expected resource refusal") }
            XCTAssertEqual(problems.first?.type, "https://schemami.dev/problems/resource-limit")
        }
    }
}
