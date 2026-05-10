import Foundation

/// Streams order updates via Server-Sent Events from
/// `GET /orders/:id/events`. Mirrors the web client's behaviour
/// (`apps/customer-web/src/app/(authed)/orders/[id]/page.tsx`):
///
///   - Connects with `Accept: text/event-stream`.
///   - Parses line-by-line: skips empty lines, skips `:` heartbeats,
///     accumulates `data:` lines until a blank-line terminator, then
///     yields the JSON payload decoded as `OrderResponse`.
///   - Throws on transport / non-2xx errors so callers can fall back
///     to the existing 5-second polling code path.
///
/// The transport is `URLSession.shared.bytes(for:)` — the same building
/// block used by `APIClient.streamSSE` — but we keep the parser local
/// so it accumulates multi-line events properly (the API today only
/// emits single-line `data:` events, but the spec allows multi-line
/// blocks and the web client handles them via a chunked reader).
struct OrderEventStream {

    /// Decoded order payload yielded by the stream — wraps the same
    /// `{ order, timeline }` shape the REST `GET /orders/:id` endpoint
    /// returns, plus an optional `prepEta` field that's irrelevant to
    /// the iOS UI today (kept here so we don't need to re-decode).
    /// We re-use the existing `OrderResponse` model for compatibility
    /// with everything downstream (`OrderStore`, `OrderTrackingView`).
    typealias Update = OrderResponse

    private let orderId: String
    private let baseURL: URL
    private let token: String?
    private let session: URLSession

    init(
        orderId: String,
        baseURL: URL = OrderEventStream.defaultBaseURL(),
        token: String? = AuthStore.shared.token,
        session: URLSession = OrderEventStream.makeStreamingSession()
    ) {
        self.orderId = orderId
        self.baseURL = baseURL
        self.token = token
        self.session = session
    }

    /// Open the stream and yield decoded updates. Errors throw — callers
    /// (e.g. `OrderTrackingView`) treat that as the signal to reconnect
    /// or fall back to polling.
    func updates() -> AsyncThrowingStream<Update, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    var req = URLRequest(url: baseURL.appendingPathComponent("orders/\(orderId)/events"))
                    req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                    if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

                    let (bytes, response) = try await session.bytes(for: req)
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    guard (200..<300).contains(status) else {
                        continuation.finish(throwing: APIError.http(status, nil))
                        return
                    }

                    // Multi-line SSE accumulator. An event is terminated by a
                    // blank line; each `data:` line is appended (joined with
                    // `\n` per the spec).
                    var dataAccumulator = ""
                    let decoder = JSONDecoder()

                    for try await line in bytes.lines {
                        if Task.isCancelled { break }
                        if line.isEmpty {
                            // Event terminator — flush accumulator.
                            guard !dataAccumulator.isEmpty,
                                  let bytes = dataAccumulator.data(using: .utf8) else {
                                dataAccumulator = ""
                                continue
                            }
                            do {
                                let payload = try decoder.decode(Update.self, from: bytes)
                                continuation.yield(payload)
                            } catch {
                                // A malformed frame shouldn't tear the stream
                                // down — log silently and keep going.
                            }
                            dataAccumulator = ""
                        } else if line.hasPrefix(":") {
                            // Comment / heartbeat — skip.
                            continue
                        } else if line.hasPrefix("data:") {
                            let chunk = line
                                .dropFirst(5)
                                .trimmingCharacters(in: .whitespaces)
                            if !dataAccumulator.isEmpty { dataAccumulator.append("\n") }
                            dataAccumulator.append(chunk)
                        }
                        // Other SSE fields (event:, id:, retry:) are ignored
                        // — the API doesn't emit them.
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    // MARK: - Helpers

    /// Pulled from `Info.plist` (`API_BASE_URL`), with the same fallback
    /// the rest of the iOS app uses. Kept here so the streaming session
    /// doesn't depend on `APIClient.shared` being initialized.
    static func defaultBaseURL() -> URL {
        let plist = Bundle.main.infoDictionary?["API_BASE_URL"] as? String ?? "http://localhost:4000"
        return URL(string: plist) ?? URL(string: "http://localhost:4000")!
    }

    /// SSE streams need long-lived connections — much longer than the
    /// 15s/30s defaults `APIClient` uses for one-shot REST. Effectively
    /// disable both timeouts so the stream stays open as long as the
    /// server keeps it open or until the caller cancels.
    static func makeStreamingSession() -> URLSession {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = TimeInterval.greatestFiniteMagnitude
        cfg.timeoutIntervalForResource = TimeInterval.greatestFiniteMagnitude
        return URLSession(configuration: cfg)
    }
}
