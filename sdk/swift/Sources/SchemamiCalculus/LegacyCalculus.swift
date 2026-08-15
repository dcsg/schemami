import BigInt
import Foundation
import SchemamiCore

enum LegacyCalculus {
    private static let base = "https://schemami.dev/problems/"
    private struct UnitDefinition { let dimension: String; let factor: Rational }
    private static let units: [String: UnitDefinition] = [
        "1": .init(dimension: "unity", factor: 1), "g": .init(dimension: "mass", factor: 1),
        "kg": .init(dimension: "mass", factor: 1000), "mL": .init(dimension: "volume", factor: 1),
        "L": .init(dimension: "volume", factor: 1000),
        "[cup_us]": .init(dimension: "volume", factor: Rational(2_365_882_365, 10_000_000)),
        "[tbs_us]": .init(dimension: "volume", factor: Rational(295_735_295_625, 20_000_000_000)),
        "[tsp_us]": .init(dimension: "volume", factor: Rational(295_735_295_625, 60_000_000_000)),
        "[foz_us]": .init(dimension: "volume", factor: Rational(295_735_295_625, 10_000_000_000)),
        "[cup_m]": .init(dimension: "volume", factor: 240),
    ]
    private static let ambiguous = Set(["cup", "tbsp", "tsp", "floz"])

    static func evaluate(operation: String, input: SchemamiValue) -> SchemamiValue {
        switch operation {
        case "convert_quantity": return convertQuantity(input)
        case "resolve_formula": return resolveFormula(input)
        case "scale": return scale(input)
        case "reading_order": return readingOrder(input, schedule: false)
        case "schedule": return readingOrder(input, schedule: true)
        default: return refused(operation, "invalid-operation-arguments", "/operation")
        }
    }

    private static func convertQuantity(_ input: SchemamiValue) -> SchemamiValue {
        let operation = "convert_quantity"
        let pointer = input[member: "pointer"]?.stringValue ?? ""
        guard let quantity = input[member: "quantity"], quantity[member: "kind"]?.stringValue == "measured" else {
            return refused(operation, "unsupported-quantity-kind", pointer)
        }
        let source = quantity[member: "unit"]?.stringValue ?? ""
        let target = input[member: "target_unit"]?.stringValue ?? ""
        if ambiguous.contains(source) { return refused(operation, "ambiguous-unit", pointer + "/unit") }
        if ambiguous.contains(target) { return refused(operation, "ambiguous-unit", "") }
        let raw = quantity[member: "value"]?.stringValue ?? ""
        guard case .success(let value) = Rational.parseCanonical(raw) else {
            let code = Rational.parseCanonical(raw).problem
            return refused(operation, code, pointer + "/value")
        }
        let converted = convert(value, source: source, target: target)
        guard case .success(let result) = converted else {
            let code = converted.problem
            let problemPointer = code == "unknown-unit" && known(source) ? "" : pointer + "/unit"
            return refused(operation, code, problemPointer)
        }
        guard case .success(let formatted) = result.formatted() else {
            return refused(operation, result.formatted().problem, pointer + "/value")
        }
        return ok(operation, result: object([
            ("quantity", measured(value: formatted, unit: target)),
        ]))
    }

    private static func resolveFormula(_ input: SchemamiValue) -> SchemamiValue {
        let pointer = input[member: "pointer"]?.stringValue ?? "/formula"
        guard let formula = input[member: "formula"] else { return refused("resolve_formula", "invalid-operation-arguments", pointer) }
        return resolveLegacyFormula(formula, pointer: pointer, factor: 1, operation: "resolve_formula")
    }

