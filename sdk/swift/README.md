# Schemami Swift SDK

`SchemamiCore`, `SchemamiCalculus`, and `SchemamiDiff` provide deterministic
Schemami v1 support for iOS 17+, macOS 14+, and Swift 6.1+ packages.

```swift
let parsed = SchemamiCore.parse(data)
guard case .parsed(let document) = parsed else { return }
guard case .recipe(let recipe) = SchemamiCore.admit(document) else { return }

let result = SchemamiCalculus.evaluate(
    .schedule(arguments: .object([])),
    input: .recipe(recipe)
)
```

Core APIs are synchronous, offline, and result-oriented. They preserve exact
submitted bytes and the complete ordered JSON tree, reject lossy I-JSON before
identity, and require admitted handles for recipe operations. App mappings,
providers, storage, UI, timers, and baking policy remain outside the package.

Schemami is licensed under Apache-2.0; the package-local `LICENSE` travels with
the Swift package. After the owner publishes tag `v1.0.0`, add
`https://github.com/dcsg/schemami.git` from version `1.0.0` in Swift Package
Manager.
