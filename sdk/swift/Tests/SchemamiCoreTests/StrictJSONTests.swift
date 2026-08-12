import Foundation
import XCTest
@testable import SchemamiCore

final class StrictJSONTests: XCTestCase {
    func testLossyIJSONNumbersRefuseBeforeIdentity() {
        for raw in [#"{"x":1e400}"#, #"{"x":1e-400}"#, #"{"x":9007199254740993}"#] {
            guard case .refused(let problems) = SchemamiCore.parse(Data(raw.utf8)) else {
                return XCTFail("lossy number admitted: \(raw)")
            }
            XCTAssertEqual(problems.map(\.type), ["https://schemami.dev/problems/invalid-json"])
        }
        guard case .parsed = SchemamiCore.parse(Data(#"{"x":100000000000000000000}"#.utf8)) else {
            return XCTFail("exactly representable large integer refused")
        }
        for raw in [#"{"x":0e100000000}"#, #"{"x":0e-100000000}"#] {
            guard case .parsed = SchemamiCore.parse(Data(raw.utf8)) else {
                return XCTFail("zero with a large exponent was not handled in constant work")
            }
        }
    }

    func testCanonicallyEquivalentUnicodeKeysRemainDistinct() throws {
        let raw = #"{"é":1,"e\u0301":2}"#
        guard case .parsed(let parsed) = SchemamiCore.parse(Data(raw.utf8)) else {
            return XCTFail("scalar-distinct Unicode keys were refused")
        }
        XCTAssertEqual(parsed.value.objectMembers?.count, 2)
        XCTAssertEqual(parsed.value.objectMembers?.map { Array($0.name.unicodeScalars.map(\.value)) }, [[233], [101, 769]])
        let encoded = try parsed.value.encodedJSON()
        guard case .parsed(let reparsed) = SchemamiCore.parse(encoded) else { return XCTFail("retained Unicode tree did not reparse") }
        XCTAssertEqual(reparsed.value.objectMembers?.count, 2)
    }

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

    func testRawJSONNestingUsesAStackSafeParserCeiling() {
        let raw = #"{"x":"# + String(repeating: "[", count: 257) + "0" + String(repeating: "]", count: 257) + "}"
        guard case .refused(let problems) = SchemamiCore.parse(Data(raw.utf8)) else {
            return XCTFail("deep JSON bypassed parser safety ceiling")
        }
        XCTAssertEqual(problems.first?.type, "https://schemami.dev/problems/resource-limit")
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

    func testProtocolSemanticBudgetsAreNotMisappliedToRawJSONTokens() {
        let shallow = ResourceBudgets(recursiveLevels: 1, semanticOccurrences: 10, bundleDocuments: 1, selectedComponentInstances: 1)
        let tiny = ResourceBudgets(recursiveLevels: 64, semanticOccurrences: 1, bundleDocuments: 1, selectedComponentInstances: 1)
        for result in [
            SchemamiCore.parse(Data(#"{"a":{"b":1}}"#.utf8), budgets: shallow),
            SchemamiCore.parse(Data(#"{"a":[1,2]}"#.utf8), budgets: tiny),
        ] {
            guard case .parsed = result else { return XCTFail("protocol semantic budget was applied to raw JSON tokens") }
        }
    }
}
