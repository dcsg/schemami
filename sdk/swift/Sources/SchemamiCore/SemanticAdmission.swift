import Foundation

private final class AdmissionResourceLedger {
    let budgets: ResourceBudgets
    private(set) var semanticOccurrences = 0
    private(set) var analysisStates = 0

    init(budgets: ResourceBudgets) { self.budgets = budgets }

    func chargeSemantic(_ amount: Int, pointer: String = "") -> Problem? {
        let (next, overflow) = semanticOccurrences.addingReportingOverflow(amount)
        guard amount >= 0, !overflow, next <= budgets.semanticOccurrences else {
            return SemanticAdmission.problem(ProblemType.resourceLimit, pointer)
        }
        semanticOccurrences = next
        return nil
    }

    func chargeAnalysisState(pointer: String = "") -> Problem? {
        let (next, overflow) = analysisStates.addingReportingOverflow(1)
        guard !overflow, next <= budgets.analysisStates else {
            return SemanticAdmission.problem(ProblemType.resourceLimit, pointer)
        }
        analysisStates = next
        return nil
    }
}

enum SemanticAdmission {
    private static let knownUnitDimensions: [String: String] = [
        "1": "unity", "g": "mass", "kg": "mass", "mL": "volume", "L": "volume",
        "[cup_us]": "volume", "[tbs_us]": "volume", "[tsp_us]": "volume",
        "[foz_us]": "volume", "[cup_m]": "volume", "Cel": "temperature", "[degF]": "temperature",
    ]

    static func validate(_ document: SchemamiValue, budgets: ResourceBudgets) -> [Problem] {
        let ledger = AdmissionResourceLedger(budgets: budgets)
        return validate(document, budgets: budgets, ledger: ledger, chargeProtocolObjects: true)
    }

    private static func validate(
        _ document: SchemamiValue,
        budgets: ResourceBudgets,
        ledger: AdmissionResourceLedger,
        chargeProtocolObjects: Bool
    ) -> [Problem] {
        guard document.objectMembers != nil else { return [invalid()] }
        if chargeProtocolObjects, let limit = ledger.chargeSemantic(semanticObjectCount(document)) {
            return [limit]
        }

        var failures: [Problem] = []
        validateLanguageAndOrigin(document, into: &failures)
        let collections = namedCollections(document, into: &failures)
        validateParameters(document, collections: collections, into: &failures)
        validateIngredientAlternatives(document, into: &failures)
        let method = collectMethod(document, budgets: budgets, into: &failures)
        validateMethod(method, collections: collections, budgets: budgets, into: &failures)
        validateFormulas(document, collections: collections, into: &failures)
        validateActivationSites(document, method: method, collections: collections, budgets: budgets, into: &failures)
        validateSourcesAndEvidence(document, collections: collections, into: &failures)
        validateQuantities(document, into: &failures)

        if failures.contains(where: { $0.type == ProblemType.resourceLimit }) {
            return [problem(ProblemType.resourceLimit)]
        }
        failures = ProblemNormalizer.normalize(failures)
        guard failures.isEmpty else { return failures }
        return ReachableGraphAdmission.validate(document, collections: collections, ledger: ledger)
    }

    static func validateBundle(_ bundle: RecipeBundle, budgets: ResourceBudgets) -> [Problem] {
        guard bundle.documents.count <= budgets.bundleDocuments else {
            return [problem(ProblemType.resourceLimit, "/documents")]
        }
        let ledger = AdmissionResourceLedger(budgets: budgets)
        if let limit = ledger.chargeSemantic(semanticObjectCount(bundle.value), pointer: "/documents") {
            return [limit]
        }
        var failures: [Problem] = []
        var byReference: [String: BundledRecipe] = [:]
        var references: [String] = []
        for (index, entry) in bundle.documents.enumerated() {
            let nested = validate(
                entry.recipe.value,
                budgets: budgets,
                ledger: ledger,
                chargeProtocolObjects: false
            )
            failures.append(contentsOf: nested.map {
                Problem(type: $0.type, pointer: prefixed($0.pointer, "/documents/\(index)/document"))
            })
            guard let digest = try? CanonicalJSON.sha256(entry.recipe.value) else {
                failures.append(invalid("/documents/\(index)/document"))
                continue
            }
            if digest != entry.sha256 {
                failures.append(invalid("/documents/\(index)/sha256"))
            }
            let reference = recipeReference(entry.recipe, sha256: entry.sha256)
            if byReference[reference] != nil {
                failures.append(invalid("/documents/\(index)"))
            }
            byReference[reference] = entry
            references.append(reference)
        }
        guard failures.isEmpty else { return ProblemNormalizer.normalize(failures) }

        let rootReference = recipeReference(bundle.root)
        if references.first != rootReference { failures.append(invalid("/documents/0")) }
        if references.count > 2 {
            for index in 2..<references.count where references[index - 1] >= references[index] {
                failures.append(invalid("/documents/\(index)"))
            }
        }
        guard let root = references.first.flatMap({ byReference[$0] }) else {
            failures.append(problem(ProblemType.unresolvedReference, "/root"))
            return ProblemNormalizer.normalize(failures)
        }

        var reachable = Set<String>()
        var visiting = Set<String>()
        func visit(_ entry: BundledRecipe) {
            let ownReference = recipeReference(entry.recipe, sha256: entry.sha256)
            if visiting.contains(ownReference) {
                failures.append(problem(ProblemType.componentCycle, "/documents"))
                return
            }
            guard !reachable.contains(ownReference) else { return }
            visiting.insert(ownReference)
            reachable.insert(ownReference)
            for component in entry.recipe.components {
                guard let recipe = component["recipe"] else { continue }
                let reference = recipeReference(recipe)
                guard let child = byReference[reference] else {
                    failures.append(problem(ProblemType.unresolvedReference, "/documents"))
                    continue
                }
                visit(child)
            }
            visiting.remove(ownReference)
        }
        visit(root)
        if reachable.count != bundle.documents.count { failures.append(invalid("/documents")) }
        return ProblemNormalizer.normalize(failures)
    }

    private struct MethodEntry {
        let kind: String
        let id: String
        let pointer: String
        let value: SchemamiValue
    }

    private static func validateLanguageAndOrigin(_ document: SchemamiValue, into failures: inout [Problem]) {
        if let language = document[member: "content_language"]?.stringValue,
           !isWellFormedBCP47(language) {
            failures.append(invalid("/content_language"))
        }
        if let origin = document[member: "origin"],
           let country = origin[member: "country"]?.stringValue,
           let subdivision = origin[member: "subdivision"]?.stringValue,
           !subdivision.hasPrefix(country + "-") {
            failures.append(invalid("/origin/subdivision"))
        }
    }

