import BigInt
import Foundation
import SchemamiCore

enum StructuredCalculus {
    private static let base = "https://schemami.dev/problems/"

    private final class OperationResourceLedger {
        let recursiveLimit: Int
        let semanticLimit: Int
        let selectedComponentLimit: Int
        private var semanticOccurrences = 0
        private var enteredPaths = Set<String>()

        init(recursiveLimit: Int, semanticLimit: Int, selectedComponentLimit: Int) {
            self.recursiveLimit = recursiveLimit
            self.semanticLimit = semanticLimit
            self.selectedComponentLimit = selectedComponentLimit
        }

        func enter(recipe: SchemamiValue, path: String) -> Bool {
            let depth = path.isEmpty ? 1 : path.split(separator: "/").count + 1
            guard depth <= recursiveLimit else { return false }
            guard enteredPaths.insert(path).inserted else { return true }
            guard enteredPaths.count <= selectedComponentLimit else { return false }
            let (next, overflow) = semanticOccurrences.addingReportingOverflow(protocolObjectCount(recipe))
            guard !overflow, next <= semanticLimit else { return false }
            semanticOccurrences = next
            return true
        }

        private func protocolObjectCount(_ value: SchemamiValue) -> Int {
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
    }

    static func evaluate(
        operation: String,
        recipe: SchemamiValue?,
        bundle: SchemamiValue?,
        arguments: SchemamiValue,
        recursiveLimit: Int = ResourceBudgets.protocolFloor.recursiveLevels,
        semanticLimit: Int = ResourceBudgets.protocolFloor.semanticOccurrences,
        selectedComponentLimit: Int = ResourceBudgets.protocolFloor.selectedComponentInstances
    ) -> SchemamiValue {
        guard (recipe == nil) != (bundle == nil) else { return refused(operation, "invalid-operation-arguments", "") }
        let root: SchemamiValue
        if let recipe { root = recipe }
        else if let first = bundle?[member: "documents"]?.arrayValue?.first?[member: "document"] { root = first }
        else { return refused(operation, "unresolved-reference", "/bundle/documents") }
        var context = Context(
            operation: operation,
            root: root,
            bundle: bundle,
            arguments: arguments,
            resources: OperationResourceLedger(
                recursiveLimit: recursiveLimit,
                semanticLimit: semanticLimit,
                selectedComponentLimit: selectedComponentLimit
            )
        )
        if let refusal = context.validateSelections() { return refusal }
        switch operation {
        case "resolve_selection": return context.resolveSelection()
        case "resolve_formula": return context.resolveFormula()
        case "scale": return context.scale()
        case "reading_order": return context.methodProjection(schedule: false)
        case "schedule": return context.methodProjection(schedule: true)
        default: return refused(operation, "invalid-operation-arguments", "/operation")
        }
    }

    private struct Context {
        let operation: String
        let root: SchemamiValue
        let bundle: SchemamiValue?
        let arguments: SchemamiValue
        let resources: OperationResourceLedger
        var selections: [String: SchemamiValue] = [:]
        var effective: [String: [(String, SchemamiValue, String)]] = [:]
        var effectiveAlternatives: [String: [(String, String, String)]] = [:]

        init(operation: String, root: SchemamiValue, bundle: SchemamiValue?, arguments: SchemamiValue, resources: OperationResourceLedger) {
            self.operation = operation; self.root = root; self.bundle = bundle; self.arguments = arguments
            self.resources = resources
        }

        mutating func validateSelections() -> SchemamiValue? {
            if (arguments[member: "selections"]?.arrayValue ?? []).count > resources.selectedComponentLimit {
                return refused(operation, "resource-limit", "/arguments/selections")
            }
            for (index, selection) in (arguments[member: "selections"]?.arrayValue ?? []).enumerated() {
                let path = pathKey(selection[member: "component_path"])
                if selections[path] != nil { return refused(operation, "invalid-binding", "/arguments/selections/\(index)/component_path") }
                guard let selectedRecipe = recipe(at: path) else { return refused(operation, "invalid-binding", "/arguments/selections") }
                for member in selection[member: "bindings"]?.objectMembers ?? [] {
                    guard let parameter = find(selectedRecipe[member: "parameters"], id: member.name), validBinding(member.value, parameter: parameter) else {
                        return refused(operation, "invalid-binding", "/arguments/selections")
                    }
                }
                for member in selection[member: "alternatives"]?.objectMembers ?? [] {
                    guard let ingredient = find(selectedRecipe[member: "ingredients"], id: member.name),
                          let option = member.value.stringValue,
                          find(ingredient[member: "alternatives"]?[member: "options"], id: option) != nil else {
                        return refused(operation, "invalid-binding", "/arguments/selections")
                    }
                }
                selections[path] = selection
            }
            return nil
        }

        mutating func resolveSelection() -> SchemamiValue {
            var instances: [SchemamiValue] = []
            var visiting = Set<String>()
            if let problem = selectionInstance(recipe: root, path: "", visiting: &visiting, instances: &instances) { return problem }
            return success(result: object([("active_instances", .array(instances))]))
        }

        mutating func selectionInstance(recipe: SchemamiValue, path: String, visiting: inout Set<String>, instances: inout [SchemamiValue]) -> SchemamiValue? {
            if let problem = enterInstance(recipe: recipe, path: path) { return problem }
            let reference = recipeReference(recipe)
            if !visiting.insert(reference).inserted { return refused(operation, "component-cycle", "/bundle/documents") }
            defer { visiting.remove(reference) }
            for parameter in recipe[member: "parameters"]?.arrayValue ?? [] {
                if binding(parameter, recipe: recipe, path: path) == nil { return refused(operation, "missing-binding", "/arguments/selections") }
            }
            for ingredient in recipe[member: "ingredients"]?.arrayValue ?? [] {
                if alternative(ingredient, path: path, required: true) == nil {
                    return refused(operation, "missing-binding", "/arguments/selections")
                }
            }
            let ingredients = (recipe[member: "ingredients"]?.arrayValue ?? []).filter { active($0, recipe: recipe, path: path) }.compactMap { $0[member: "id"] }
            let components = (recipe[member: "components"]?.arrayValue ?? []).filter { active($0, recipe: recipe, path: path) }.compactMap { $0[member: "id"] }
            let equipment = (recipe[member: "equipment"]?.arrayValue ?? []).filter { active($0, recipe: recipe, path: path) }.compactMap { $0[member: "id"] }
            let nodes = activeMethod(recipe, path: path)
            var actions: [SchemamiValue] = []
            for node in nodes where node[member: "kind"]?.stringValue == "step" {
                let ids = (node[member: "actions"]?.arrayValue ?? []).filter { active($0, recipe: recipe, path: path) }.compactMap { $0[member: "id"] }
                if !ids.isEmpty { actions.append(object([("step", node[member: "id"] ?? .string("")), ("actions", .array(ids))])) }
            }
            instances.append(object([
                ("actions", .array(actions)), ("component_path", pathArray(path)), ("components", .array(components)),
                ("equipment", .array(equipment)), ("ingredients", .array(ingredients)),
                ("method", .array(nodes.map { object([("id", $0[member: "id"] ?? .string("")), ("kind", $0[member: "kind"] ?? .string(""))]) })),
                ("recipe", recipeIdentity(recipe)),
            ]))
            for component in recipe[member: "components"]?.arrayValue ?? [] where active(component, recipe: recipe, path: path) {
                guard let id = component[member: "id"]?.stringValue else { continue }
                guard let child = bundleRecipe(component[member: "recipe"]) else {
                    return refused(operation, "unresolved-reference", bundle == nil ? "/recipe/components" : "/bundle/documents")
                }
                let childPath = path.isEmpty ? id : path + "/" + id
                if let problem = selectionInstance(recipe: child, path: childPath, visiting: &visiting, instances: &instances) { return problem }
            }
            return nil
        }

