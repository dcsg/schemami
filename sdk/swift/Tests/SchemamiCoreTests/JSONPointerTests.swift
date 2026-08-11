import XCTest
@testable import SchemamiCore

final class JSONPointerTests: XCTestCase {
    func testPointerValidationEscapingAndResolution() {
        XCTAssertNil(JSONPointer(rawValue: "ingredients/0"))
        XCTAssertNil(JSONPointer(rawValue: "/bad~2escape"))
        let pointer = JSONPointer.root.appending("a/b").appending("~key")
        XCTAssertEqual(pointer.rawValue, "/a~1b/~0key")
        XCTAssertEqual(pointer.tokens, ["a/b", "~key"])

        let value = SchemamiValue.object([
            SchemamiMember(name: "a/b", value: .object([
                SchemamiMember(name: "~key", value: .string("ok")),
            ])),
        ])
        XCTAssertEqual(pointer.resolve(in: value), .string("ok"))
    }
}