    private static func resolveLegacyFormula(_ formula: SchemamiValue, pointer: String, factor: Rational, operation: String) -> SchemamiValue {
        let terms = formula[member: "terms"]?.arrayValue ?? []
        var quantities: [SchemamiValue] = []
        if formula[member: "kind"]?.stringValue == "ratio" {
            guard let target = formula[member: "target"] else { return refused(operation, "missing-fact", pointer + "/target") }
            guard target[member: "kind"]?.stringValue == "measured" else { return refused(operation, "unsupported-quantity-kind", pointer + "/target") }
            let raw = target[member: "value"]?.stringValue ?? ""
            guard case .success(var total) = Rational.parseCanonical(raw) else { return refused(operation, Rational.parseCanonical(raw).problem, pointer + "/target/value") }
            if target[member: "scaling"]?.stringValue != "fixed" { total = total * factor }
            var parts: [Rational] = []
            var partTotal: Rational = 0
            for (index, term) in terms.enumerated() {
                let rawPart = term[member: "parts"]?.stringValue ?? ""
                guard case .success(let part) = Rational.parsePositive(rawPart) else { return refused(operation, Rational.parsePositive(rawPart).problem, pointer + "/terms/\(index)/parts") }
                parts.append(part); partTotal = partTotal + part
            }
            if parts.isEmpty || partTotal <= 0 { return refused(operation, "invalid-operation-arguments", pointer + "/terms") }
            for (index, term) in terms.enumerated() {
                let exact = total * parts[index] / partTotal
                guard case .success(let formatted) = exact.formatted() else { return refused(operation, exact.formatted().problem, pointer + "/terms/\(index)/parts") }
                quantities.append(object([
                    ("ingredient", term[member: "ingredient"] ?? .string("")),
                    ("quantity", measured(value: formatted, unit: target[member: "unit"]?.stringValue ?? "")),
                ]))
            }
        } else if formula[member: "kind"]?.stringValue == "percentage" {
            let basis = formula[member: "basis"]?.stringValue ?? ""
            let basisIndices = terms.indices.filter { terms[$0][member: "ingredient"]?.stringValue == basis }
            guard basisIndices.count == 1 else { return refused(operation, "invalid-operation-arguments", pointer + "/terms") }
            let basisIndex = basisIndices[0]
            guard terms[basisIndex][member: "percentage"]?.stringValue == "100" else { return refused(operation, "invalid-operation-arguments", pointer + "/terms/\(basisIndex)/percentage") }
            guard let basisQuantity = formula[member: "basis_quantity"] else { return refused(operation, "missing-fact", pointer + "/basis_quantity") }
            guard basisQuantity[member: "kind"]?.stringValue == "measured" else { return refused(operation, "unsupported-quantity-kind", pointer + "/basis_quantity") }
            let raw = basisQuantity[member: "value"]?.stringValue ?? ""
            guard case .success(var amount) = Rational.parseCanonical(raw) else { return refused(operation, Rational.parseCanonical(raw).problem, pointer + "/basis_quantity/value") }
            if basisQuantity[member: "scaling"]?.stringValue != "fixed" { amount = amount * factor }
            for (index, term) in terms.enumerated() {
                let rawPercentage = term[member: "percentage"]?.stringValue ?? ""
                guard case .success(let percentage) = Rational.parsePositive(rawPercentage) else { return refused(operation, Rational.parsePositive(rawPercentage).problem, pointer + "/terms/\(index)/percentage") }
                let exact = amount * percentage / 100
                guard case .success(let formatted) = exact.formatted() else { return refused(operation, exact.formatted().problem, pointer + "/terms/\(index)/percentage") }
                quantities.append(object([
                    ("ingredient", term[member: "ingredient"] ?? .string("")),
                    ("quantity", measured(value: formatted, unit: basisQuantity[member: "unit"]?.stringValue ?? "")),
                ]))
            }
        } else { return refused(operation, "invalid-operation-arguments", pointer + "/kind") }
        return ok(operation, result: object([("quantities", .array(quantities))]))
    }

    private static func scale(_ input: SchemamiValue) -> SchemamiValue {
        let rawFactor = input[member: "factor"]?.stringValue ?? ""
        guard case .success(let factor) = Rational.parsePositive(rawFactor) else { return refused("scale", "invalid-operation-arguments", "/factor") }
        guard let recipe = input[member: "recipe"] else { return refused("scale", "invalid-operation-arguments", "/recipe") }
        var formulaQuantities: [String: SchemamiValue] = [:]
        if let formula = recipe[member: "formula"] {
            let resolved = resolveLegacyFormula(formula, pointer: "/formula", factor: factor, operation: "scale")
            guard resolved[member: "status"]?.stringValue == "ok" else { return resolved }
            for item in resolved[member: "result"]?[member: "quantities"]?.arrayValue ?? [] {
                if let id = item[member: "ingredient"]?.stringValue, let quantity = item[member: "quantity"] { formulaQuantities[id] = quantity }
            }
        }
        var output: [SchemamiValue] = []
        for (index, ingredient) in (recipe[member: "ingredients"]?.arrayValue ?? []).enumerated() {
            let id = ingredient[member: "id"]?.stringValue ?? ""
            if let quantity = formulaQuantities[id] { output.append(object([("ingredient", .string(id)), ("quantity", quantity)])); continue }
            guard let quantity = ingredient[member: "quantity"] else { return refused("scale", "missing-fact", "/ingredients/\(index)/quantity") }
            let scaled = scaleQuantity(quantity, factor: factor, pointer: "/ingredients/\(index)/quantity")
            guard scaled[member: "status"] == nil else { return scaled }
            output.append(object([("ingredient", .string(id)), ("quantity", scaled)]))
        }
        return ok("scale", result: object([("quantities", .array(output))]))
    }