        mutating func resolveFormula() -> SchemamiValue {
            if let problem = enterInstance(recipe: root, path: "") { return problem }
            guard let formulaID = arguments[member: "formula_id"]?.stringValue,
                  let formula = find(root[member: "formulas"], id: formulaID) else { return refused(operation, "unresolved-reference", "/arguments/formula_id") }
            let evaluation = evaluateFormula(formula, recipe: root, path: "", factor: nil)
            if let problem = evaluation.problem { return problem }
            return success(result: object([("quantities", .array(evaluation.quantities))]), formulaEvaluations: [evaluation.metadata])
        }

        mutating func scale() -> SchemamiValue {
            if let problem = enterInstance(recipe: root, path: "") { return problem }
            let factorRaw = arguments[member: "factor"]?.stringValue
            let formulaTarget = arguments[member: "formula_target"]
            guard (factorRaw == nil) != (formulaTarget == nil) else { return refused(operation, "invalid-operation-arguments", "/arguments") }
            var factor: Rational
            if let factorRaw {
                guard case .success(let parsed) = Rational.parsePositive(factorRaw) else { return refused(operation, "invalid-operation-arguments", "/arguments/factor") }
                factor = parsed
            } else {
                guard let target = formulaTarget,
                      let formulaID = target[member: "formula_id"]?.stringValue,
                      let formula = find(root[member: "formulas"], id: formulaID),
                      let quantity = target[member: "quantity"], quantity[member: "kind"]?.stringValue == "measured" else {
                    return refused(operation, "invalid-operation-arguments", "/arguments/formula_target")
                }
                let baseEvaluation = evaluateFormula(formula, recipe: root, path: "", factor: nil)
                if let problem = baseEvaluation.problem { return problem }
                if baseEvaluation.fixed { return refused(operation, "invalid-operation-arguments", "/arguments/formula_target") }
                guard case .success(let targetValue) = Rational.parsePositive(quantity[member: "value"]?.stringValue ?? "") else { return refused(operation, "invalid-operation-arguments", "/arguments/formula_target/quantity/value") }
                let targetUnit = quantity[member: "unit"]?.stringValue ?? ""
                guard let converted = convert(targetValue, from: targetUnit, to: baseEvaluation.unit) else {
                    return refused(operation, "dimension-mismatch", "/arguments/formula_target/quantity/unit")
                }
                guard baseEvaluation.selected > 0 else { return refused(operation, "invalid-operation-arguments", "/arguments/formula_target") }
                factor = converted / baseEvaluation.selected
            }
            var formulaEvaluations: [FormulaEvaluation] = []
            var formulaQuantities: [String: ExactFormulaQuantity] = [:]
            for formula in root[member: "formulas"]?.arrayValue ?? [] {
                let evaluation = evaluateFormula(formula, recipe: root, path: "", factor: factor)
                if let problem = evaluation.problem { return problem }
                formulaEvaluations.append(evaluation)
                for item in evaluation.exactQuantities { formulaQuantities[formulaKey(item.input)] = item }
            }
            var quantities: [SchemamiValue] = []
            for (index, ingredient) in (root[member: "ingredients"]?.arrayValue ?? []).enumerated() where active(ingredient, recipe: root, path: "") {
                let id = ingredient[member: "id"]?.stringValue ?? ""
                if let resolved = formulaQuantities[formulaKey(kind: "ingredient", id: id)] { quantities.append(inputQuantity(kind: "ingredient", id: id, quantity: resolved.quantity)); continue }
                guard let quantity = ingredient[member: "quantity"] else { return refused(operation, "missing-fact", "/recipe/ingredients/\(index)/quantity") }
                let scaled = scaleQuantity(quantity, factor: factor, pointer: "/recipe/ingredients/\(index)/quantity")
                if scaled[member: "status"] != nil { return scaled }
                quantities.append(inputQuantity(kind: "ingredient", id: id, quantity: scaled))
            }
            var componentInstances: [SchemamiValue] = []
            for (index, component) in (root[member: "components"]?.arrayValue ?? []).enumerated() where active(component, recipe: root, path: "") {
                let id = component[member: "id"]?.stringValue ?? ""
                let resolved: ExactFormulaQuantity
                if let formulaOwned = formulaQuantities[formulaKey(kind: "component", id: id)] { resolved = formulaOwned }
                else {
                    guard let quantity = component[member: "quantity"], quantity[member: "kind"]?.stringValue == "measured",
                          case .success(let authored) = Rational.parsePositive(quantity[member: "value"]?.stringValue ?? "") else {
                        return refused(operation, "missing-fact", "/recipe/components/\(index)/quantity")
                    }
                    let applied = quantity[member: "scaling"]?.stringValue == "fixed" ? authored : authored * factor
                    guard case .success(let formatted) = applied.formatted() else { return refused(operation, "resource-limit", "/recipe/components/\(index)/quantity") }
                    resolved = ExactFormulaQuantity(input: object([("kind", .string("component")), ("id", .string(id))]), value: applied, unit: quantity[member: "unit"]?.stringValue ?? "", quantity: measured(formatted, unit: quantity[member: "unit"]?.stringValue ?? ""))
                }
                quantities.append(inputQuantity(kind: "component", id: id, quantity: resolved.quantity))
                guard let child = bundleRecipe(component[member: "recipe"]) else { return refused(operation, "unresolved-reference", "/bundle/documents") }
                var visiting = Set<String>()
                let expansion = scaleComponent(
                    child,
                    component: component,
                    requested: resolved.quantity,
                    requestedExact: resolved.value,
                    requestedUnit: resolved.unit,
                    path: id,
                    componentPointer: "/recipe/components/\(index)",
                    visiting: &visiting
                )
                if let problem = expansion.problem { return problem }
                componentInstances.append(contentsOf: expansion.instances)
                formulaEvaluations.append(contentsOf: expansion.formulaEvaluations)
            }
            return success(result: object([("component_instances", .array(componentInstances)), ("quantities", .array(quantities))]), formulaEvaluations: formulaEvaluations.map(\.metadata))
        }