    private static func isWellFormedBCP47(_ value: String) -> Bool {
        let lower = value.lowercased()
        let grandfathered: Set<String> = [
            "art-lojban", "cel-gaulish", "en-gb-oed", "i-ami", "i-bnn", "i-default", "i-enochian",
            "i-hak", "i-klingon", "i-lux", "i-mingo", "i-navajo", "i-pwn", "i-tao", "i-tay", "i-tsu",
            "no-bok", "no-nyn", "sgn-be-fr", "sgn-be-nl", "sgn-ch-de", "zh-guoyu", "zh-hakka",
            "zh-min", "zh-min-nan", "zh-xiang",
        ]
        if grandfathered.contains(lower) { return true }
        guard !value.isEmpty, value.count <= 255 else { return false }
        let parts = value.split(separator: "-", omittingEmptySubsequences: false).map(String.init)
        guard !parts.contains(where: \.isEmpty) else { return false }
        func alpha(_ part: String, _ range: ClosedRange<Int>) -> Bool { range.contains(part.count) && part.allSatisfy(\.isLetter) }
        func alnum(_ part: String, _ range: ClosedRange<Int>) -> Bool { range.contains(part.count) && part.allSatisfy { $0.isLetter || $0.isNumber } }
        if parts[0].lowercased() == "x" { return parts.count > 1 && parts.dropFirst().allSatisfy { alnum($0, 1...8) } }
        var index = 0
        if alpha(parts[index], 2...3) {
            index += 1
            var extlangs = 0
            while index < parts.count, extlangs < 3, alpha(parts[index], 3...3) { index += 1; extlangs += 1 }
        } else if alpha(parts[index], 4...4) || alpha(parts[index], 5...8) { index += 1 }
        else { return false }
        if index < parts.count, alpha(parts[index], 4...4) { index += 1 }
        if index < parts.count, alpha(parts[index], 2...2) || (parts[index].count == 3 && parts[index].allSatisfy(\.isNumber)) { index += 1 }
        while index < parts.count {
            let part = parts[index]
            let variant = alnum(part, 5...8) || (part.count == 4 && part.first?.isNumber == true && part.dropFirst().allSatisfy { $0.isLetter || $0.isNumber })
            guard variant else { break }
            index += 1
        }
        var singletons = Set<String>()
        while index < parts.count, parts[index].count == 1, parts[index].lowercased() != "x" {
            let singleton = parts[index].lowercased()
            guard alnum(singleton, 1...1), singletons.insert(singleton).inserted else { return false }
            index += 1
            let start = index
            while index < parts.count, alnum(parts[index], 2...8) { index += 1 }
            guard index > start else { return false }
        }
        if index < parts.count, parts[index].lowercased() == "x" {
            index += 1
            let start = index
            while index < parts.count, alnum(parts[index], 1...8) { index += 1 }
            guard index > start else { return false }
        }
        return index == parts.count
    }

    private static func namedCollections(
        _ document: SchemamiValue,
        into failures: inout [Problem]
    ) -> [String: [String: SchemamiValue]] {
        var result: [String: [String: SchemamiValue]] = [:]
        for name in ["parameters", "ingredients", "components", "preparations", "outputs", "techniques", "equipment", "formulas", "sources", "evidence"] {
            var collection: [String: SchemamiValue] = [:]
            for (index, item) in (document[member: name]?.arrayValue ?? []).enumerated() {
                guard let id = item[member: "id"]?.stringValue else { continue }
                if collection[id] != nil { failures.append(invalid("/\(name)/\(index)/id")) }
                collection[id] = item
            }
            result[name] = collection
        }
        return result
    }

    private static func validateParameters(
        _ document: SchemamiValue,
        collections: [String: [String: SchemamiValue]],
        into failures: inout [Problem]
    ) {
        for (index, parameter) in (document[member: "parameters"]?.arrayValue ?? []).enumerated() {
            switch parameter[member: "kind"]?.stringValue {
            case "choice":
                var seen = Set<String>()
                let options = parameter[member: "options"]?.arrayValue ?? []
                for (optionIndex, option) in options.enumerated() {
                    guard let id = option[member: "id"]?.stringValue else { continue }
                    if !seen.insert(id).inserted { failures.append(invalid("/parameters/\(index)/options/\(optionIndex)/id")) }
                }
                if let defaultID = parameter[member: "default"]?.stringValue, !seen.contains(defaultID) {
                    failures.append(invalid("/parameters/\(index)/default"))
                }
            case "measurement":
                if let defaultValue = parameter[member: "default"],
                   let defaultUnit = defaultValue[member: "unit"]?.stringValue,
                   let unit = parameter[member: "unit"]?.stringValue,
                   !unitsCompatible(defaultUnit, unit) {
                    failures.append(invalid("/parameters/\(index)/default/unit"))
                }
            default: break
            }
        }
        _ = collections
    }

    private static func validateIngredientAlternatives(_ document: SchemamiValue, into failures: inout [Problem]) {
        for (index, ingredient) in (document[member: "ingredients"]?.arrayValue ?? []).enumerated() {
            guard let alternatives = ingredient[member: "alternatives"] else { continue }
            var seen = Set<String>()
            for (optionIndex, option) in (alternatives[member: "options"]?.arrayValue ?? []).enumerated() {
                guard let id = option[member: "id"]?.stringValue else { continue }
                if !seen.insert(id).inserted { failures.append(invalid("/ingredients/\(index)/alternatives/options/\(optionIndex)/id")) }
            }
            if let defaultID = alternatives[member: "default"]?.stringValue, !seen.contains(defaultID) {
                failures.append(invalid("/ingredients/\(index)/alternatives/default"))
            }
        }
    }

    private static func collectMethod(
        _ document: SchemamiValue,
        budgets: ResourceBudgets,
        into failures: inout [Problem]
    ) -> [MethodEntry] {
        struct Frame { let value: SchemamiValue; let pointer: String; let depth: Int }
        let roots = document[member: "method"]?[member: "sequence"]?.arrayValue ?? []
        var stack = roots.enumerated().reversed().map { Frame(value: $0.element, pointer: "/method/sequence/\($0.offset)", depth: 1) }
        var entries: [MethodEntry] = []
        var seen: [String: String] = [:]
        while let current = stack.popLast() {
            guard current.depth <= budgets.recursiveLevels else {
                failures.append(problem(ProblemType.resourceLimit, current.pointer)); continue
            }
            guard let kind = current.value[member: "kind"]?.stringValue,
                  let id = current.value[member: "id"]?.stringValue else { continue }
            if seen[id] != nil { failures.append(invalid(current.pointer + "/id")) }
            else { seen[id] = current.pointer }
            entries.append(MethodEntry(kind: kind, id: id, pointer: current.pointer, value: current.value))
            if kind == "section" {
                let children = current.value[member: "sequence"]?.arrayValue ?? []
                stack.append(contentsOf: children.enumerated().reversed().map {
                    Frame(value: $0.element, pointer: current.pointer + "/sequence/\($0.offset)", depth: current.depth + 1)
                })
            }
        }
        return entries
    }