    private static func scaleQuantity(_ quantity: SchemamiValue, factor: Rational, pointer: String) -> SchemamiValue {
        switch quantity[member: "kind"]?.stringValue {
        case "measured":
            if quantity[member: "scaling"]?.stringValue == "fixed" { return quantity }
            return scaleDecimalMember(quantity, member: "value", factor: factor, pointer: pointer + "/value")
        case "range":
            let minimum = scaleDecimalMember(quantity, member: "minimum", factor: factor, pointer: pointer + "/minimum")
            if minimum[member: "status"] != nil { return minimum }
            let maximum = scaleDecimalMember(minimum, member: "maximum", factor: factor, pointer: pointer + "/maximum")
            return maximum
        case "open": return quantity
        default: return refused("scale", "unsupported-quantity-kind", pointer)
        }
    }

    private static func scaleDecimalMember(_ value: SchemamiValue, member: String, factor: Rational, pointer: String) -> SchemamiValue {
        let raw = value[member: member]?.stringValue ?? ""
        guard case .success(let decimal) = Rational.parseCanonical(raw) else { return refused("scale", Rational.parseCanonical(raw).problem, pointer) }
        guard case .success(let formatted) = (decimal * factor).formatted() else { return refused("scale", (decimal * factor).formatted().problem, pointer) }
        return replacing(value, member: member, with: .string(formatted))
    }

    private struct Step { let id: String; let after: [String]; let duration: SchemamiValue? }
    private static func readingOrder(_ input: SchemamiValue, schedule: Bool) -> SchemamiValue {
        let operation = schedule ? "schedule" : "reading_order"
        let steps = (input[member: "steps"]?.arrayValue ?? []).map {
            Step(id: $0[member: "id"]?.stringValue ?? "", after: $0[member: "after"]?.arrayValue?.compactMap(\.stringValue) ?? [], duration: $0[member: "duration"])
        }
        let ordered = topological(steps)
        let order: [Int]
        switch ordered {
        case .success(let value): order = value
        case .failure(let problem): return refused(operation, problem.type, problem.pointer)
        }
        if !schedule { return ok(operation, result: object([("steps", .array(order.map { .string(steps[$0].id) }))])) }
        var durations: [BigInt] = []
        for (index, step) in steps.enumerated() {
            let parsed = stepDuration(step.duration)
            guard case .success(let duration) = parsed else { return refused(operation, parsed.problem, "/steps/\(index)/duration") }
            durations.append(duration)
        }
        let indexByID = Dictionary(uniqueKeysWithValues: steps.enumerated().map { ($0.element.id, $0.offset) })
        var ends = Array(repeating: BigInt(0), count: steps.count)
        var result: [SchemamiValue] = []
        for index in order {
            let start = steps[index].after.compactMap { indexByID[$0] }.map { ends[$0] }.max() ?? 0
            let end = start + durations[index]
            ends[index] = end
            result.append(object([
                ("id", .string(steps[index].id)), ("start", .string(formatElapsed(start))),
                ("duration", .string(formatElapsed(durations[index]))), ("end", .string(formatElapsed(end))),
            ]))
        }
        return ok(operation, result: object([("steps", .array(result))]))
    }

    private static func topological(_ steps: [Step]) -> Result<[Int], TopologyProblem> {
        var indexByID: [String: Int] = [:]
        for (index, step) in steps.enumerated() {
            if indexByID[step.id] != nil { return .failure(.init(type: "invalid-document", pointer: "/steps/\(index)/id")) }
            indexByID[step.id] = index
        }
        var indegree = Array(repeating: 0, count: steps.count)
        var dependents = Array(repeating: [Int](), count: steps.count)
        for (index, step) in steps.enumerated() {
            for dependency in step.after {
                guard let dependencyIndex = indexByID[dependency] else { return .failure(.init(type: "unresolved-reference", pointer: "/steps/\(index)/after")) }
                indegree[index] += 1; dependents[dependencyIndex].append(index)
            }
        }
        var result: [Int] = []; var used = Array(repeating: false, count: steps.count)
        while result.count < steps.count {
            guard let selected = steps.indices.first(where: { !used[$0] && indegree[$0] == 0 }) else { return .failure(.init(type: "invalid-document", pointer: "/steps")) }
            used[selected] = true; result.append(selected)
            for dependent in dependents[selected] { indegree[dependent] -= 1 }
        }
        return .success(result)
    }