        private struct ComponentExpansion { var instances: [SchemamiValue] = []; var formulaEvaluations: [FormulaEvaluation] = []; var problem: SchemamiValue? }

        private mutating func scaleComponent(
            _ recipe: SchemamiValue,
            component: SchemamiValue,
            requested: SchemamiValue,
            requestedExact: Rational,
            requestedUnit: String,
            path: String,
            componentPointer: String,
            visiting: inout Set<String>
        ) -> ComponentExpansion {
            if let problem = enterInstance(recipe: recipe, path: path) { return ComponentExpansion(problem: problem) }
            let reference = recipeReference(recipe)
            guard visiting.insert(reference).inserted else {
                return ComponentExpansion(problem: refused(operation, "component-cycle", "/bundle/documents"))
            }
            defer { visiting.remove(reference) }
            guard let outputID = component[member: "output"]?.stringValue,
                  let output = find(recipe[member: "outputs"], id: outputID),
                  let yield = output[member: "yield"], yield[member: "kind"]?.stringValue == "measured",
                  case .success(let baseYield) = Rational.parsePositive(yield[member: "value"]?.stringValue ?? ""),
                  let converted = convert(requestedExact, from: requestedUnit, to: yield[member: "unit"]?.stringValue ?? "") else {
                return ComponentExpansion(problem: refused(operation, "missing-fact", componentPointer + "/output"))
            }
            let factor = converted / baseYield
            var formulaEvaluations: [FormulaEvaluation] = []
            var formulaQuantities: [String: ExactFormulaQuantity] = [:]
            for formula in recipe[member: "formulas"]?.arrayValue ?? [] {
                let evaluation = evaluateFormula(formula, recipe: recipe, path: path, factor: factor)
                if let problem = evaluation.problem { return ComponentExpansion(problem: problem) }
                formulaEvaluations.append(evaluation)
                for item in evaluation.exactQuantities { formulaQuantities[formulaKey(item.input)] = item }
            }
            var quantities: [SchemamiValue] = []
            for (index, ingredient) in (recipe[member: "ingredients"]?.arrayValue ?? []).enumerated() where active(ingredient, recipe: recipe, path: path) {
                guard let id = ingredient[member: "id"]?.stringValue else { continue }
                if let resolved = formulaQuantities[formulaKey(kind: "ingredient", id: id)] {
                    quantities.append(inputQuantity(kind: "ingredient", id: id, quantity: resolved.quantity)); continue
                }
                guard let quantity = ingredient[member: "quantity"] else { return ComponentExpansion(problem: refused(operation, "missing-fact", "/bundle/documents/ingredients/\(index)/quantity")) }
                let scaled = scaleQuantity(quantity, factor: factor, pointer: "/bundle/documents/ingredients/\(index)/quantity")
                if scaled[member: "status"] != nil { return ComponentExpansion(problem: scaled) }
                quantities.append(inputQuantity(kind: "ingredient", id: id, quantity: scaled))
            }
            var nested: [SchemamiValue] = []
            for (index, childComponent) in (recipe[member: "components"]?.arrayValue ?? []).enumerated() where active(childComponent, recipe: recipe, path: path) {
                guard let childID = childComponent[member: "id"]?.stringValue else { continue }
                let resolved: ExactFormulaQuantity
                if let formulaOwned = formulaQuantities[formulaKey(kind: "component", id: childID)] { resolved = formulaOwned }
                else {
                    guard let quantity = childComponent[member: "quantity"], quantity[member: "kind"]?.stringValue == "measured",
                          case .success(let authored) = Rational.parsePositive(quantity[member: "value"]?.stringValue ?? "") else {
                        return ComponentExpansion(problem: refused(operation, "missing-fact", componentPointer + "/components/\(index)/quantity"))
                    }
                    let applied = quantity[member: "scaling"]?.stringValue == "fixed" ? authored : authored * factor
                    guard case .success(let formatted) = applied.formatted() else { return ComponentExpansion(problem: refused(operation, "resource-limit", componentPointer + "/components/\(index)/quantity")) }
                    resolved = ExactFormulaQuantity(input: object([("kind", .string("component")), ("id", .string(childID))]), value: applied, unit: quantity[member: "unit"]?.stringValue ?? "", quantity: measured(formatted, unit: quantity[member: "unit"]?.stringValue ?? ""))
                }
                quantities.append(inputQuantity(kind: "component", id: childID, quantity: resolved.quantity))
                guard let grandchild = bundleRecipe(childComponent[member: "recipe"]) else {
                    return ComponentExpansion(problem: refused(operation, "unresolved-reference", "/bundle/documents"))
                }
                let childPath = path + "/" + childID
                let expansion = scaleComponent(
                    grandchild,
                    component: childComponent,
                    requested: resolved.quantity,
                    requestedExact: resolved.value,
                    requestedUnit: resolved.unit,
                    path: childPath,
                    componentPointer: componentPointer + "/components/\(index)",
                    visiting: &visiting
                )
                if let problem = expansion.problem { return ComponentExpansion(problem: problem) }
                nested.append(contentsOf: expansion.instances)
                formulaEvaluations.append(contentsOf: expansion.formulaEvaluations)
            }
            let instance = object([
                ("component_path", pathArray(path)), ("output", .string(outputID)), ("quantities", .array(quantities)),
                ("quantity", requested), ("recipe", recipeIdentity(recipe)),
            ])
            return ComponentExpansion(instances: [instance] + nested, formulaEvaluations: formulaEvaluations)
        }

        private struct ExactFormulaQuantity {
            let input: SchemamiValue
            let value: Rational
            let unit: String
            let quantity: SchemamiValue
        }

        private struct FormulaEvaluation {
            var quantities: [SchemamiValue] = []
            var exactQuantities: [ExactFormulaQuantity] = []
            var authored: Rational = 0
            var selected: Rational = 0
            var unit = ""
            var fixed = false
            var metadata: SchemamiValue = .null
            var problem: SchemamiValue?
        }