    private static func validateMethod(
        _ entries: [MethodEntry],
        collections: [String: [String: SchemamiValue]],
        budgets: ResourceBudgets,
        into failures: inout [Problem]
    ) {
        var steps: [String: MethodEntry] = [:]
        for entry in entries where entry.kind == "step" { if steps[entry.id] == nil { steps[entry.id] = entry } }
        for entry in entries {
            if let timing = entry.value[member: "relative_timing"],
               let anchor = timing[member: "anchor_step"]?.stringValue {
                if steps[anchor] == nil || anchor == entry.id {
                    failures.append(invalid(entry.pointer + "/relative_timing/anchor_step"))
                }
            }
            guard entry.kind == "step" else { continue }
            for (index, dependency) in strings(entry.value[member: "after"]).enumerated() where dependency == entry.id || steps[dependency] == nil {
                failures.append(invalid(entry.pointer + "/after/\(index)"))
            }
            if let duration = entry.value[member: "duration"], !durationOrdered(duration) {
                failures.append(invalid(entry.pointer + "/duration"))
            }
            validateMethodReferences(entry, collections: collections, into: &failures)
            validateActions(entry, collections: collections, into: &failures)
            validateCompletionDepth(entry, budgets: budgets, into: &failures)
        }
    }

    private static func validateCompletionDepth(_ entry: MethodEntry, budgets: ResourceBudgets, into failures: inout [Problem]) {
        struct Frame { let value: SchemamiValue; let pointer: String; let depth: Int }
        var roots: [(SchemamiValue, String)] = []
        if let completion = entry.value[member: "completion"] { roots.append((completion, entry.pointer + "/completion")) }
        for (index, action) in (entry.value[member: "actions"]?.arrayValue ?? []).enumerated() {
            if let completion = action[member: "completion"] { roots.append((completion, entry.pointer + "/actions/\(index)/completion")) }
        }
        for root in roots {
            var stack = [Frame(value: root.0, pointer: root.1, depth: 1)]
            while let current = stack.popLast() {
                guard current.depth <= budgets.recursiveLevels else {
                    failures.append(problem(ProblemType.resourceLimit, current.pointer)); continue
                }
                for (index, condition) in (current.value[member: "conditions"]?.arrayValue ?? []).enumerated() {
                    stack.append(Frame(value: condition, pointer: current.pointer + "/conditions/\(index)", depth: current.depth + 1))
                }
            }
        }
    }

    private static func validateMethodReferences(
        _ entry: MethodEntry,
        collections: [String: [String: SchemamiValue]],
        into failures: inout [Problem]
    ) {
        for field in ["uses", "produces"] {
            for (index, reference) in (entry.value[member: field]?.arrayValue ?? []).enumerated()
            where !resourceExists(reference, field: field, collections: collections) {
                failures.append(invalid(entry.pointer + "/\(field)/\(index)"))
            }
        }
        for field in ["techniques", "equipment"] {
            for (index, id) in strings(entry.value[member: field]).enumerated() where collections[field]?[id] == nil {
                failures.append(invalid(entry.pointer + "/\(field)/\(index)"))
            }
        }
    }

    private static func validateActions(
        _ entry: MethodEntry,
        collections: [String: [String: SchemamiValue]],
        into failures: inout [Problem]
    ) {
        let stepUses = Set((entry.value[member: "uses"]?.arrayValue ?? []).map(referenceKey))
        let stepProduces = Set((entry.value[member: "produces"]?.arrayValue ?? []).map(referenceKey))
        var seen = Set<String>()
        for (index, action) in (entry.value[member: "actions"]?.arrayValue ?? []).enumerated() {
            if let id = action[member: "id"]?.stringValue, !seen.insert(id).inserted {
                failures.append(invalid(entry.pointer + "/actions/\(index)/id"))
            }
            for field in ["uses", "produces"] {
                let authority = field == "uses" ? stepUses : stepProduces
                for (referenceIndex, reference) in (action[member: field]?.arrayValue ?? []).enumerated() {
                    let pointer = entry.pointer + "/actions/\(index)/\(field)/\(referenceIndex)"
                    if !resourceExists(reference, field: field, collections: collections) || !authority.contains(referenceKey(reference)) {
                        failures.append(invalid(pointer))
                    }
                }
            }
            for field in ["techniques", "equipment"] {
                for (referenceIndex, id) in strings(action[member: field]).enumerated() where collections[field]?[id] == nil {
                    failures.append(invalid(entry.pointer + "/actions/\(index)/\(field)/\(referenceIndex)"))
                }
            }
        }
    }

    private static func validateFormulas(
        _ document: SchemamiValue,
        collections: [String: [String: SchemamiValue]],
        into failures: inout [Problem]
    ) {
        var claimed: [String: String] = [:]
        for (formulaIndex, formula) in (document[member: "formulas"]?.arrayValue ?? []).enumerated() {
            let formulaID = formula[member: "id"]?.stringValue ?? ""
            let basisKey = formula[member: "basis"].map(referenceKey)
            if let basis = formula[member: "basis"], !inputExists(basis, collections: collections) {
                failures.append(invalid("/formulas/\(formulaIndex)/basis"))
            }
            var seen = Set<String>()
            var basisIndex: Int?
            let terms = formula[member: "terms"]?.arrayValue ?? []
            for (termIndex, term) in terms.enumerated() {
                guard let input = term[member: "input"] else { continue }
                let key = referenceKey(input)
                if !inputExists(input, collections: collections) { failures.append(invalid("/formulas/\(formulaIndex)/terms/\(termIndex)/input")) }
                if !seen.insert(key).inserted || claimed[key] != nil { failures.append(invalid("/formulas/\(formulaIndex)/terms/\(termIndex)/input")) }
                claimed[key] = formulaID
                if let kind = input[member: "kind"]?.stringValue,
                   let id = input[member: "id"]?.stringValue,
                   collections[kind + "s"]?[id]?[member: "quantity"] != nil {
                    failures.append(invalid("/formulas/\(formulaIndex)/terms/\(termIndex)/input"))
                }
                if key == basisKey { basisIndex = termIndex }
            }
            if formula[member: "kind"]?.stringValue == "percentage" {
                guard let basisIndex else { failures.append(invalid("/formulas/\(formulaIndex)/basis")); continue }
                if terms[basisIndex][member: "percentage"]?.stringValue != "100" {
                    failures.append(invalid("/formulas/\(formulaIndex)/terms/\(basisIndex)/percentage"))
                }
            }
        }
        for (index, component) in (document[member: "components"]?.arrayValue ?? []).enumerated() {
            guard let id = component[member: "id"]?.stringValue else { continue }
            let hasFormula = claimed["component\u{0}\(id)"] != nil
            let hasExplicit = component[member: "quantity"] != nil
            if hasFormula == hasExplicit { failures.append(invalid("/components/\(index)")) }
        }
    }

