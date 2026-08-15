// swift-tools-version: 6.1

import PackageDescription

let package = Package(
    name: "Schemami",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "SchemamiCore", targets: ["SchemamiCore"]),
        .library(name: "SchemamiCalculus", targets: ["SchemamiCalculus"]),
        .library(name: "SchemamiDiff", targets: ["SchemamiDiff"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ajevans99/swift-json-schema.git", exact: "0.13.1"),
        .package(url: "https://github.com/attaswift/BigInt.git", exact: "5.7.0"),
    ],
    targets: [
        .target(
            name: "SchemamiCore",
            dependencies: [
                .product(name: "OrderedJSON", package: "swift-json-schema"),
                .product(name: "JSONSchema", package: "swift-json-schema"),
                .product(name: "BigInt", package: "BigInt"),
            ],
            path: "sdk/swift/Sources/SchemamiCore",
            resources: [.process("Resources")]
        ),
        .target(
            name: "SchemamiCalculus",
            dependencies: [
                "SchemamiCore",
                .product(name: "BigInt", package: "BigInt"),
            ],
            path: "sdk/swift/Sources/SchemamiCalculus"
        ),
        .target(
            name: "SchemamiDiff",
            dependencies: ["SchemamiCore"],
            path: "sdk/swift/Sources/SchemamiDiff"
        ),
        .testTarget(
            name: "SchemamiCoreTests",
            dependencies: ["SchemamiCore"],
            path: "sdk/swift/Tests/SchemamiCoreTests"
        ),
        .testTarget(
            name: "SchemamiCalculusTests",
            dependencies: ["SchemamiCalculus", "SchemamiCore"],
            path: "sdk/swift/Tests/SchemamiCalculusTests"
        ),
        .testTarget(
            name: "SchemamiDiffTests",
            dependencies: ["SchemamiDiff", "SchemamiCore"],
            path: "sdk/swift/Tests/SchemamiDiffTests"
        ),
    ]
)
