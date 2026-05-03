import Foundation

/// `POST /auth/otp/send` and `POST /auth/otp/verify`.
enum AuthAPI {

    // MARK: - Send

    struct SendRequest: Encodable, Sendable {
        let phone: String
    }

    struct SendResponse: Decodable, Sendable {
        let ok: Bool
        let phone: String
        /// Dev-only echo of the OTP — only present when the API runs in dev mode.
        let devCode: String?

        enum CodingKeys: String, CodingKey {
            case ok, phone
            case devCode = "devCode"
        }
    }

    static func send(phone: String) async throws -> SendResponse {
        try await APIClient.shared.post("auth/otp/send",
                                        body: SendRequest(phone: phone))
    }

    // MARK: - Verify

    struct VerifyRequest: Encodable, Sendable {
        let phone: String
        let code: String
    }

    struct VerifyResponse: Decodable, Sendable {
        let token: String
        let user: User
    }

    static func verify(phone: String, code: String) async throws -> VerifyResponse {
        try await APIClient.shared.post("auth/otp/verify",
                                        body: VerifyRequest(phone: phone, code: code))
    }
}