        private mutating func evaluateFormula(_ formula: SchemamiValue, recipe: SchemamiValue, path: String, factor: Rational?) -> FormulaEvaluation {
            var result = FormulaEvaluation()
            let formulaID = formula[member: "id"]?.stringValue ?? ""
            let terms = formula[member: "terms"]?.arrayValue ?? []
            var exactTerms: [(SchemamiValue, Rational, Bool)] = []
            if formula[member: "kind"]?.stringValue == "ratio" {
                guard let target = formula[member: "target"], target[member: "kind"]?.stringValue == "measured",
                      case .success(let total) = Rational.parsePositive(target[member: "value"]?.stringValue ?? "") else {
                    result.problem = refused(operation, "missing-fact", "/recipe/formulas"); return result
                }
                result.unit = target[member: "unit"]?.stringValue ?? ""; result.fixed = target[member: "scaling"]?.stringValue == "fixed"
                var parts: [Rational] = []; var partTotal: Rational = 0
                for term in terms {
                    guard case .success(let part) = Rational.parsePositive(term[member: "parts"]?.stringValue ?? "") else { result.problem = refused(operation, "invalid-decimal", "/recipe/formulas"); return result }
                    parts.append(part); partTotal = partTotal + part
                }
                for (index, term) in terms.enumerated() {
                    guard let input = term[member: "input"] else { continue }
                    exactTerms.append((input, total * parts[index] / partTotal, inputActive(input, recipe: recipe, path: path)))
                }
            } else {
                guard let basisQuantity = formula[member: "basis_quantity"], basisQuantity[member: "kind"]?.stringValue == "measured",
                      case .success(let basis) = Rational.parsePositive(basisQuantity[member: "value"]?.stringValue ?? "") else {
                    result.problem = refused(operation, "missing-fact", "/recipe/formulas"); return result
                }
                result.unit = basisQuantity[member: "unit"]?.stringValue ?? ""; result.fixed = basisQuantity[member: "scaling"]?.stringValue == "fixed"
                for term in terms {
                    guard let input = term[member: "input"], case .success(let percentage) = Rational.parsePositive(term[member: "percentage"]?.stringValue ?? "") else { continue }
                    exactTerms.append((input, basis * percentage / 100, inputActive(input, recipe: recipe, path: path)))
                }
            }
            for item in exactTerms { result.authored = result.authored + item.1; if item.2 { result.selected = result.selected + item.1 } }
            let appliedFactor = factor ?? 1
            for item in exactTerms where item.2 {
                let exact = item.1 * appliedFactor
                guard case .success(let formatted) = exact.formatted() else { result.problem = refused(operation, "resource-limit", "/recipe/formulas"); return result }
                let quantity = measured(formatted, unit: result.unit)
                result.quantities.append(object([("input", item.0), ("quantity", quantity)]))
                result.exactQuantities.append(ExactFormulaQuantity(input: item.0, value: exact, unit: result.unit, quantity: quantity))
            }
            guard case .success(let authored) = result.authored.formatted(), case .success(let selected) = result.selected.formatted() else { return result }
            var metadata: [(String, SchemamiValue)] = [
                ("authored_total", measured(authored, unit: result.unit)), ("component_path", pathArray(path)),
                ("formula_id", .string(formulaID)),
            ]
            if let factor, case .success(let scaled) = (result.selected * factor).formatted() { metadata.append(("scaled_total", measured(scaled, unit: result.unit))) }
            metadata.append(("selected_total", measured(selected, unit: result.unit)))
            result.metadata = object(metadata)
            return result
        }

        mutating func methodProjection(schedule: Bool) -> SchemamiValue {
            if bundle != nil { return composedMethodProjection(schedule: schedule) }
            if let problem = enterInstance(recipe: root, path: "") { return problem }
            let nodes = activeMethod(root, path: "").filter { $0[member: "kind"]?.stringValue == "step" }
            let result = projectSteps(nodes, path: "", schedule: schedule, initialOffset: 0)
            if let problem = result.problem { return problem }
            let key = schedule ? "unscheduled_components" : "unplaced_components"
            return success(result: object([("steps", .array(result.steps)), (key, .array(unconsumedComponents(root, path: "")))]))
        }

        mutating func composedMethodProjection(schedule: Bool) -> SchemamiValue {
            var visiting = Set<String>()
            if !schedule {
                let collected = collectComposedSteps(recipe: root, path: "", visiting: &visiting)
                if let problem = collected.problem { return problem }
                guard !collected.steps.isEmpty else { return refused(operation, "missing-fact", "/recipe/method/sequence") }
                var index: [String: Int] = [:]
                for (position, step) in collected.steps.enumerated() { index[stepKey(step.path, step.id)] = position }
                var indegree = Array(repeating: 0, count: collected.steps.count)
                var dependents = Array(repeating: [Int](), count: collected.steps.count)
                for (position, step) in collected.steps.enumerated() {
                    for dependency in step.after {
                        guard let dependencyIndex = index[dependency] else { return refused(operation, "unresolved-reference", "/recipe/method") }
                        indegree[position] += 1; dependents[dependencyIndex].append(position)
                    }
                }
                var used = Array(repeating: false, count: collected.steps.count)
                var projected: [SchemamiValue] = []
                while projected.count < collected.steps.count {
                    let ready = collected.steps.indices.filter { !used[$0] && indegree[$0] == 0 }
                    guard let selected = ready.min(by: { collected.steps[$0].order < collected.steps[$1].order }) else {
                        return refused(operation, "dependency-cycle", "/recipe/method")
                    }
                    used[selected] = true
                    let step = collected.steps[selected]
                    projected.append(object([("component_path", pathArray(step.path)), ("id", .string(step.id))]))
                    for dependent in dependents[selected] { indegree[dependent] -= 1 }
                }
                return success(result: object([("steps", .array(projected)), ("unplaced_components", .array(collected.notices))]))
            }

            let composed = composeScheduleInstance(recipe: root, path: "", visiting: &visiting)
            if let problem = composed.problem { return problem }
            guard !composed.steps.isEmpty else { return refused(operation, "missing-fact", "/recipe/method/sequence") }
            let minimum = composed.steps.map(\.start).min() ?? 0
            var shifted = composed.steps
            for index in shifted.indices { shifted[index].start -= minimum; shifted[index].end -= minimum }
            // Schedule ties follow the same composed reading preorder instead
            // of colliding per-recipe local ordinals.
            var orderingContext = self
            var orderingVisiting = Set<String>()
            let ordering = orderingContext.collectComposedSteps(recipe: root, path: "", visiting: &orderingVisiting)
            let ordinals = Dictionary(uniqueKeysWithValues: ordering.steps.enumerated().map { (stepKey($0.element.path, $0.element.id), $0.offset) })
            for index in shifted.indices { shifted[index].order = ordinals[stepKey(shifted[index].path, shifted[index].id)] ?? Int.max }
            shifted.sort { left, right in left.start == right.start ? left.order < right.order : left.start < right.start }
            let projected = shifted.map { step in object([
                ("component_path", pathArray(step.path)), ("duration", .string(formatElapsed(step.duration))),
                ("end", .string(formatElapsed(step.end))), ("id", .string(step.id)),
                ("start", .string(formatElapsed(step.start))),
            ]) }
            return success(result: object([("steps", .array(projected)), ("unscheduled_components", .array(composed.notices))]))
        }

