import Foundation

struct Product: Codable, Identifiable, Equatable, Sendable, Hashable {
    let id: String
    let categoryId: String
    let nameEn: String
    let nameAr: String
    let descriptionEn: String
    let descriptionAr: String
    let basePriceEgp: Double
    let imageUrl: String
    let prepMinutes: Int
    let isAvailable: Bool
    let sortOrder: Int
    let ratingAvg: Double
    let ratingCount: Int

    func localizedName(_ language: LanguagePref) -> String {
        language == .ar ? nameAr : nameEn
    }

    func localizedDescription(_ language: LanguagePref) -> String {
        language == .ar ? descriptionAr : descriptionEn
    }

    /// Human-friendly price string.  We don't bother with `NumberFormatter`
    /// here — the API returns whole EGP values for catalog items.
    var priceLabel: String {
        let int = Int(basePriceEgp.rounded())
        return "EGP \(int)"
    }

    enum CodingKeys: String, CodingKey {
        case id
        case categoryId      = "category_id"
        case nameEn          = "name_en"
        case nameAr          = "name_ar"
        case descriptionEn   = "description_en"
        case descriptionAr   = "description_ar"
        case basePriceEgp    = "base_price_egp"
        case imageUrl        = "image_url"
        case prepMinutes     = "prep_minutes"
        case isAvailable     = "is_available"
        case sortOrder       = "sort_order"
        case ratingAvg       = "rating_avg"
        case ratingCount     = "rating_count"
    }
}
