import Foundation
import Observation

/// In-memory catalog cache, refreshed on app open and on pull-to-refresh.
@MainActor
@Observable
final class CatalogStore {

    var categories: [Category] = []
    var products: [Product] = []
    var offers: [Offer] = []
    var kiosk: KioskStatus?

    var isLoading: Bool = false
    var error: String?

    /// Fetch the full catalog. Idempotent — safe to call repeatedly.
    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let res = try await CatalogAPI.fetch()
            self.categories = res.categories.sorted { $0.sortOrder < $1.sortOrder }
            self.products = res.products
                .filter { $0.isAvailable }
                .sorted { $0.sortOrder < $1.sortOrder }
            self.offers = res.offers
            self.kiosk = res.kiosk
            self.error = nil
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }

    /// "Popular" products for the home grid.  Phase 1 heuristic: top 6 by
    /// rating, falling back to first 6 if ratings are missing.
    var popular: [Product] {
        let rated = products.filter { $0.ratingCount > 0 }
        let pool = rated.isEmpty ? products : rated
        return Array(pool.sorted { $0.ratingAvg > $1.ratingAvg }.prefix(6))
    }

    /// The first active offer with a numeric value — drives the hero card.
    var heroOffer: Offer? {
        offers.first { $0.type == "percentage" } ?? offers.first
    }
}