        private struct ComposedStep {
            var path: String
            var id: String
            var after: [String] = []
            var duration: BigInt = 0
            var start: BigInt = 0
            var end: BigInt = 0
            var order: Int = 0
        }

        private struct ComposedProjection {
            var steps: [ComposedStep] = []
            var notices: [SchemamiValue] = []
            var problem: SchemamiValue?
        }

        private mutating func collectComposedSteps(
            recipe: SchemamiValue,
            path: String,
            visiting: inout Set<String>
        ) -> ComposedProjection {
            if let problem = enterInstance(recipe: recipe, path: path) { return ComposedProjection(problem: problem) }
            let reference = recipeReference(recipe)
            guard visiting.insert(reference).inserted else {
                return ComposedProjection(problem: refused(operation, "component-cycle", "/bundle/documents"))
            }
            defer { visiting.remove(reference) }
            let nodes = activeMethod(recipe, path: path)
            let activeIDs = Set(nodes.compactMap { $0[member: "id"]?.stringValue })
            var roots = nodes.filter { $0[member: "kind"]?.stringValue == "step" }.map { node in
                ComposedStep(
                    path: path,
                    id: node[member: "id"]?.stringValue ?? "",
                    after: strings(node[member: "after"]).filter { activeIDs.contains($0) }.map { stepKey(path, $0) }
                )
            }
            var byID: [String: Int] = [:]
            for (index, step) in roots.enumerated() { byID[step.id] = index }
            var result: [ComposedStep] = []
            var notices: [SchemamiValue] = []
            for component in recipe[member: "components"]?.arrayValue ?? [] where active(component, recipe: recipe, path: path) {
                guard let componentID = component[member: "id"]?.stringValue else { continue }
                let consumers = componentConsumers(nodes, componentID: componentID)
                let childPath = path.isEmpty ? componentID : path + "/" + componentID
                if consumers.isEmpty {
                    notices.append(componentNotice(path: childPath)); continue
                }
                guard let child = bundleRecipe(component[member: "recipe"]) else {
                    return ComposedProjection(problem: refused(operation, "unresolved-reference", "/bundle/documents"))
                }
                let childProjection = collectComposedSteps(recipe: child, path: childPath, visiting: &visiting)
                if let problem = childProjection.problem { return ComposedProjection(problem: problem) }
                guard let producer = selectedOutputProducer(recipe: child, path: childPath, outputID: component[member: "output"]?.stringValue ?? "") else {
                    return ComposedProjection(problem: refused(operation, "missing-producer", "/bundle/documents"))
                }
                if producer.multiple { return ComposedProjection(problem: refused(operation, "multiple-producers", "/bundle/documents")) }
                for consumer in consumers { if let index = byID[consumer] { roots[index].after.append(stepKey(childPath, producer.id)) } }
                result.append(contentsOf: childProjection.steps); notices.append(contentsOf: childProjection.notices)
            }
            result.append(contentsOf: roots)
            for index in result.indices { result[index].order = index }
            return ComposedProjection(steps: result, notices: notices)
        }

        private mutating func composeScheduleInstance(
            recipe: SchemamiValue,
            path: String,
            visiting: inout Set<String>
        ) -> ComposedProjection {
            if let problem = enterInstance(recipe: recipe, path: path) { return ComposedProjection(problem: problem) }
            let reference = recipeReference(recipe)
            guard visiting.insert(reference).inserted else {
                return ComposedProjection(problem: refused(operation, "component-cycle", "/bundle/documents"))
            }
            defer { visiting.remove(reference) }
            var local = collectLocalSchedule(recipe: recipe, path: path)
            if let problem = local.problem { return ComposedProjection(problem: problem) }
            let nodes = activeMethod(recipe, path: path)
            for component in recipe[member: "components"]?.arrayValue ?? [] where active(component, recipe: recipe, path: path) {
                guard let componentID = component[member: "id"]?.stringValue else { continue }
                let consumers = componentConsumers(nodes, componentID: componentID)
                let childPath = path.isEmpty ? componentID : path + "/" + componentID
                if consumers.isEmpty { local.notices.append(componentNotice(path: childPath)); continue }
                guard let child = bundleRecipe(component[member: "recipe"]) else {
                    return ComposedProjection(problem: refused(operation, "unresolved-reference", "/bundle/documents"))
                }
                var childProjection = composeScheduleInstance(recipe: child, path: childPath, visiting: &visiting)
                if let problem = childProjection.problem { return ComposedProjection(problem: problem) }
                guard let producer = selectedOutputProducer(recipe: child, path: childPath, outputID: component[member: "output"]?.stringValue ?? "") else {
                    return ComposedProjection(problem: refused(operation, "missing-producer", "/bundle/documents"))
                }
                if producer.multiple { return ComposedProjection(problem: refused(operation, "multiple-producers", "/bundle/documents")) }
                guard let producerStep = childProjection.steps.first(where: { $0.path == childPath && $0.id == producer.id }),
                      let earliestConsumer = local.steps.filter({ $0.path == path && consumers.contains($0.id) }).map(\.start).min()
                else { return ComposedProjection(problem: refused(operation, "missing-producer", "/bundle/documents")) }
                let shift = earliestConsumer - producerStep.end
                for index in childProjection.steps.indices {
                    childProjection.steps[index].start += shift; childProjection.steps[index].end += shift
                }
                local.steps.append(contentsOf: childProjection.steps); local.notices.append(contentsOf: childProjection.notices)
            }
            return local
        }

