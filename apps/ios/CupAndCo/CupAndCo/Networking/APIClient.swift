import Foundation

/// Errors surfaced to the UI layer.  Specific enough for a localized
/// message, generic enough to avoid leaking transport details.
enum APIError: Error, LocalizedError, Sendable {
    case transport(Error)
    case decoding(Error)
    case http(Int, String?)
    case unauthorized
    case offline

    var errorDescription: String? {
        switch self {
        case .transport: return NSLocalizedString("error.network", comment: "")
        case .decoding:  return NSLocalizedString("error.decoding", comment: "")
        case .http(let code, let msg):
            return msg ?? "HTTP \(code)"
        case .unauthorized: return NSLocalizedString("error.unauthorized", comment: "")
        case .offline:      return NSLocalizedString("error.offline", comment: "")
        }
    }
}

/// Empty body marker for `post` calls that don't send JSON.
struct EmptyBody: Encodable, Sendable {}

/// Empty response marker.
struct EmptyResponse: Decodable, Sendable {}

/// Server error envelope.  Express returns `{ error, details? }`.
private struct ServerError: Decodable {
    let error: String?
}

/// Thin HTTP client for the Cup & Co Express API.
/// `Sendable` so we can use it across actors under strict concurrency.
final class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(baseURL: URL = {
             let plist = Bundle.main.infoDictionary?["API_BASE_URL"] as? String ?? "http://localhost:4000"
             return URL(string: plist)!
         }(),
         session: URLSession? = nil) {
        self.baseURL = baseURL
        if let session {
            self.session = session
        } else {
            // Bound transport timeouts: 15s for request, 30s for total resource.
            // SSE streams override this on a per-request basis if needed.
            let cfg = URLSessionConfiguration.default
            cfg.timeoutIntervalForRequest = 15
            cfg.timeoutIntervalForResource = 30
            self.session = URLSession(configuration: cfg)
        }
        self.decoder = JSONDecoder()
        // The API uses snake_case directly; our models declare `CodingKeys`
        // explicitly so we keep the default key strategy.
        self.encoder = JSONEncoder()
    }

    // MARK: - Public

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await send(path: path, method: "GET", body: Optional<EmptyBody>.none)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await send(path: path, method: "POST", body: body)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        try await send(path: path, method: "POST", body: Optional<EmptyBody>.none)
    }

    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await send(path: path, method: "PATCH", body: body)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await send(path: path, method: "DELETE", body: Optional<EmptyBody>.none)
    }

    /// DELETE with a JSON body. Most REST stacks (including Express +
    /// `express.json()`) read the body even on DELETE requests, which is
    /// what `/push/register` expects.
    func deleteWithBody<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        try await send(path: path, method: "DELETE", body: body)
    }

    // MARK: - Internal

    private func send<T: Decodable, B: Encodable>(path: String,
                                                  method: String,
                                                  body: B?) async throws -> T {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            do {
                req.httpBody = try encoder.encode(body)
            } catch {
                throw APIError.decoding(error)
            }
        }
        attachAuth(&req)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch let error as URLError where error.code == .notConnectedToInternet {
            throw APIError.offline
        } catch {
            throw APIError.transport(error)
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        switch status {
        case 200..<300:
            // 204 / empty body — only valid if the caller asked for `EmptyResponse`.
            if data.isEmpty, T.self == EmptyResponse.self {
                // swiftlint:disable:next force_cast
                return EmptyResponse() as! T
            }
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decoding(error)
            }
        case 401:
            throw APIError.unauthorized
        default:
            let server = try? decoder.decode(ServerError.self, from: data)
            throw APIError.http(status, server?.error)
        }
    }

    private func attachAuth(_ req: inout URLRequest) {
        if let token = AuthStore.shared.token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    // MARK: - Server-Sent Events

    /// Streams `data:` events from `path`. Yields each parsed JSON payload
    /// of type `T`. Throws on transport failure so callers can reconnect.
    func streamSSE<T: Decodable>(_ path: String, type: T.Type) -> AsyncThrowingStream<T, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                var req = URLRequest(url: baseURL.appendingPathComponent(path))
                req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                attachAuth(&req)
                do {
                    let (bytes, response) = try await session.bytes(for: req)
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    guard (200..<300).contains(status) else {
                        continuation.finish(throwing: APIError.http(status, nil))
                        return
                    }
                    for try await line in bytes.lines {
                        if Task.isCancelled { break }
                        guard line.hasPrefix("data:") else { continue }
                        let json = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        guard !json.isEmpty,
                              let data = json.data(using: .utf8),
                              let payload = try? decoder.decode(T.self, from: data) else { continue }
                        continuation.yield(payload)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