    private static func validateActivationSites(
        _ document: SchemamiValue,
        method: [MethodEntry],
        collections: [String: [String: SchemamiValue]],
        budgets: ResourceBudgets,
        into failures: inout [Problem]
    ) {
        var sites: [(SchemamiValue, String)] = []
        for collection in ["ingredients", "components", "equipment"] {
            for (index, object) in (document[member: collection]?.arrayValue ?? []).enumerated() {
                if let activation = object[member: "activation"] { sites.append((activation, "/\(collection)/\(index)/activation")) }
            }
        }
        for entry in method {
            if let activation = entry.value[member: "activation"] { sites.append((activation, entry.pointer + "/activation")) }
            for (index, action) in (entry.value[member: "actions"]?.arrayValue ?? []).enumerated() {
                if let activation = action[member: "activation"] { sites.append((activation, entry.pointer + "/actions/\(index)/activation")) }
            }
        }
        for site in sites { validateActivation(site.0, pointer: site.1, depth: 1, parameters: collections["parameters"] ?? [:], budgets: budgets, into: &failures) }
    }

    private static func validateActivation(
        _ activation: SchemamiValue,
        pointer: String,
        depth: Int,
        parameters: [String: SchemamiValue],
        budgets: ResourceBudgets,
        into failures: inout [Problem]
    ) {
        guard depth <= budgets.recursiveLevels else { failures.append(problem(ProblemType.resourceLimit, pointer)); return }
        guard let kind = activation[member: "kind"]?.stringValue else { return }
        if ["choice_is", "toggle_is", "measurement_compare"].contains(kind) {
            guard let id = activation[member: "parameter"]?.stringValue, let parameter = parameters[id] else {
                failures.append(invalid(pointer + "/parameter")); return
            }
            let expected = ["choice_is": "choice", "toggle_is": "toggle", "measurement_compare": "measurement"][kind]
            if parameter[member: "kind"]?.stringValue != expected { failures.append(invalid(pointer)) }
            if kind == "choice_is", let option = activation[member: "option"]?.stringValue,
               !(parameter[member: "options"]?.arrayValue ?? []).contains(where: { $0[member: "id"]?.stringValue == option }) {
                failures.append(invalid(pointer + "/option"))
            }
            if kind == "measurement_compare",
               let left = activation[member: "measurement"]?[member: "unit"]?.stringValue,
               let right = parameter[member: "unit"]?.stringValue,
               !unitsCompatible(left, right) { failures.append(invalid(pointer + "/measurement/unit")) }
        } else if kind == "all" || kind == "any" {
            for (index, condition) in (activation[member: "conditions"]?.arrayValue ?? []).enumerated() {
                validateActivation(condition, pointer: pointer + "/conditions/\(index)", depth: depth + 1, parameters: parameters, budgets: budgets, into: &failures)
            }
        } else if kind == "not", let condition = activation[member: "condition"] {
            validateActivation(condition, pointer: pointer + "/condition", depth: depth + 1, parameters: parameters, budgets: budgets, into: &failures)
        }
    }

    private static func validateSourcesAndEvidence(
        _ document: SchemamiValue,
        collections: [String: [String: SchemamiValue]],
        into failures: inout [Problem]
    ) {
        let sources = collections["sources"] ?? [:]
        for (index, source) in (document[member: "sources"]?.arrayValue ?? []).enumerated() {
            if let mediaType = source[member: "media_type"]?.stringValue, !validMediaType(mediaType) {
                failures.append(invalid("/sources/\(index)/media_type"))
            }
        }
        for (index, evidence) in (document[member: "evidence"]?.arrayValue ?? []).enumerated() {
            if let source = evidence[member: "source"]?.stringValue, sources[source] == nil {
                failures.append(invalid("/evidence/\(index)/source"))
            }
            if let raw = evidence[member: "pointer"]?.stringValue,
               JSONPointer(rawValue: raw)?.resolve(in: document) == nil {
                failures.append(invalid("/evidence/\(index)/pointer"))
            }
            if let selector = evidence[member: "selector"],
               selector[member: "conforms_to"]?.stringValue == "https://www.w3.org/TR/media-frags/",
               let value = selector[member: "value"]?.stringValue,
               !validMediaFragment(value) {
                failures.append(invalid("/evidence/\(index)/selector/value"))
            }
        }
    }

    private static func validMediaType(_ value: String) -> Bool {
        let pattern = #"^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+(?:\s*;\s*[A-Za-z0-9!#$&^_.+-]+=(?:[A-Za-z0-9!#$&^_.+-]+|\"[^\"]*\"))*$"#
        return value.range(of: pattern, options: .regularExpression) != nil
    }

    private static func validateQuantities(_ document: SchemamiValue, into failures: inout [Problem]) {
        walk(document) { value, pointer in
            guard let kind = value[member: "kind"]?.stringValue, ["measured", "range", "open"].contains(kind) else { return }
            if kind == "measured" || kind == "range", let unit = value[member: "unit"]?.stringValue, knownUnitDimensions[unit] == nil {
                failures.append(invalid(pointer + "/unit"))
            }
            if kind == "range", let minimum = exactDecimal(value[member: "minimum"]), let maximum = exactDecimal(value[member: "maximum"]), minimum > maximum {
                failures.append(invalid(pointer))
            }
        }
    }

    private static func durationOrdered(_ value: SchemamiValue) -> Bool {
        guard let minimum = value[member: "minimum"]?.stringValue,
              let maximum = value[member: "maximum"]?.stringValue else { return true }
        guard let left = durationSeconds(minimum), let right = durationSeconds(maximum) else { return false }
        return left <= right
    }