    private struct TopologyProblem: Error { let type: String; let pointer: String }

    private static func stepDuration(_ value: SchemamiValue?) -> CalcResult<BigInt> {
        guard let value else { return .failure("missing-fact") }
        if let scalar = value.stringValue { return parseDuration(scalar) }
        guard value.objectMembers != nil else { return .failure("invalid-operation-arguments") }
        var parsed: [String: BigInt] = [:]
        for field in ["minimum", "target", "maximum"] {
            guard let raw = value[member: field]?.stringValue else { continue }
            guard case .success(let duration) = parseDuration(raw) else { return .failure(parseDuration(raw).problem) }
            parsed[field] = duration
        }
        for pair in [("minimum", "target"), ("target", "maximum"), ("minimum", "maximum")] {
            if let left = parsed[pair.0], let right = parsed[pair.1], left > right { return .failure("invalid-operation-arguments") }
        }
        guard let target = parsed["target"] else { return .failure("missing-fact") }
        return .success(target)
    }

    private static func parseDuration(_ raw: String) -> CalcResult<BigInt> {
        let pattern = #"^P(?:(?:([1-9][0-9]*)W)|(?:([1-9][0-9]*)D)?(?:T(?:([1-9][0-9]*)H)?(?:([1-9][0-9]*)M)?(?:([1-9][0-9]*)S)?)?)$"#
        guard let regex = try? NSRegularExpression(pattern: pattern), let match = regex.firstMatch(in: raw, range: NSRange(raw.startIndex..., in: raw)) else { return .failure("invalid-operation-arguments") }
        let factors: [BigInt] = [604800, 86400, 3600, 60, 1]
        var seconds: BigInt = 0
        for index in 1...5 {
            let range = match.range(at: index)
            guard range.location != NSNotFound, let swiftRange = Range(range, in: raw), let value = BigInt(String(raw[swiftRange])) else { continue }
            seconds += value * factors[index - 1]
        }
        return seconds > 0 ? .success(seconds) : .failure("invalid-operation-arguments")
    }

    private static func formatElapsed(_ seconds: BigInt) -> String {
        if seconds == 0 { return "PT0S" }
        if seconds % 604800 == 0 { return "P\(seconds / 604800)W" }
        var remaining = seconds
        let days = remaining / 86400; remaining %= 86400
        let hours = remaining / 3600; remaining %= 3600
        let minutes = remaining / 60; remaining %= 60
        var output = "P"
        if days != 0 { output += "\(days)D" }
        if hours != 0 || minutes != 0 || remaining != 0 {
            output += "T"
            if hours != 0 { output += "\(hours)H" }
            if minutes != 0 { output += "\(minutes)M" }
            if remaining != 0 { output += "\(remaining)S" }
        }
        return output
    }

    private static func convert(_ value: Rational, source: String, target: String) -> CalcResult<Rational> {
        if source == target && known(source) { return .success(value) }
        if source == "Cel" && target == "[degF]" { return .success(value * Rational(9, 5) + 32) }
        if source == "[degF]" && target == "Cel" { return .success((value - 32) * Rational(5, 9)) }
        if [source, target].contains("Cel") || [source, target].contains("[degF]") {
            return !known(source) || !known(target) ? .failure("unknown-unit") : .failure("dimension-mismatch")
        }
        guard let left = units[source], let right = units[target] else { return .failure("unknown-unit") }
        guard left.dimension == right.dimension else { return .failure("dimension-mismatch") }
        return .success(value * left.factor / right.factor)
    }

    private static func known(_ unit: String) -> Bool { unit == "Cel" || unit == "[degF]" || units[unit] != nil }
    private static func measured(value: String, unit: String) -> SchemamiValue { object([("kind", .string("measured")), ("value", .string(value)), ("unit", .string(unit))]) }
    private static func ok(_ operation: String, result: SchemamiValue) -> SchemamiValue { object([("operation", .string(operation)), ("status", .string("ok")), ("result", result)]) }
    private static func refused(_ operation: String, _ code: String, _ pointer: String, qualified: Bool = false) -> SchemamiValue {
        let type = qualified ? code : base + code
        var problem: [(String, SchemamiValue)] = [("type", .string(type))]
        if !pointer.isEmpty { problem.append(("pointer", .string(pointer))) }
        return object([("operation", .string(operation)), ("status", .string("refused")), ("problems", .array([object(problem)]))])
    }
    private static func object(_ members: [(String, SchemamiValue)]) -> SchemamiValue { .object(members.map { SchemamiMember(name: $0.0, value: $0.1) }) }
    private static func replacing(_ object: SchemamiValue, member: String, with value: SchemamiValue) -> SchemamiValue {
        guard let members = object.objectMembers else { return object }
        return .object(members.map { $0.name == member ? SchemamiMember(name: member, value: value) : $0 })
    }
}

