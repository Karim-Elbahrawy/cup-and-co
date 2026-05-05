import Foundation
import Observation

/// A single line item in the cart.  Identity is derived from the product
/// id + sorted option selections so adding the same product with different
/// options creates separate lines.
struct CartItem: Identifiable, Equatable, Sendable, Codable {
    let id: String
    let product: Product
    var quantity: Int
    let selectedOptions: [String: String]
    let unitPrice: Double

    /// Human-readable summary of chosen options (e.g. "Large, Less Sugar").
    var optionsSummary: String {
        selectedOptions
            .sorted { $0.key < $1.key }
            .map { $0.value }
            .joined(separator: ", ")
    }

    var lineTotal: Double { unitPrice * Double(quantity) }

    var priceLabel: String {
        let int = Int(lineTotal.rounded())
        return "EGP \(int)"
    }
}

/// Persistent cart backed by UserDefaults.  Injected via `@Environment`.
@MainActor
@Observable
final class CartStore {

    private static let storageKey = "cup_cart_items"

    var items: [CartItem] = [] {
        didSet { persist() }
    }
    var redeemPoints: Int = 0

    init() {
        items = Self.loadItems()
    }

    // MARK: - Computed

    var subtotal: Double {
        items.reduce(0) { $0 + $1.unitPrice * Double($1.quantity) }
    }

    var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    var isEmpty: Bool { items.isEmpty }

    // MARK: - Mutations

    /// Add a product to the cart.  If an identical line (same product + options)
    /// already exists the quantity is incremented instead.
    func addItem(product: Product,
                 quantity: Int,
                 options: [String: String],
                 optionDeltas: [String: Double] = [:]) {
        let key = Self.lineKey(productId: product.id, options: options)
        let deltaSum = optionDeltas.values.reduce(0, +)
        let unit = product.basePriceEgp + deltaSum

        if let idx = items.firstIndex(where: { $0.id == key }) {
            items[idx].quantity += quantity
        } else {
            let item = CartItem(
                id: key,
                product: product,
                quantity: quantity,
                selectedOptions: options,
                unitPrice: unit
            )
            items.append(item)
        }
    }

    /// Update the quantity for a specific line.  If quantity reaches 0 the
    /// item is removed.
    func updateQuantity(itemId: String, quantity: Int) {
        guard let idx = items.firstIndex(where: { $0.id == itemId }) else { return }
        if quantity <= 0 {
            items.remove(at: idx)
        } else {
            items[idx].quantity = quantity
        }
    }

    func removeItem(itemId: String) {
        items.removeAll { $0.id == itemId }
    }

    func clear() {
        items.removeAll()
        redeemPoints = 0
    }

    // MARK: - Key generation

    /// Deterministic key from product id + sorted options dictionary.
    static func lineKey(productId: String, options: [String: String]) -> String {
        let optionStr = options
            .sorted { $0.key < $1.key }
            .map { "\($0.key)=\($0.value)" }
            .joined(separator: "|")
        return "\(productId):\(optionStr)"
    }

    // MARK: - Persistence

    private func persist() {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }

    private static func loadItems() -> [CartItem] {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let items = try? JSONDecoder().decode([CartItem].self, from: data) else {
            return []
        }
        return items
    }
}