    private static func durationSeconds(_ raw: String) -> Decimal? {
        let pattern = #"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: raw, range: NSRange(raw.startIndex..., in: raw)) else { return nil }
        func value(_ index: Int) -> Decimal {
            let range = match.range(at: index)
            guard range.location != NSNotFound, let swiftRange = Range(range, in: raw) else { return 0 }
            return Decimal(string: String(raw[swiftRange]), locale: Locale(identifier: "en_US_POSIX")) ?? 0
        }
        return value(1) * 3600 + value(2) * 60 + value(3)
    }

    private static func validMediaFragment(_ value: String) -> Bool {
        for component in value.split(separator: "&") where component.hasPrefix("t=") {
            var range = String(component.dropFirst(2))
            if range.hasPrefix("npt:") { range.removeFirst(4) }
            let parts = range.split(separator: ",", omittingEmptySubsequences: false)
            guard (1...2).contains(parts.count), parts.count != 2 || !parts[1].isEmpty else { return false }
            let start = parts[0].isEmpty ? nil : nptSeconds(String(parts[0]))
            let end = parts.count == 2 ? nptSeconds(String(parts[1])) : nil
            if !parts[0].isEmpty && start == nil { return false }
            if parts.count == 2 && end == nil { return false }
            if start == nil && end == nil { return false }
            if let start, let end, start >= end { return false }
        }
        return true
    }

    private static func nptSeconds(_ value: String) -> Decimal? {
        let parts = value.split(separator: ":", omittingEmptySubsequences: false)
        guard (1...3).contains(parts.count) else { return nil }
        if parts.count == 1 { return Decimal(string: value, locale: Locale(identifier: "en_US_POSIX")) }
        guard let seconds = Decimal(string: String(parts.last!), locale: Locale(identifier: "en_US_POSIX")),
              let minutes = Decimal(string: String(parts[parts.count - 2]), locale: Locale(identifier: "en_US_POSIX")),
              minutes <= 59, seconds < 60 else { return nil }
        var result = minutes * 60 + seconds
        if parts.count == 3, let hours = Decimal(string: String(parts[0]), locale: Locale(identifier: "en_US_POSIX")) { result += hours * 3600 }
        return result
    }

    fileprivate static func unitsCompatible(_ left: String, _ right: String) -> Bool {
        knownUnitDimensions[left] != nil && knownUnitDimensions[left] == knownUnitDimensions[right]
    }

    fileprivate static func convert(_ value: ExactRational, from source: String, to target: String) -> ExactRational? {
        guard unitsCompatible(source, target) else { return nil }
        if source == target { return value }
        if source == "Cel" && target == "[degF]" { return value * ExactRational(9, 5) + ExactRational(32) }
        if source == "[degF]" && target == "Cel" { return (value - ExactRational(32)) * ExactRational(5, 9) }
        let factors: [String: ExactRational] = [
            "1": ExactRational(1), "g": ExactRational(1), "kg": ExactRational(1000),
            "mL": ExactRational(1), "L": ExactRational(1000),
            "[cup_us]": ExactRational(2_365_882_365, 10_000_000),
            "[tbs_us]": ExactRational(295_735_295_625, 20_000_000_000),
            "[tsp_us]": ExactRational(295_735_295_625, 60_000_000_000),
            "[foz_us]": ExactRational(295_735_295_625, 10_000_000_000),
            "[cup_m]": ExactRational(240),
        ]
        guard let sourceFactor = factors[source], let targetFactor = factors[target] else { return nil }
        return value * sourceFactor / targetFactor
    }

    fileprivate static func exactDecimal(_ value: SchemamiValue?) -> ExactRational? {
        guard let raw = value?.stringValue else { return nil }
        return ExactRational(decimal: raw)
    }

    fileprivate static func strings(_ value: SchemamiValue?) -> [String] {
        value?.arrayValue?.compactMap(\.stringValue) ?? []
    }

    fileprivate static func referenceKey(_ reference: SchemamiValue) -> String {
        (reference[member: "kind"]?.stringValue ?? "") + "\u{0}" + (reference[member: "id"]?.stringValue ?? "")
    }

    private static func resourceExists(_ reference: SchemamiValue, field: String, collections: [String: [String: SchemamiValue]]) -> Bool {
        guard let kind = reference[member: "kind"]?.stringValue, let id = reference[member: "id"]?.stringValue else { return false }
        let collection = kind == "preparation" ? "preparations" : (kind == "output" && field == "produces" ? "outputs" : kind + "s")
        return collections[collection]?[id] != nil
    }

    private static func inputExists(_ reference: SchemamiValue, collections: [String: [String: SchemamiValue]]) -> Bool {
        guard let kind = reference[member: "kind"]?.stringValue, let id = reference[member: "id"]?.stringValue else { return false }
        return collections[kind + "s"]?[id] != nil
    }

    fileprivate static func semanticObjectCount(_ value: SchemamiValue) -> Int {
        var count = 0
        var stack = [value]
        while let current = stack.popLast() {
            switch current {
            case .object(let members):
                count += 1
                stack.append(contentsOf: members.filter { !$0.name.hasPrefix("x-") }.map(\.value))
            case .array(let values): stack.append(contentsOf: values)
            default: break
            }
        }
        return count
    }

    private static func walk(_ root: SchemamiValue, visit: (SchemamiValue, String) -> Void) {
        var stack: [(SchemamiValue, String)] = [(root, "")]
        while let (value, pointer) = stack.popLast() {
            visit(value, pointer)
            switch value {
            case .object(let members):
                stack.append(contentsOf: members.reversed().filter { !$0.name.hasPrefix("x-") }.map { ($0.value, pointer + "/" + escape($0.name)) })
            case .array(let values):
                stack.append(contentsOf: values.enumerated().reversed().map { ($0.element, pointer + "/\($0.offset)") })
            default: break
            }
        }
    }

    private static func escape(_ token: String) -> String { token.replacingOccurrences(of: "~", with: "~0").replacingOccurrences(of: "/", with: "~1") }
    private static func invalid(_ pointer: String = "") -> Problem { problem(ProblemType.invalidDocument, pointer) }
    fileprivate static func problem(_ type: String, _ pointer: String = "") -> Problem { Problem(type: type, pointer: JSONPointer(rawValue: pointer) ?? .root) }

    private static func prefixed(_ pointer: JSONPointer, _ prefix: String) -> JSONPointer {
        JSONPointer(rawValue: prefix + pointer.rawValue) ?? .root
    }

    private static func recipeReference(_ recipe: Recipe, sha256: String) -> String {
        "\(recipe.collection)\u{0}\(recipe.id)\u{0}\(String(format: "%020d", recipe.revision))\u{0}\(sha256)"
    }

