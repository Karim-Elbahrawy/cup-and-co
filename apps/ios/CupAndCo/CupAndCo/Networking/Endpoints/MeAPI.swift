import Foundation

/// `GET /me` — currently authenticated user + loyalty balance.
enum MeAPI {
    struct Response: Decodable, Sendable {
        let user: User
        let points: Int?
    }

    static func fetch() async throws -> Response {
        try await APIClient.shared.get("me")
    }
}