        private mutating func collectLocalSchedule(recipe: SchemamiValue, path: String) -> ComposedProjection {
            let nodes = activeMethod(recipe, path: path).filter { $0[member: "kind"]?.stringValue == "step" }
            var indexByID: [String: Int] = [:]
            for (index, node) in nodes.enumerated() { indexByID[node[member: "id"]?.stringValue ?? ""] = index }
            var indegree = Array(repeating: 0, count: nodes.count)
            var dependents = Array(repeating: [Int](), count: nodes.count)
            for (index, node) in nodes.enumerated() {
                for dependency in strings(node[member: "after"]) where indexByID[dependency] != nil {
                    indegree[index] += 1; dependents[indexByID[dependency]!].append(index)
                }
            }
            var order: [Int] = []; var used = Array(repeating: false, count: nodes.count)
            while order.count < nodes.count {
                guard let selected = nodes.indices.first(where: { !used[$0] && indegree[$0] == 0 }) else {
                    return ComposedProjection(problem: refused(operation, "dependency-cycle", "/recipe/method"))
                }
                used[selected] = true; order.append(selected); for child in dependents[selected] { indegree[child] -= 1 }
            }
            var ends = Array(repeating: BigInt(0), count: nodes.count)
            var result: [ComposedStep] = []
            for (authoredOrder, index) in order.enumerated() {
                guard let duration = durationSeconds(nodes[index][member: "duration"]) else {
                    return ComposedProjection(problem: refused(operation, "missing-fact", "/recipe/method"))
                }
                var start: BigInt = 0
                for dependency in strings(nodes[index][member: "after"]) {
                    if let dependencyIndex = indexByID[dependency] { start = max(start, ends[dependencyIndex]) }
                }
                let end = start + duration; ends[index] = end
                result.append(ComposedStep(path: path, id: nodes[index][member: "id"]?.stringValue ?? "", duration: duration, start: start, end: end, order: authoredOrder))
            }
            return ComposedProjection(steps: result)
        }

        private mutating func componentConsumers(_ nodes: [SchemamiValue], componentID: String) -> [String] {
            nodes.filter { node in
                node[member: "kind"]?.stringValue == "step" &&
                (node[member: "uses"]?.arrayValue ?? []).contains { $0[member: "kind"]?.stringValue == "component" && $0[member: "id"]?.stringValue == componentID }
            }.compactMap { $0[member: "id"]?.stringValue }
        }

        private mutating func selectedOutputProducer(recipe: SchemamiValue, path: String, outputID: String) -> (id: String, multiple: Bool)? {
            let producers = activeMethod(recipe, path: path).filter { node in
                node[member: "kind"]?.stringValue == "step" &&
                (node[member: "produces"]?.arrayValue ?? []).contains { $0[member: "kind"]?.stringValue == "output" && $0[member: "id"]?.stringValue == outputID }
            }.compactMap { $0[member: "id"]?.stringValue }
            guard let first = producers.first else { return nil }
            return (first, producers.count > 1)
        }

        private func stepKey(_ path: String, _ id: String) -> String { path + "\u{0}" + id }
        private func componentNotice(path: String) -> SchemamiValue { object([("component_path", pathArray(path)), ("reason", .string("not-consumed"))]) }

        private func enterInstance(recipe: SchemamiValue, path: String) -> SchemamiValue? {
            if !resources.enter(recipe: recipe, path: path) {
                return refused(operation, "resource-limit", "/bundle/documents")
            }
            return nil
        }

        private struct StepProjection { var steps: [SchemamiValue] = []; var end: BigInt = 0; var problem: SchemamiValue? }
        private mutating func projectSteps(_ nodes: [SchemamiValue], path: String, schedule: Bool, initialOffset: BigInt) -> StepProjection {
            var indexByID: [String: Int] = [:]
            for (index, node) in nodes.enumerated() { indexByID[node[member: "id"]?.stringValue ?? ""] = index }
            var indegree = Array(repeating: 0, count: nodes.count); var dependents = Array(repeating: [Int](), count: nodes.count)
            for (index, node) in nodes.enumerated() {
                for dependency in strings(node[member: "after"]) where indexByID[dependency] != nil { indegree[index] += 1; dependents[indexByID[dependency]!].append(index) }
            }
            var order: [Int] = []; var used = Array(repeating: false, count: nodes.count)
            while order.count < nodes.count {
                guard let selected = nodes.indices.first(where: { !used[$0] && indegree[$0] == 0 }) else { return StepProjection(problem: refused(operation, "dependency-cycle", "/method")) }
                used[selected] = true; order.append(selected); for child in dependents[selected] { indegree[child] -= 1 }
            }
            if !schedule { return StepProjection(steps: order.map { object([("component_path", pathArray(path)), ("id", nodes[$0][member: "id"] ?? .string(""))]) }) }
            var ends = Array(repeating: initialOffset, count: nodes.count); var result: [SchemamiValue] = []; var maximum = initialOffset
            for index in order {
                var start = initialOffset
                for dependency in strings(nodes[index][member: "after"]) { if let dependencyIndex = indexByID[dependency] { start = max(start, ends[dependencyIndex]) } }
                guard let duration = durationSeconds(nodes[index][member: "duration"]) else { return StepProjection(problem: refused(operation, "missing-fact", "/method")) }
                let end = start + duration; ends[index] = end; maximum = max(maximum, end)
                result.append(object([("component_path", pathArray(path)), ("duration", .string(formatElapsed(duration))), ("end", .string(formatElapsed(end))), ("id", nodes[index][member: "id"] ?? .string("")), ("start", .string(formatElapsed(start)))]))
            }
            return StepProjection(steps: result, end: maximum)
        }

        mutating func activeMethod(_ recipe: SchemamiValue, path: String) -> [SchemamiValue] {
            var result: [SchemamiValue] = []
            func append(_ values: [SchemamiValue], parent: Bool, context: inout Context) {
                for node in values {
                    let live = parent && context.active(node, recipe: recipe, path: path)
                    if live { result.append(node) }
                    if node[member: "kind"]?.stringValue == "section" { append(node[member: "sequence"]?.arrayValue ?? [], parent: live, context: &context) }
                }
            }
            append(recipe[member: "method"]?[member: "sequence"]?.arrayValue ?? [], parent: true, context: &self)
            return result
        }

        mutating func inputActive(_ input: SchemamiValue, recipe: SchemamiValue, path: String) -> Bool {
            guard let kind = input[member: "kind"]?.stringValue, let id = input[member: "id"]?.stringValue, let value = find(recipe[member: kind + "s"], id: id) else { return false }
            return active(value, recipe: recipe, path: path)
        }

        mutating func active(_ objectValue: SchemamiValue, recipe: SchemamiValue, path: String) -> Bool {
            guard let activation = objectValue[member: "activation"] else { return true }
            return evaluateActivation(activation, recipe: recipe, path: path) ?? false
        }

