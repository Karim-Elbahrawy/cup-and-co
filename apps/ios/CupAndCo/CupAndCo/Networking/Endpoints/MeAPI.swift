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

    struct PatchInput: Encodable, Sendable {
        let gender: String?
        let avatarId: Int?

        enum CodingKeys: String, CodingKey {
            case gender
            case avatarId = "avatar_id"
        }
    }

    static func patch(_ input: PatchInput) async throws -> Response {
        try await APIClient.shared.patch("me", body: input)
    }
}
