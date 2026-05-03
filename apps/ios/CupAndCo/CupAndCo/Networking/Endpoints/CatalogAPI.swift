import Foundation

/// `GET /catalog` — categories, products, offers, and kiosk status.
enum CatalogAPI {
    static func fetch() async throws -> CatalogResponse {
        try await APIClient.shared.get("catalog")
    }
}