    private static func recipeReference(_ reference: RecipeReference) -> String {
        "\(reference.collection)\u{0}\(reference.id)\u{0}\(String(format: "%020d", reference.revision))\u{0}\(reference.sha256)"
    }

    private static func recipeReference(_ value: SchemamiValue) -> String {
        let collection = value[member: "collection"]?.stringValue ?? ""
        let id = value[member: "id"]?.stringValue ?? ""
        let revision = value[member: "revision"]?.integerValue ?? 0
        let digest = value[member: "sha256"]?.stringValue ?? ""
        return "\(collection)\u{0}\(id)\u{0}\(String(format: "%020d", revision))\u{0}\(digest)"
    }
}

private enum ReachableGraphAdmission {
    private struct Node {
        let kind: String
        let id: String
        let value: SchemamiValue
        let active: Bool
    }

    static func validate(
        _ recipe: SchemamiValue,
        collections: [String: [String: SchemamiValue]],
        ledger: AdmissionResourceLedger
    ) -> [Problem] {
        let usedParameters = activationParameterIDs(recipe)
        let parameters = (recipe[member: "parameters"]?.arrayValue ?? []).filter {
            guard let id = $0[member: "id"]?.stringValue else { return false }
            return usedParameters.contains(id)
        }
        let candidates = parameters.map { parameterCandidates(recipe, parameter: $0) }
        guard candidates.allSatisfy({ !$0.isEmpty }) else {
            return [SemanticAdmission.problem(ProblemType.invalidDocument, "/parameters")]
        }
        let objectCount = max(1, SemanticAdmission.semanticObjectCount(recipe))
        var alternatives: [String: SchemamiValue] = [:]
        for ingredient in recipe[member: "ingredients"]?.arrayValue ?? [] {
            guard let id = ingredient[member: "id"]?.stringValue,
                  let declared = ingredient[member: "alternatives"] else { continue }
            if let value = declared[member: "default"] { alternatives[id] = value }
            else { alternatives[id] = declared[member: "options"]?.arrayValue?.first?[member: "id"] }
        }

        var distinct = Set<String>()
        var partialStates = Set<String>()
        var bindings: [String: SchemamiValue] = [:]
        var failures: [Problem] = []
        var exhausted = false
        func explore(_ index: Int) {
            guard !exhausted else { return }
            let state = "\(index)|\(residualActivationSignature(recipe, bindings: bindings))"
            guard partialStates.insert(state).inserted else { return }
            if let limit = ledger.chargeAnalysisState() {
                failures.append(limit); exhausted = true; return
            }
            if index < parameters.count {
                guard let id = parameters[index][member: "id"]?.stringValue else { return }
                for candidate in candidates[index] {
                    bindings[id] = candidate; explore(index + 1)
                }
                bindings.removeValue(forKey: id)
                return
            }
            let nodes = activeMethod(recipe, bindings: bindings)
            let signature = graphSignature(recipe, nodes: nodes, bindings: bindings)
            guard distinct.insert(signature).inserted else { return }
            if let limit = ledger.chargeSemantic(objectCount) {
                failures.append(limit); exhausted = true; return
            }
            failures.append(contentsOf: validateActiveGraph(recipe, nodes: nodes, collections: collections, bindings: bindings))
        }
        explore(0)
        _ = alternatives
        return ProblemNormalizer.normalize(failures)
    }

    private static func residualActivationSignature(
        _ recipe: SchemamiValue,
        bindings: [String: SchemamiValue]
    ) -> String {
        normativeActivations(recipe).map { residualActivation($0, bindings: bindings) }.joined(separator: ";")
    }

    private static func residualActivation(
        _ activation: SchemamiValue,
        bindings: [String: SchemamiValue]
    ) -> String {
        guard let kind = activation[member: "kind"]?.stringValue else { return "invalid" }
        if ["choice_is", "toggle_is", "measurement_compare"].contains(kind) {
            guard let parameter = activation[member: "parameter"]?.stringValue else { return "invalid" }
            guard let bound = bindings[parameter] else {
                switch kind {
                case "choice_is":
                    return "choice(\(parameter)=\(activation[member: "option"]?.stringValue ?? ""))"
                case "toggle_is":
                    return activation[member: "enabled"] == .boolean(false)
                        ? "!toggle(\(parameter))" : "toggle(\(parameter))"
                default:
                    let measurement = activation[member: "measurement"]
                    return "measure(\(parameter),\(activation[member: "operator"]?.stringValue ?? ""),\(measurement?[member: "value"]?.stringValue ?? ""),\(measurement?[member: "unit"]?.stringValue ?? ""))"
                }
            }
            guard let value = residualLeafValue(kind, bound: bound, activation: activation) else { return "invalid" }
            return value ? "1" : "0"
        }
        if kind == "not" {
            guard let condition = activation[member: "condition"] else { return "invalid" }
            let value = residualActivation(condition, bindings: bindings)
            if value == "1" { return "0" }
            if value == "0" { return "1" }
            if value.hasPrefix("!") { return String(value.dropFirst()) }
            return "!(\(value))"
        }
        if kind == "all" || kind == "any" {
            let identity = kind == "all" ? "1" : "0"
            let absorbing = kind == "all" ? "0" : "1"
            var children = Set<String>()
            for condition in activation[member: "conditions"]?.arrayValue ?? [] {
                let value = residualActivation(condition, bindings: bindings)
                if value == absorbing { return absorbing }
                if value != identity { children.insert(value) }
            }
            if children.isEmpty { return identity }
            if children.count == 1 { return children.first! }
            return "\(kind)(\(children.sorted().joined(separator: ",")))"
        }
        return "invalid"
    }

    private static func residualLeafValue(
        _ kind: String,
        bound: SchemamiValue,
        activation: SchemamiValue
    ) -> Bool? {
        switch kind {
        case "choice_is": return bound == activation[member: "option"]
        case "toggle_is": return bound == activation[member: "enabled"]
        case "measurement_compare":
            guard let left = SemanticAdmission.exactDecimal(bound[member: "value"]),
                  let boundUnit = bound[member: "unit"]?.stringValue,
                  let measurement = activation[member: "measurement"],
                  let rightRaw = SemanticAdmission.exactDecimal(measurement[member: "value"]),
                  let measurementUnit = measurement[member: "unit"]?.stringValue,
                  let right = SemanticAdmission.convert(rightRaw, from: measurementUnit, to: boundUnit)
            else { return nil }
            switch activation[member: "operator"]?.stringValue {
            case "equal": return left == right
            case "less_than": return left < right
            case "less_than_or_equal": return left <= right
            case "greater_than": return left > right
            case "greater_than_or_equal": return left >= right
            default: return nil
            }
        default: return nil
        }
    }

