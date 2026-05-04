import Foundation

/// Favorites endpoints: add / remove a product from the user's favorites.
enum FavoritesAPI {

    static func add(productId: String) async throws -> EmptyResponse {
        try await APIClient.shared.post("favorites/\(productId)")
    }

    static func remove(productId: String) async throws -> EmptyResponse {
        try await APIClient.shared.delete("favorites/\(productId)")
    }
}
