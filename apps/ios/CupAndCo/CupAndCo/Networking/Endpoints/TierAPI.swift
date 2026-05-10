import Foundation

/// Loyalty tier — mirrors the API's `'bronze' | 'silver' | 'gold'` literal
/// in `apps/api/src/services/tierEngine.ts`.
///
/// Decoded as a lowercase string off the wire. Conformance to
/// `CaseIterable` lets previews iterate every tier without hardcoding.
enum LoyaltyTier: String, Codable, Sendable, CaseIterable, Equatable {
    case bronze
    case silver
    case gold

    /// Localization key for the tier name (e.g. `tier.bronze`).
    var localizationKey: String { "tier.\(rawValue)" }
}

/// `GET /me/tier` — current tier + benefits + points-to-next.
///
/// Endpoint definition is in `apps/api/src/app.ts`:
///
///   res.json({
///     tier, tierCalculatedAt, trailing12mPoints, benefits,
///     nextTier, pointsToNext, history,
///   });
///
/// We only decode the fields the iOS UI actually renders today; the rest
/// (`tierCalculatedAt`, `history`) ship as raw JSON if we ever need them.
enum TierAPI {

    /// Per-tier benefits, mirrors `TierBenefits` server-side.
    struct TierBenefits: Decodable, Sendable, Equatable {
        let tier: LoyaltyTier
        let multiplier: Double
        let freeUpsizesPerMonth: Int
        let birthdayDrinkFree: Bool
        let kdsPriority: Bool
    }

    /// Response envelope from `GET /me/tier`. Optional fields are tolerated
    /// so an older API revision can't break the iOS build.
    struct TierResponse: Decodable, Sendable, Equatable {
        let tier: LoyaltyTier
        let trailing12mPoints: Int
        let nextTier: LoyaltyTier?
        let pointsToNext: Int?
        let benefits: TierBenefits?
    }

    /// Hits `GET /me/tier`. Caller is expected to handle `APIError`.
    static func currentTier() async throws -> TierResponse {
        try await APIClient.shared.get("me/tier")
    }
}
