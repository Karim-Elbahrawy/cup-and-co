import Foundation

// MARK: - Models

struct GameSession: Codable, Sendable {
    let id: String
    let userId: String
    let serverMaxScore: Int
    let weekKey: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "userId"
        case serverMaxScore = "serverMaxScore"
        case weekKey = "weekKey"
    }
}

struct SubmitScoreInput: Encodable, Sendable {
    let sessionId: String
    let score: Int
    let durationSeconds: Double

    enum CodingKeys: String, CodingKey {
        case sessionId = "sessionId"
        case score
        case durationSeconds = "durationSeconds"
    }
}

struct SubmitScoreResult: Codable, Sendable {
    let accepted: Bool
    let pointsAwarded: Int
    let weekKey: String

    enum CodingKeys: String, CodingKey {
        case accepted
        case pointsAwarded = "pointsAwarded"
        case weekKey = "weekKey"
    }
}

struct LeaderboardEntry: Codable, Identifiable, Sendable {
    var id: String { userId }
    let rank: Int
    let userId: String
    let totalScore: Int
    let weekKey: String

    enum CodingKeys: String, CodingKey {
        case rank
        case userId = "userId"
        case totalScore = "totalScore"
        case weekKey = "weekKey"
    }
}

struct LeaderboardResponse: Codable, Sendable {
    let entries: [LeaderboardEntry]
}

struct MyRankResponse: Codable, Sendable {
    let rank: Int?
    let totalScore: Int?
    let weekKey: String

    enum CodingKeys: String, CodingKey {
        case rank
        case totalScore = "totalScore"
        case weekKey = "weekKey"
    }
}

struct Prize: Codable, Identifiable, Sendable {
    let id: String
    let rank: Int
    let type: String
    let description: String
    let code: String
    let redeemedAt: String?
    let expiresAt: String
    let weekKey: String

    enum CodingKeys: String, CodingKey {
        case id, rank, type, description, code
        case redeemedAt = "redeemedAt"
        case expiresAt = "expiresAt"
        case weekKey = "weekKey"
    }
}

struct PrizesResponse: Codable, Sendable {
    let prizes: [Prize]
}

// MARK: - API

enum GameAPI {

    static func startSession() async throws -> GameSession {
        try await APIClient.shared.post("game/session")
    }

    static func submitScore(sessionId: String, score: Int, durationSeconds: Double) async throws -> SubmitScoreResult {
        let input = SubmitScoreInput(sessionId: sessionId, score: score, durationSeconds: durationSeconds)
        return try await APIClient.shared.post("game/score", body: input)
    }

    static func leaderboard() async throws -> LeaderboardResponse {
        try await APIClient.shared.get("game/leaderboard")
    }

    static func myRank() async throws -> MyRankResponse {
        try await APIClient.shared.get("game/rank")
    }

    static func prizes() async throws -> PrizesResponse {
        try await APIClient.shared.get("game/prizes")
    }
}
