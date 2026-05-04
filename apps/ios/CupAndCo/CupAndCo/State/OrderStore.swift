import Foundation
import Observation

/// Manages order creation, listing, and tracking state.
@MainActor
@Observable
final class OrderStore {

    var activeOrderId: String?
    var orders: [Order] = []
    var isLoading: Bool = false
    var error: String?

    // MARK: - Place order

    /// Creates an order from the current cart contents, then clears the cart
    /// and sets `activeOrderId` for navigation to tracking.
    func placeOrder(cart: CartStore,
                    fulfillment: FulfillmentType,
                    payment: PaymentMethod,
                    scheduledFor: String? = nil,
                    notes: String? = nil) async -> OrderResponse? {
        isLoading = true
        defer { isLoading = false }
        do {
            let itemInputs = cart.items.map { item in
                OrderAPI.CreateItemInput(
                    productId: item.product.id,
                    quantity: item.quantity,
                    options: item.selectedOptions
                )
            }
            let input = OrderAPI.CreateInput(
                fulfillmentType: fulfillment.rawValue,
                paymentMethod: payment.rawValue,
                scheduledFor: scheduledFor,
                redeemPoints: cart.redeemPoints,
                notes: notes?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true ? nil : notes,
                items: itemInputs
            )
            let res = try await OrderAPI.create(input: input)
            activeOrderId = res.order.id
            cart.clear()

            // Prepend to local list
            if !orders.contains(where: { $0.id == res.order.id }) {
                orders.insert(res.order, at: 0)
            }

            error = nil
            return res
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
            return nil
        }
    }

    // MARK: - Fetch list

    func fetchOrders() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let res = try await OrderAPI.list()
            orders = res.orders
            error = nil
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }

    // MARK: - Fetch single

    func fetchOrder(id: String) async -> OrderResponse? {
        do {
            let res = try await OrderAPI.get(id: id)
            // Update local cache
            if let idx = orders.firstIndex(where: { $0.id == id }) {
                orders[idx] = res.order
            }
            return res
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
            return nil
        }
    }

    // MARK: - Cancel

    func cancelOrder(id: String) async -> Bool {
        isLoading = true
        defer { isLoading = false }
        do {
            let res = try await OrderAPI.cancel(id: id)
            if let idx = orders.firstIndex(where: { $0.id == id }) {
                orders[idx] = res.order
            }
            error = nil
            return true
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
            return false
        }
    }
}