    private static func activationParameterIDs(_ recipe: SchemamiValue) -> Set<String> {
        var result = Set<String>(); var stack = normativeActivations(recipe)
        while let current = stack.popLast() {
            switch current {
            case .array(let values): stack.append(contentsOf: values)
            case .object(let members):
                if let kind = current[member: "kind"]?.stringValue,
                   ["choice_is", "toggle_is", "measurement_compare"].contains(kind),
                   let parameter = current[member: "parameter"]?.stringValue {
                    result.insert(parameter)
                }
                stack.append(contentsOf: members.map(\.value))
            default: break
            }
        }
        return result
    }

    private static func normativeActivations(_ recipe: SchemamiValue) -> [SchemamiValue] {
        var result: [SchemamiValue] = []
        func append(_ object: SchemamiValue) {
            if let activation = object[member: "activation"] { result.append(activation) }
        }
        for collection in ["ingredients", "components", "equipment"] {
            for object in recipe[member: collection]?.arrayValue ?? [] { append(object) }
        }
        var nodes = recipe[member: "method"]?[member: "sequence"]?.arrayValue ?? []
        while let node = nodes.popLast() {
            append(node)
            for action in node[member: "actions"]?.arrayValue ?? [] { append(action) }
            nodes.append(contentsOf: node[member: "sequence"]?.arrayValue ?? [])
        }
        return result
    }

    private static func parameterCandidates(_ recipe: SchemamiValue, parameter: SchemamiValue) -> [SchemamiValue] {
        switch parameter[member: "kind"]?.stringValue {
        case "choice": return (parameter[member: "options"]?.arrayValue ?? []).compactMap { $0[member: "id"] }
        case "toggle": return [.boolean(false), .boolean(true)]
        case "measurement":
            guard let id = parameter[member: "id"]?.stringValue else { return [] }
            let thresholds = measurementThresholds(recipe, parameter: id)
            if thresholds.isEmpty {
                if let value = parameter[member: "default"] { return [value] }
                return [.object([
                    SchemamiMember(name: "kind", value: .string("measured")),
                    SchemamiMember(name: "value", value: .string("0")),
                    SchemamiMember(name: "unit", value: parameter[member: "unit"] ?? .string("1")),
                ])]
            }
            var result: [SchemamiValue] = []
            var seen = Set<String>()
            for threshold in thresholds {
                guard let raw = threshold[member: "value"]?.stringValue,
                      let base = ExactRational(decimal: raw),
                      let unit = threshold[member: "unit"]?.stringValue else { continue }
                for candidate in [base - ExactRational(1, 10_000), base, base + ExactRational(1, 10_000)] {
                    guard let formatted = candidate.canonicalDecimal(maxFractionDigits: 4) else { continue }
                    guard seen.insert(unit + "\u{0}" + formatted).inserted else { continue }
                    result.append(.object([
                        SchemamiMember(name: "kind", value: .string("measured")),
                        SchemamiMember(name: "value", value: .string(formatted)),
                        SchemamiMember(name: "unit", value: .string(unit)),
                    ]))
                }
            }
            return result
        default: return []
        }
    }

    private static func measurementThresholds(_ root: SchemamiValue, parameter: String) -> [SchemamiValue] {
        var result: [SchemamiValue] = []
        var stack = normativeActivations(root)
        while let current = stack.popLast() {
            if current[member: "kind"]?.stringValue == "measurement_compare",
               current[member: "parameter"]?.stringValue == parameter,
               let measurement = current[member: "measurement"] { result.append(measurement) }
            switch current {
            case .object(let members): stack.append(contentsOf: members.map(\.value))
            case .array(let values): stack.append(contentsOf: values)
            default: break
            }
        }
        return result
    }

    private static func activeMethod(_ recipe: SchemamiValue, bindings: [String: SchemamiValue]) -> [Node] {
        struct Frame { let value: SchemamiValue; let parentActive: Bool }
        let roots = recipe[member: "method"]?[member: "sequence"]?.arrayValue ?? []
        var stack = roots.reversed().map { Frame(value: $0, parentActive: true) }
        var result: [Node] = []
        while let current = stack.popLast() {
            let active = current.parentActive && isActive(current.value, bindings: bindings)
            let kind = current.value[member: "kind"]?.stringValue ?? ""
            result.append(Node(kind: kind, id: current.value[member: "id"]?.stringValue ?? "", value: current.value, active: active))
            if kind == "section" {
                let children = current.value[member: "sequence"]?.arrayValue ?? []
                stack.append(contentsOf: children.reversed().map { Frame(value: $0, parentActive: active) })
            }
        }
        return result
    }

    private static func isActive(_ object: SchemamiValue, bindings: [String: SchemamiValue]) -> Bool {
        guard let activation = object[member: "activation"] else { return true }
        return evaluate(activation, bindings: bindings) ?? false
    }

    private static func evaluate(_ activation: SchemamiValue, bindings: [String: SchemamiValue]) -> Bool? {
        switch activation[member: "kind"]?.stringValue {
        case "choice_is":
            guard let id = activation[member: "parameter"]?.stringValue else { return nil }
            return bindings[id] == activation[member: "option"]
        case "toggle_is":
            guard let id = activation[member: "parameter"]?.stringValue else { return nil }
            return bindings[id] == activation[member: "enabled"]
        case "measurement_compare":
            guard let id = activation[member: "parameter"]?.stringValue,
                  let bound = bindings[id], let left = SemanticAdmission.exactDecimal(bound[member: "value"]),
                  let boundUnit = bound[member: "unit"]?.stringValue,
                  let measurement = activation[member: "measurement"],
                  let rightRaw = SemanticAdmission.exactDecimal(measurement[member: "value"]),
                  let measurementUnit = measurement[member: "unit"]?.stringValue,
                  let right = SemanticAdmission.convert(rightRaw, from: measurementUnit, to: boundUnit)
            else { return nil }
            switch activation[member: "operator"]?.stringValue {
            case "equal": return left == right
            case "less_than": return left < right
            case "less_than_or_equal": return left <= right
            case "greater_than": return left > right
            default: return left >= right
            }
        case "all":
            for condition in activation[member: "conditions"]?.arrayValue ?? [] { guard evaluate(condition, bindings: bindings) == true else { return false } }
            return true
        case "any":
            for condition in activation[member: "conditions"]?.arrayValue ?? [] { if evaluate(condition, bindings: bindings) == true { return true } }
            return false
        case "not":
            guard let condition = activation[member: "condition"], let value = evaluate(condition, bindings: bindings) else { return nil }
            return !value
        default: return nil
        }
    }