enum CalcResult<Value> {
    case success(Value)
    case failure(String)
    var problem: String { if case .failure(let problem) = self { return problem }; return "" }
}

struct Rational: Sendable, Equatable, Comparable, ExpressibleByIntegerLiteral {
    let numerator: BigInt
    let denominator: BigInt
    init(_ numerator: Int64, _ denominator: Int64 = 1) { self.numerator = BigInt(numerator); self.denominator = BigInt(denominator) }
    init(numerator: BigInt, denominator: BigInt) {
        self.numerator = denominator < 0 ? -numerator : numerator
        self.denominator = denominator < 0 ? -denominator : denominator
    }
    init(integerLiteral value: Int64) { self.init(value) }
    static func + (l: Self, r: Self) -> Self { .init(numerator: l.numerator * r.denominator + r.numerator * l.denominator, denominator: l.denominator * r.denominator) }
    static func - (l: Self, r: Self) -> Self { .init(numerator: l.numerator * r.denominator - r.numerator * l.denominator, denominator: l.denominator * r.denominator) }
    static func * (l: Self, r: Self) -> Self { .init(numerator: l.numerator * r.numerator, denominator: l.denominator * r.denominator) }
    static func / (l: Self, r: Self) -> Self { .init(numerator: l.numerator * r.denominator, denominator: l.denominator * r.numerator) }
    static func < (l: Self, r: Self) -> Bool { l.numerator * r.denominator < r.numerator * l.denominator }

    static func parsePositive(_ raw: String) -> CalcResult<Self> {
        guard case .success(let value) = parseCanonical(raw), value > 0 else { return .failure(parseCanonical(raw).problem.isEmpty ? "invalid-decimal" : parseCanonical(raw).problem) }
        return .success(value)
    }

    static func parseCanonical(_ raw: String) -> CalcResult<Self> {
        guard !raw.isEmpty, !raw.hasPrefix("+"), !raw.contains("e"), !raw.contains("E") else { return .failure("invalid-decimal") }
        let negative = raw.hasPrefix("-"); let unsigned = negative ? String(raw.dropFirst()) : raw
        let parts = unsigned.split(separator: ".", omittingEmptySubsequences: false)
        guard (1...2).contains(parts.count), !parts[0].isEmpty, parts.count == 1 || !parts[1].isEmpty else { return .failure("invalid-decimal") }
        if parts[0].count > 1 && parts[0].first == "0" { return .failure("invalid-decimal") }
        if parts.count == 2 && (parts[1].count > 4 || parts[1].last == "0") { return .failure("invalid-decimal") }
        guard parts.allSatisfy({ $0.allSatisfy(\.isNumber) }) else { return .failure("invalid-decimal") }
        let digits = parts.reduce(0) { $0 + $1.count }
        guard digits <= 16 else { return .failure("resource-limit") }
        if negative && unsigned == "0" { return .failure("invalid-decimal") }
        guard let magnitude = BigInt(parts.map(String.init).joined()) else { return .failure("invalid-decimal") }
        return .success(.init(numerator: negative ? -magnitude : magnitude, denominator: BigInt(10).power(parts.count == 2 ? parts[1].count : 0)))
    }

    func formatted() -> CalcResult<String> {
        let negative = numerator < 0
        let absolute = negative ? -numerator : numerator
        let scaled = absolute * 10_000
        var quotient = scaled / denominator
        let remainder = scaled % denominator
        let comparison = remainder * 2
        if comparison > denominator || (comparison == denominator && quotient % 2 == 1) { quotient += 1 }
        let whole = quotient / 10_000
        let fractionValue = quotient % 10_000
        var formatted = String(whole)
        if fractionValue != 0 {
            var fraction = String(fractionValue)
            fraction = String(repeating: "0", count: 4 - fraction.count) + fraction
            while fraction.last == "0" { fraction.removeLast() }
            formatted += "." + fraction
        }
        if negative && quotient != 0 { formatted = "-" + formatted }
        let digits = formatted.filter(\.isNumber).count
        return digits > 16 ? .failure("resource-limit") : .success(formatted)
    }
}
