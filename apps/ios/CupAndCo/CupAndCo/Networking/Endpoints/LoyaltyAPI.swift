import Foundation

/// Loyalty endpoints: fetch balance/history, redeem QR code.
enum LoyaltyAPI {

    static func fetch() async throws -> LoyaltyResponse {
        try await APIClient.shared.get("loyalty")
    }

    struct RedeemResponse: Decodable, Sendable {
        let ok: Bool
        let pointsAdded: Int?
        let balance: Int?

        enum CodingKeys: String, CodingKey {
            case ok
            case pointsAdded = "points_added"
            case balance
        }
    }

    struct RedeemInput: Encodable, Sendable {
        let code: String
    }

    static func redeemQR(code: String) async throws -> RedeemResponse {
        try await APIClient.shared.post("loyalty/redeem-qr", body: RedeemInput(code: code))
    }
}