        mutating func evaluateActivation(_ activation: SchemamiValue, recipe: SchemamiValue, path: String) -> Bool? {
            guard let kind = activation[member: "kind"]?.stringValue else { return nil }
            if ["choice_is", "toggle_is", "measurement_compare"].contains(kind) {
                guard let parameterID = activation[member: "parameter"]?.stringValue, let parameter = find(recipe[member: "parameters"], id: parameterID), let value = binding(parameter, recipe: recipe, path: path) else { return nil }
                if kind == "choice_is" { return value == activation[member: "option"] }
                if kind == "toggle_is" { return value == activation[member: "enabled"] }
                guard let bound = value.objectMembers,
                      let leftRaw = value[member: "value"]?.stringValue,
                      let leftUnit = value[member: "unit"]?.stringValue,
                      bound.contains(where: { $0.name == "kind" && $0.value.stringValue == "measured" }),
                      case .success(let left) = Rational.parseCanonical(leftRaw),
                      let measurement = activation[member: "measurement"],
                      case .success(let rightRaw) = Rational.parseCanonical(measurement[member: "value"]?.stringValue ?? ""),
                      let right = convert(rightRaw, from: measurement[member: "unit"]?.stringValue ?? "", to: leftUnit)
                else { return nil }
                switch activation[member: "operator"]?.stringValue {
                case "equal": return left == right
                case "less_than": return left < right
                case "less_than_or_equal": return left <= right
                case "greater_than": return left > right
                case "greater_than_or_equal": return left >= right
                default: return nil
                }
            }
            if kind == "all" { return (activation[member: "conditions"]?.arrayValue ?? []).allSatisfy { evaluateActivation($0, recipe: recipe, path: path) == true } }
            if kind == "any" { return (activation[member: "conditions"]?.arrayValue ?? []).contains { evaluateActivation($0, recipe: recipe, path: path) == true } }
            if kind == "not", let condition = activation[member: "condition"], let value = evaluateActivation(condition, recipe: recipe, path: path) { return !value }
            return nil
        }

        mutating func binding(_ parameter: SchemamiValue, recipe: SchemamiValue, path: String) -> SchemamiValue? {
            guard let id = parameter[member: "id"]?.stringValue else { return nil }
            if let existing = effective[path]?.first(where: { $0.0 == id }) { return existing.1 }
            let explicit = selections[path]?[member: "bindings"]?[member: id]
            let value = explicit ?? parameter[member: "default"]
            guard let value else { return nil }
            effective[path, default: []].append((id, value, explicit == nil ? "default" : "argument"))
            return value
        }

        mutating func alternative(_ ingredient: SchemamiValue, path: String, required: Bool) -> String? {
            guard let alternatives = ingredient[member: "alternatives"], let id = ingredient[member: "id"]?.stringValue else { return "" }
            if let existing = effectiveAlternatives[path]?.first(where: { $0.0 == id }) { return existing.1 }
            let explicit = selections[path]?[member: "alternatives"]?[member: id]?.stringValue
            let value = explicit ?? alternatives[member: "default"]?.stringValue
            guard let value else { return required ? nil : "" }
            effectiveAlternatives[path, default: []].append((id, value, explicit == nil ? "default" : "argument"))
            return value
        }

        func validBinding(_ value: SchemamiValue, parameter: SchemamiValue) -> Bool {
            switch parameter[member: "kind"]?.stringValue {
            case "choice":
                guard let option = value.stringValue else { return false }
                return find(parameter[member: "options"], id: option) != nil
            case "toggle":
                if case .boolean = value { return true }
                return false
            case "measurement":
                guard value[member: "kind"]?.stringValue == "measured",
                      case .success = Rational.parseCanonical(value[member: "value"]?.stringValue ?? ""),
                      let source = value[member: "unit"]?.stringValue,
                      let target = parameter[member: "unit"]?.stringValue else { return false }
                return unitsCompatible(source, target)
            default:
                return false
            }
        }

        func recipe(at path: String) -> SchemamiValue? {
            if path.isEmpty { return root }
            var current = root
            for componentID in path.split(separator: "/").map(String.init) {
                guard let component = find(current[member: "components"], id: componentID), let child = bundleRecipe(component[member: "recipe"]) else { return nil }
                current = child
            }
            return current
        }

        func bundleRecipe(_ reference: SchemamiValue?) -> SchemamiValue? {
            guard let reference else { return nil }
            return bundle?[member: "documents"]?.arrayValue?.first(where: { entry in
                guard let document = entry[member: "document"] else { return false }
                return document[member: "collection"] == reference[member: "collection"] && document[member: "id"] == reference[member: "id"] && document[member: "revision"] == reference[member: "revision"] && entry[member: "sha256"] == reference[member: "sha256"]
            })?[member: "document"]
        }

        func success(result: SchemamiValue, formulaEvaluations: [SchemamiValue] = []) -> SchemamiValue {
            var members: [(String, SchemamiValue)] = [("operation", .string(operation)), ("status", .string("ok")), ("evaluation", evaluation())]
            if !formulaEvaluations.isEmpty { members.append(("formula_evaluations", .array(formulaEvaluations))) }
            members.append(("result", result)); return object(members)
        }

        func evaluation() -> SchemamiValue {
            var members: [(String, SchemamiValue)] = []
            if let bundle, let digest = try? bundle.canonicalSHA256() { members.append(("bundle_sha256", .string(digest))) }
            members.append(("recipe", recipeIdentity(root)))
            var selectionValues: [SchemamiValue] = []
            for path in Set(effective.keys).union(effectiveAlternatives.keys).sorted() {
                let values = effective[path] ?? []
                let alternatives = effectiveAlternatives[path] ?? []
                if values.isEmpty && alternatives.isEmpty { continue }
                selectionValues.append(object([
                    ("alternatives", .array(alternatives.map { object([("ingredient", .string($0.0)), ("option", .string($0.1)), ("source", .string($0.2))]) })),
                    ("bindings", .array(values.map { object([("parameter", .string($0.0)), ("source", .string($0.2)), ("value", $0.1)]) })),
                    ("component_path", pathArray(path)),
                ]))
            }
            members.append(("selections", .array(selectionValues)))
            return object(members)
        }
    }

    private static func scaleQuantity(_ quantity: SchemamiValue, factor: Rational, pointer: String) -> SchemamiValue {
        switch quantity[member: "kind"]?.stringValue {
        case "measured":
            if quantity[member: "scaling"]?.stringValue == "fixed" { return quantity }
            return scaledMember(quantity, "value", factor: factor, pointer: pointer)
        case "range":
            let first = scaledMember(quantity, "minimum", factor: factor, pointer: pointer); if first[member: "status"] != nil { return first }
            return scaledMember(first, "maximum", factor: factor, pointer: pointer)
        case "open": return quantity
        default: return refused("scale", "unsupported-quantity-kind", pointer)
        }
    }

