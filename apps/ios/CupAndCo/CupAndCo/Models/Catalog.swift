import Foundation

/// Lightweight kiosk status object.  Phase 1 uses only `isOpen` for a
/// closed-banner; full schedule rendering arrives in Phase 2.
struct KioskStatus: Codable, Equatable, Sendable {
    let id: String
    let isOpen: Bool
    let messageEn: String?
    let messageAr: String?

    enum CodingKeys: String, CodingKey {
        case id
        case isOpen     = "is_open"
        case messageEn  = "message_en"
        case messageAr  = "message_ar"
    }
}

/// Active offer (e.g. the "70% OFF Today Only" hero card).
/// We keep this loose — only the fields needed by the home promo card
/// are decoded strictly; everything else is optional.
struct Offer: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let nameEn: String
    let nameAr: String
    let type: String
    let value: Double

    enum CodingKeys: String, CodingKey {
        case id, type, value
        case nameEn = "name_en"
        case nameAr = "name_ar"
    }
}

/// `GET /catalog` response.  Mirrors `CatalogResponse` from `packages/types`.
struct CatalogResponse: Codable, Equatable, Sendable {
    let categories: [Category]
    let products: [Product]
    let offers: [Offer]
    let kiosk: KioskStatus?
}
