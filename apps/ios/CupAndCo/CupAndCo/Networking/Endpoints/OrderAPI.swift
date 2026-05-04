import Foundation

/// Order endpoints: create, list, get, cancel.
enum OrderAPI {

    // MARK: - Create

    struct CreateItemInput: Encodable, Sendable {
        let productId: String
        let quantity: Int
        let options: [String: String]

        enum CodingKeys: String, CodingKey {
            case productId = "product_id"
            case quantity, options
        }
    }

    struct CreateInput: Encodable, Sendable {
        let fulfillmentType: String
        let paymentMethod: String
        let scheduledFor: String?
        let redeemPoints: Int
        let notes: String?
        let items: [CreateItemInput]

        enum CodingKeys: String, CodingKey {
            case fulfillmentType = "fulfillment_type"
            case paymentMethod   = "payment_method"
            case scheduledFor    = "scheduled_for"
            case redeemPoints    = "redeem_points"
            case notes, items
        }
    }

    static func create(input: CreateInput) async throws -> OrderResponse {
        try await APIClient.shared.post("orders", body: input)
    }

    // MARK: - List

    static func list() async throws -> OrdersListResponse {
        try await APIClient.shared.get("orders")
    }

    // MARK: - Get

    static func get(id: String) async throws -> OrderResponse {
        try await APIClient.shared.get("orders/\(id)")
    }

    // MARK: - Cancel

    static func cancel(id: String) async throws -> OrderResponse {
        try await APIClient.shared.post("orders/\(id)/cancel")
    }
}
