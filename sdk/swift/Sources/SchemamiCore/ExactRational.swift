import BigInt

struct ExactRational: Sendable, Equatable, Comparable {
    let numerator: BigInt
    let denominator: BigInt

    init(_ integer: Int64) {
        numerator = BigInt(integer)
        denominator = 1
    }

    init(_ numerator: Int64, _ denominator: Int64) {
        precondition(denominator != 0)
        self.numerator = denominator < 0 ? -BigInt(numerator) : BigInt(numerator)
        self.denominator = BigInt(Swift.abs(denominator))
    }

    init(numerator: BigInt, denominator: BigInt) {
        precondition(denominator != 0)
        self.numerator = denominator < 0 ? -numerator : numerator
        self.denominator = denominator < 0 ? -denominator : denominator
    }

    init?(decimal raw: String) {
        guard !raw.isEmpty, !raw.hasPrefix("+"), !raw.contains("e"), !raw.contains("E") else { return nil }
        let negative = raw.hasPrefix("-")
        let unsigned = negative ? String(raw.dropFirst()) : raw
        let parts = unsigned.split(separator: ".", omittingEmptySubsequences: false)
        guard (1...2).contains(parts.count), !parts[0].isEmpty,
              parts.count == 1 || !parts[1].isEmpty,
              parts.allSatisfy({ $0.allSatisfy(\.isNumber) }) else { return nil }
        let fractionDigits = parts.count == 2 ? parts[1].count : 0
        guard let magnitude = BigInt(parts.map(String.init).joined()) else { return nil }
        let scale = BigInt(10).power(fractionDigits)
        self.init(numerator: negative ? -magnitude : magnitude, denominator: scale)
    }

    static func + (left: Self, right: Self) -> Self {
        Self(numerator: left.numerator * right.denominator + right.numerator * left.denominator,
             denominator: left.denominator * right.denominator)
    }

    static func - (left: Self, right: Self) -> Self {
        Self(numerator: left.numerator * right.denominator - right.numerator * left.denominator,
             denominator: left.denominator * right.denominator)
    }

    static func * (left: Self, right: Self) -> Self {
        Self(numerator: left.numerator * right.numerator, denominator: left.denominator * right.denominator)
    }

    static func / (left: Self, right: Self) -> Self {
        precondition(right.numerator != 0)
        return Self(numerator: left.numerator * right.denominator, denominator: left.denominator * right.numerator)
    }

    static func < (left: Self, right: Self) -> Bool {
        left.numerator * right.denominator < right.numerator * left.denominator
    }

    func canonicalDecimal(maxFractionDigits: Int) -> String? {
        let scale = BigInt(10).power(maxFractionDigits)
        let scaledNumerator = numerator * scale
        guard scaledNumerator % denominator == 0 else { return nil }
        let scaled = scaledNumerator / denominator
        let negative = scaled < 0
        var digits = String(negative ? -scaled : scaled)
        if maxFractionDigits == 0 { return (negative ? "-" : "") + digits }
        if digits.count <= maxFractionDigits {
            digits = String(repeating: "0", count: maxFractionDigits + 1 - digits.count) + digits
        }
        let split = digits.index(digits.endIndex, offsetBy: -maxFractionDigits)
        var fraction = String(digits[split...])
        while fraction.last == "0" { fraction.removeLast() }
        let whole = String(digits[..<split])
        return (negative ? "-" : "") + whole + (fraction.isEmpty ? "" : "." + fraction)
    }
}
