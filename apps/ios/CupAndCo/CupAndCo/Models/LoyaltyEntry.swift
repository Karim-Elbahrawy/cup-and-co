import Foundation

struct LoyaltyEntry: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let source: String
    let orderId: String?
    let points: Int
    let balanceAfter: Int
    let createdAt: String
}

struct LoyaltyResponse: Codable, Sendable {
    let balance: Int
    let discountAvailableEgp: Double
    let history: [LoyaltyEntry]
}
