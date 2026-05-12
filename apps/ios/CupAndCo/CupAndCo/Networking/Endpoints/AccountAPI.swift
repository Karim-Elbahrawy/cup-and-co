import Foundation

/// Account lifecycle + data export endpoints.
///
/// Implements the iOS half of `docs/SHIP-PLAN.md` 1.5 — the App Store
/// 5.1.1(v) account-deletion requirement and Egypt PDPL Law 151/2020
/// data-portability right. Mirrors the web flow at
/// `apps/customer-web/src/app/(authed)/profile/privacy/page.tsx`.
///
/// Server endpoints (see `apps/api/src/app.ts`, search for
/// `delete-request` / `data/export`):
///   POST   /me/account/delete-request   — issue OTP, soft-delete request
///   POST   /me/account/delete-confirm   — submit OTP, marks 30-day grace
///   POST   /me/account/cancel-deletion  — undo within grace window
///   GET    /me/account/status           — current state of the account
///   POST   /me/data/export              — start a data export job
///   GET    /me/data/exports/:jobId      — poll job status
///   GET    /me/data/exports/:jobId/download — download URL for the bundle
enum AccountAPI {

    // MARK: - Models

    /// Status of the caller's account. `active` is the normal state;
    /// `deletion_requested` means the user has asked to delete but hasn't
    /// confirmed via OTP; `deletion_pending` means the OTP has been
    /// confirmed and the 30-day grace period is counting down.
    struct AccountDeletionStatus: Decodable, Sendable {
        let status: String
        let deletionRequestedAt: String?
        let deletedAt: String?
        let graceUntil: String?
        let graceDays: Int?

        var isActive: Bool { status == "active" }
        var isPending: Bool { status == "deletion_pending" }
        var isRequested: Bool { status == "deletion_requested" }

        /// Days remaining in the grace period, computed against `graceUntil`.
        /// Returns `nil` if `graceUntil` is missing or unparseable.
        var daysRemaining: Int? {
            guard let until = graceUntil, let date = AccountAPI.parseISO8601(until) else { return nil }
            let interval = date.timeIntervalSinceNow
            if interval <= 0 { return 0 }
            return max(0, Int(ceil(interval / 86_400)))
        }
    }

    /// Response from `POST /me/account/delete-request` — the API issues a
    /// 6-digit OTP and (in dev) returns it inline as `devCode`.
    struct DeletionRequest: Decodable, Sendable {
        let ok: Bool
        let expiresAt: String?
        /// Only populated when the API runs in non-production mode. UI
        /// should surface this to ease test runs without an SMS gateway.
        let devCode: String?
    }

    /// Response from `POST /me/account/delete-confirm` — the soft-delete
    /// has been recorded and the 30-day grace period is now ticking.
    struct DeletionConfirmation: Decodable, Sendable {
        let ok: Bool
        let deletedAt: String?
        let deletionRequestedAt: String?
        let graceUntil: String?
        let graceDays: Int?
        let message: String?
    }

    /// Generic OK envelope used by `cancel-deletion`.
    struct OkResponse: Decodable, Sendable {
        let ok: Bool
        let message: String?
    }

    /// One data-export job. The server creates synchronously today —
    /// `status` is usually `done` immediately — but the UI polls anyway
    /// so the flow keeps working when the export moves to an async edge
    /// function (see SHIP-PLAN Phase 2).
    struct DataExportJob: Decodable, Sendable {
        /// Job identifier, returned by `POST /me/data/export` and accepted
        /// by both the status (`GET /me/data/exports/:jobId`) and the
        /// download (`…/download`) endpoints.
        let jobId: String
        /// `pending` | `processing` | `done` | `failed`.
        let status: String
        let createdAt: String?
        let doneAt: String?
        let expiresAt: String?
        let error: String?
        /// Server-relative URL of the bundle when `status == "done"`.
        let downloadUrl: String?

        // The POST response uses `jobId`; the GET response also uses
        // `jobId`. Decoded plainly — no key remapping needed.

        var isDone: Bool { status == "done" }
        var isFailed: Bool { status == "failed" }
        var isInFlight: Bool { status == "pending" || status == "processing" }
    }

    // MARK: - Account lifecycle

    /// `POST /me/account/delete-request` — issues an OTP. Until the user
    /// submits the OTP via `confirmDeletion`, the account stays active.
    static func requestDeletion() async throws -> DeletionRequest {
        try await APIClient.shared.post("me/account/delete-request")
    }

    struct ConfirmInput: Encodable, Sendable {
        let code: String
    }

    /// `POST /me/account/delete-confirm` — finalize the deletion request.
    /// On success the account enters the 30-day grace state; the JWT
    /// remains valid only for `cancel-deletion` and `account/status`.
    static func confirmDeletion(code: String) async throws -> DeletionConfirmation {
        try await APIClient.shared.post("me/account/delete-confirm",
                                        body: ConfirmInput(code: code))
    }

    /// `POST /me/account/cancel-deletion` — undo within the grace window.
    /// Idempotent on the server side.
    static func cancelDeletion() async throws -> OkResponse {
        try await APIClient.shared.post("me/account/cancel-deletion")
    }

    /// `GET /me/account/status` — read the current state. UI uses this to
    /// decide between the "Request deletion" and "Cancel deletion" CTAs.
    static func accountStatus() async throws -> AccountDeletionStatus {
        try await APIClient.shared.get("me/account/status")
    }

    // MARK: - Data export

    /// `POST /me/data/export` — start a new export job. Server rate-limits
    /// to one per 7 days; throws `APIError.http(429, …)` on cooldown.
    static func requestExport() async throws -> DataExportJob {
        try await APIClient.shared.post("me/data/export")
    }

    /// `GET /me/data/exports/:jobId` — poll for completion.
    static func exportStatus(jobId: String) async throws -> DataExportJob {
        try await APIClient.shared.get("me/data/exports/\(jobId)")
    }

    /// Resolve the absolute URL the OS browser should open for a completed
    /// export. The server's `/download` endpoint requires a Bearer token
    /// in the request header, so we cannot hand the path to Safari raw —
    /// the file would 401. Instead, this returns the value from the JSON
    /// envelope so callers can construct an authorized request flow.
    ///
    /// Today the export payload is a JSON file the server emits
    /// synchronously — we return the *logical* server-relative URL so the
    /// caller can choose whether to download in-app or open externally.
    static func exportDownloadURL(jobId: String) async throws -> String {
        // The download endpoint streams the file directly with attachment
        // headers, so a plain GET that decodes the *body* would fail —
        // instead we re-fetch the export status and surface the
        // server-provided `downloadUrl` (e.g. "/me/data/exports/<id>/download").
        let job: DataExportJob = try await APIClient.shared.get("me/data/exports/\(jobId)")
        guard let url = job.downloadUrl, !url.isEmpty else {
            throw APIError.http(404, "Export download URL not available.")
        }
        return url
    }

    // MARK: - Helpers

    /// Parse an ISO-8601 timestamp emitted by the API. The server uses
    /// `toISOString()` which always carries milliseconds, but we accept
    /// both forms so a future server change doesn't crash the client.
    /// Allocating the formatter inline matches the rest of the iOS
    /// codebase (`OrderTrackingView`, `RewardsView`, etc.) and keeps the
    /// API helper safe under strict-concurrency.
    static func parseISO8601(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }
}