    private static func graphSignature(_ recipe: SchemamiValue, nodes: [Node], bindings: [String: SchemamiValue]) -> String {
        var parts: [String] = []
        for collection in ["ingredients", "components", "equipment"] {
            for object in recipe[member: collection]?.arrayValue ?? [] where isActive(object, bindings: bindings) {
                parts.append(collection + ":" + (object[member: "id"]?.stringValue ?? ""))
            }
        }
        for node in nodes where node.active {
            parts.append("node:\(node.kind):\(node.id)")
            for action in node.value[member: "actions"]?.arrayValue ?? [] where isActive(action, bindings: bindings) {
                parts.append("action:\(node.id):\(action[member: "id"]?.stringValue ?? "")")
            }
            for dependency in SemanticAdmission.strings(node.value[member: "after"]) where nodes.contains(where: { $0.id == dependency && $0.active }) {
                parts.append("after:\(dependency)>\(node.id)")
            }
            for field in ["uses", "produces"] {
                for reference in node.value[member: field]?.arrayValue ?? [] { parts.append("\(field):\(node.id):\(SemanticAdmission.referenceKey(reference))") }
            }
        }
        for formula in recipe[member: "formulas"]?.arrayValue ?? [] {
            for term in formula[member: "terms"]?.arrayValue ?? [] {
                guard let input = term[member: "input"],
                      let kind = input[member: "kind"]?.stringValue,
                      let id = input[member: "id"]?.stringValue,
                      let object = recipe[member: kind + "s"]?.arrayValue?.first(where: { $0[member: "id"]?.stringValue == id }),
                      isActive(object, bindings: bindings) else { continue }
                parts.append("formula:\(formula[member: "id"]?.stringValue ?? ""):\(SemanticAdmission.referenceKey(input))")
            }
        }
        return parts.joined(separator: "|")
    }

    private static func validateActiveGraph(
        _ recipe: SchemamiValue,
        nodes: [Node],
        collections: [String: [String: SchemamiValue]],
        bindings: [String: SchemamiValue]
    ) -> [Problem] {
        var failures: [Problem] = []
        var activeResources = Set<String>()
        for collection in ["ingredients", "components", "equipment"] {
            let kind = collection == "equipment" ? "equipment" : String(collection.dropLast())
            for object in recipe[member: collection]?.arrayValue ?? [] where isActive(object, bindings: bindings) {
                activeResources.insert(kind + "\u{0}" + (object[member: "id"]?.stringValue ?? ""))
            }
        }
        for collection in ["preparations", "outputs"] {
            let kind = collection == "preparations" ? "preparation" : "output"
            for object in recipe[member: collection]?.arrayValue ?? [] { activeResources.insert(kind + "\u{0}" + (object[member: "id"]?.stringValue ?? "")) }
        }
        var edges: [String: [String]] = [:]
        var producers: [String: Int] = [:]
        var consumers: [String: Int] = [:]
        let activeIDs = Set(nodes.filter(\.active).map(\.id))
        for node in nodes where node.active {
            if let timing = node.value[member: "relative_timing"], let anchor = timing[member: "anchor_step"]?.stringValue {
                if !activeIDs.contains(anchor) { failures.append(SemanticAdmission.problem(ProblemType.inactiveReference, "/method")) }
                else if timing[member: "relation"]?.stringValue == "before" { edges[node.id, default: []].append(anchor) }
                else { edges[anchor, default: []].append(node.id) }
            }
            guard node.kind == "step" else { continue }
            if node.value[member: "actions"] != nil,
               !(node.value[member: "actions"]?.arrayValue ?? []).contains(where: { isActive($0, bindings: bindings) }) {
                failures.append(SemanticAdmission.problem(ProblemType.missingFact, "/method"))
            }
            for dependency in SemanticAdmission.strings(node.value[member: "after"]) where activeIDs.contains(dependency) {
                edges[dependency, default: []].append(node.id)
            }
            for field in ["uses", "produces"] {
                for reference in node.value[member: field]?.arrayValue ?? [] {
                    let key = SemanticAdmission.referenceKey(reference)
                    if !activeResources.contains(key) { failures.append(SemanticAdmission.problem(ProblemType.inactiveReference, "/method")); continue }
                    if field == "produces" { producers[key, default: 0] += 1 }
                    else if reference[member: "kind"]?.stringValue == "preparation" { consumers[key, default: 0] += 1 }
                }
            }
        }
        if hasCycle(edges) { failures.append(SemanticAdmission.problem(ProblemType.relativeTimingConflict, "/method")) }
        let afterEdges = Dictionary(uniqueKeysWithValues: nodes.filter { $0.active && $0.kind == "step" }.map { node in
            (node.id, SemanticAdmission.strings(node.value[member: "after"]).filter(activeIDs.contains))
        })
        if hasDependencyCycle(afterEdges) { failures.append(SemanticAdmission.problem(ProblemType.dependencyCycle, "/method")) }
        for (key, count) in producers where count > 1 { failures.append(SemanticAdmission.problem(ProblemType.multipleProducers, resourcePointer(key))) }
        for key in consumers.keys where producers[key, default: 0] == 0 { failures.append(SemanticAdmission.problem(ProblemType.missingProducer, resourcePointer(key))) }
        _ = collections
        return failures
    }

    private static func hasCycle(_ edges: [String: [String]]) -> Bool {
        var state: [String: Int] = [:]
        func visit(_ node: String) -> Bool {
            if state[node] == 1 { return true }
            if state[node] == 2 { return false }
            state[node] = 1
            for child in edges[node] ?? [] where visit(child) { return true }
            state[node] = 2
            return false
        }
        return edges.keys.contains(where: visit)
    }

    private static func hasDependencyCycle(_ dependencies: [String: [String]]) -> Bool {
        var edges: [String: [String]] = [:]
        for (node, after) in dependencies { for dependency in after { edges[dependency, default: []].append(node) } }
        return hasCycle(edges)
    }

    private static func resourcePointer(_ key: String) -> String {
        let parts = key.split(separator: "\u{0}", maxSplits: 1, omittingEmptySubsequences: false)
        guard parts.count == 2 else { return "" }
        let collection = parts[0] == "preparation" ? "preparations" : (parts[0] == "equipment" ? "equipment" : String(parts[0]) + "s")
        return "/\(collection)/\(parts[1])"
    }

}