    private static func scaledMember(_ quantity: SchemamiValue, _ member: String, factor: Rational, pointer: String) -> SchemamiValue {
        guard case .success(let value) = Rational.parseCanonical(quantity[member: member]?.stringValue ?? ""), case .success(let formatted) = (value * factor).formatted() else { return refused("scale", "invalid-decimal", pointer + "/" + member) }
        return replacing(quantity, member: member, value: .string(formatted))
    }

    private static func inputQuantity(kind: String, id: String, quantity: SchemamiValue) -> SchemamiValue { object([("input", object([("id", .string(id)), ("kind", .string(kind))])), ("quantity", quantity)]) }
    private static func formulaKey(_ input: SchemamiValue) -> String { formulaKey(kind: input[member: "kind"]?.stringValue ?? "", id: input[member: "id"]?.stringValue ?? "") }
    private static func formulaKey(kind: String, id: String) -> String { kind + "\u{0}" + id }
    private static func measured(_ value: String, unit: String) -> SchemamiValue { object([("kind", .string("measured")), ("value", .string(value)), ("unit", .string(unit))]) }
    private static func recipeIdentity(_ recipe: SchemamiValue) -> SchemamiValue { object([("collection", recipe[member: "collection"] ?? .string("")), ("id", recipe[member: "id"] ?? .string("")), ("revision", recipe[member: "revision"] ?? .integer(0)), ("sha256", .string((try? recipe.canonicalSHA256()) ?? ""))]) }
    private static func recipeReference(_ recipe: SchemamiValue) -> String { "\(recipe[member: "collection"]?.stringValue ?? "")/\(recipe[member: "id"]?.stringValue ?? "")/\(recipe[member: "revision"]?.integerValue ?? 0)" }
    private static func pathKey(_ value: SchemamiValue?) -> String { value?.arrayValue?.compactMap(\.stringValue).joined(separator: "/") ?? "" }
    private static func pathArray(_ path: String) -> SchemamiValue { .array(path.isEmpty ? [] : path.split(separator: "/").map { .string(String($0)) }) }
    private static func find(_ value: SchemamiValue?, id: String) -> SchemamiValue? { value?.arrayValue?.first { $0[member: "id"]?.stringValue == id } }
    private static func strings(_ value: SchemamiValue?) -> [String] { value?.arrayValue?.compactMap(\.stringValue) ?? [] }
    private static func consumed(component id: String, in recipe: SchemamiValue) -> Bool {
        var stack = recipe[member: "method"]?[member: "sequence"]?.arrayValue ?? []
        while let node = stack.popLast() { if (node[member: "uses"]?.arrayValue ?? []).contains(where: { $0[member: "kind"]?.stringValue == "component" && $0[member: "id"]?.stringValue == id }) { return true }; stack.append(contentsOf: node[member: "sequence"]?.arrayValue ?? []) }
        return false
    }
    private static func unconsumedComponents(_ recipe: SchemamiValue, path: String) -> [SchemamiValue] { (recipe[member: "components"]?.arrayValue ?? []).filter { !consumed(component: $0[member: "id"]?.stringValue ?? "", in: recipe) }.map { object([("component_path", pathArray(path.isEmpty ? ($0[member: "id"]?.stringValue ?? "") : path + "/" + ($0[member: "id"]?.stringValue ?? ""))), ("reason", .string("not-consumed"))]) } }
    private static func convert(_ value: Rational, from source: String, to target: String) -> Rational? {
        if source == target { return value }
        if source == "Cel" && target == "[degF]" { return value * Rational(9, 5) + 32 }
        if source == "[degF]" && target == "Cel" { return (value - 32) * Rational(5, 9) }
        let dimensions: [String: String] = ["g": "mass", "kg": "mass", "mL": "volume", "L": "volume"]
        guard dimensions[source] == dimensions[target] else { return nil }
        let factors: [String: Rational] = ["g": 1, "kg": 1000, "mL": 1, "L": 1000]
        return value * factors[source]! / factors[target]!
    }
    private static func unitsCompatible(_ source: String, _ target: String) -> Bool {
        if source == target { return true }
        if Set([source, target]) == Set(["Cel", "[degF]"]) { return true }
        let dimensions: [String: String] = ["g": "mass", "kg": "mass", "mL": "volume", "L": "volume"]
        return dimensions[source] != nil && dimensions[source] == dimensions[target]
    }
    private static func durationSeconds(_ value: SchemamiValue?) -> BigInt? {
        let raw = value?.stringValue ?? value?[member: "target"]?.stringValue
        guard let raw else { return nil }
        let pattern = #"^P(?:(?:([1-9][0-9]*)W)|(?:([1-9][0-9]*)D)?(?:T(?:([1-9][0-9]*)H)?(?:([1-9][0-9]*)M)?(?:([1-9][0-9]*)S)?)?)$"#
        guard let regex = try? NSRegularExpression(pattern: pattern), let match = regex.firstMatch(in: raw, range: NSRange(raw.startIndex..., in: raw)) else { return nil }
        let factors: [BigInt] = [604800, 86400, 3600, 60, 1]; var total: BigInt = 0
        for index in 1...5 { let range = match.range(at: index); if range.location != NSNotFound, let swiftRange = Range(range, in: raw), let number = BigInt(String(raw[swiftRange])) { total += number * factors[index - 1] } }
        return total > 0 ? total : nil
    }
    private static func formatElapsed(_ seconds: BigInt) -> String { if seconds == 0 { return "PT0S" }; if seconds % 604800 == 0 { return "P\(seconds / 604800)W" }; var value = seconds; let d = value / 86400; value %= 86400; let h = value / 3600; value %= 3600; let m = value / 60; value %= 60; var out = "P"; if d > 0 { out += "\(d)D" }; if h > 0 || m > 0 || value > 0 { out += "T"; if h > 0 { out += "\(h)H" }; if m > 0 { out += "\(m)M" }; if value > 0 { out += "\(value)S" } }; return out }
    private static func object(_ values: [(String, SchemamiValue)]) -> SchemamiValue { .object(values.map { SchemamiMember(name: $0.0, value: $0.1) }) }
    private static func replacing(_ objectValue: SchemamiValue, member: String, value: SchemamiValue) -> SchemamiValue { .object((objectValue.objectMembers ?? []).map { $0.name == member ? SchemamiMember(name: member, value: value) : $0 }) }
    private static func refused(_ operation: String, _ code: String, _ pointer: String) -> SchemamiValue { var members = [("type", SchemamiValue.string(base + code))]; if !pointer.isEmpty { members.append(("pointer", .string(pointer))) }; return object([("operation", .string(operation)), ("status", .string("refused")), ("problems", .array([object(members)]))]) }
}
