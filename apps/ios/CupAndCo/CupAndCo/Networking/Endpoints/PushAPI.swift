import Foundation

/// `POST /push/register`, `DELETE /push/register`. Server expects:
///   { platform: 'ios' | 'web', token: string }
/// The DELETE body only carries `{ token }`. The Express handler keys the
/// device list by JWT user, so no extra `bundleId` field is needed —
/// SHIP-PLAN 1.1 mentioned including it, but the API doesn't accept it,
/// so we keep the request to exactly what the server validates.
enum PushAPI {

    struct RegisterInput: Encodable, Sendable {
        let platform: String
        let token: String
    }

    struct UnregisterInput: Encodable, Sendable {
        let token: String
    }

    struct RegisterResponse: Decodable, Sendable {
        let ok: Bool
        let registered: Int
    }

    struct UnregisterResponse: Decodable, Sendable {
        let ok: Bool
    }

    /// Upload the APNs device token (hex string) to the API. Idempotent —
    /// the server de-duplicates per user + token.
    static func register(deviceToken: String) async throws -> RegisterResponse {
        let body = RegisterInput(platform: "ios", token: deviceToken)
        return try await APIClient.shared.post("push/register", body: body)
    }

    /// Tell the API to forget this token. Used when the user flips the
    /// Profile toggle off (the OS-level permission stays intact — only
    /// the user can revoke that, in iOS Settings).
    static func unregister(deviceToken: String) async throws -> UnregisterResponse {
        // Express's `app.delete` reads the body via the JSON middleware, so
        // we can pass it like any other JSON request.
        let body = UnregisterInput(token: deviceToken)
        return try await APIClient.shared.deleteWithBody("push/register", body: body)
    }
}
