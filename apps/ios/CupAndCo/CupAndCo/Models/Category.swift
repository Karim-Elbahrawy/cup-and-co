import Foundation

struct Category: Codable, Identifiable, Equatable, Sendable, Hashable {
    let id: String
    let slug: String
    let nameEn: String
    let nameAr: String
    let sortOrder: Int

    /// Localized display name based on the user's current `language_pref`.
    func localizedName(_ language: LanguagePref) -> String {
        language == .ar ? nameAr : nameEn
    }

    enum CodingKeys: String, CodingKey {
        case id, slug
        case nameEn = "name_en"
        case nameAr = "name_ar"
        case sortOrder = "sort_order"
    }
}
