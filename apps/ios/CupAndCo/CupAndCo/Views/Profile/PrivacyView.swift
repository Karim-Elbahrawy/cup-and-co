import SwiftUI
import UIKit

/// Privacy & data screen — SHIP-PLAN 1.5.
///
/// Required by App Store guideline 5.1.1(v) (in-app account deletion) and
/// granted by Egypt PDPL Law 151/2020 (right to erasure + data portability).
///
/// UX mirrors the web reference at
/// `apps/customer-web/src/app/(authed)/profile/privacy/page.tsx`.
///
/// Two surfaces:
///   1. "Your data" — single button kicks off `POST /me/data/export`,
///      polls `GET /me/data/exports/:jobId` every 3 s, then offers a
///      share-sheet handle to the JSON bundle.
///   2. "Delete account" — flows through the OTP-confirmed soft-delete
///      path (`delete-request` → `delete-confirm`) and lets the user
///      `cancel-deletion` while the 30-day grace period is open.
struct PrivacyView: View {
    // MARK: - State

    @State private var status: AccountAPI.AccountDeletionStatus?

    // Export
    private enum ExportPhase: Equatable {
        case idle
        case preparing(jobId: String?)
        case ready(localFileURL: URL)
        case rateLimited
        case error(String)
    }
    @State private var exportPhase: ExportPhase = .idle
    @State private var exportShareItems: [URL]? = nil

    // Delete flow
    private enum DeleteStage: Equatable {
        case idle
        case confirming                  // alert showing
        case awaitingCode(devCode: String?)
        case submittingCode
        case succeeded(graceDays: Int)
        case error(String)
    }
    @State private var deleteStage: DeleteStage = .idle
    @State private var deleteCode: String = ""
    @State private var showConfirmAlert: Bool = false
    @State private var cancellingDeletion: Bool = false

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("privacy.intro")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(CupColors.cocoa)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                if let s = status, s.isPending {
                    pendingDeletionBanner(daysRemaining: s.daysRemaining ?? (s.graceDays ?? 30))
                }

                // Section 1 — Your data
                exportCard
                    .padding(.horizontal, 20)

                // Section 2 — Delete account (hidden once already pending)
                if !(status?.isPending ?? false) {
                    deleteCard
                        .padding(.horizontal, 20)
                }
            }
            .padding(.bottom, 24)
        }
        .background(CupColors.paper.ignoresSafeArea())
        .navigationTitle(Text("privacy.title"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadStatus() }
        .alert(Text("privacy.deleteConfirmTitle"),
               isPresented: $showConfirmAlert) {
            Button("privacy.deleteConfirmCTA", role: .destructive) {
                Task { await startDeletion() }
            }
            Button("common.cancel", role: .cancel) {}
        } message: {
            Text("privacy.deleteConfirmBody")
        }
        .sheet(isPresented: codeSheetBinding) {
            deleteCodeSheet
        }
        .sheet(isPresented: shareSheetBinding) {
            if let items = exportShareItems {
                ShareSheet(activityItems: items)
            }
        }
    }

    // MARK: - Pending deletion banner

    private func pendingDeletionBanner(daysRemaining: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "exclamationmark.shield.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(CupColors.error)
                VStack(alignment: .leading, spacing: 6) {
                    Text("privacy.deletePendingTitle")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.error)
                    Text(String(format: NSLocalizedString("privacy.deletePendingBody",
                                                          comment: ""),
                                daysRemaining))
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.cocoa)
                }
                Spacer(minLength: 0)
            }
            Button {
                Task { await cancelDeletion() }
            } label: {
                HStack {
                    if cancellingDeletion {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.uturn.backward")
                    }
                    Text("privacy.deleteCancelCTA")
                }
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(CupColors.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(cancellingDeletion)
        }
        .padding(16)
        .background(CupColors.error.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(CupColors.error.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }

    // MARK: - Export card

    private var exportCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "tray.and.arrow.down.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(CupColors.primary)
                VStack(alignment: .leading, spacing: 6) {
                    Text("privacy.exportSection")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("privacy.exportDescription")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.cocoa)
                }
                Spacer(minLength: 0)
            }

            switch exportPhase {
            case .idle:
                exportPrimaryButton
            case .preparing:
                HStack(spacing: 10) {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(CupColors.primary)
                    Text("privacy.exportPreparing")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
            case .ready(let url):
                VStack(alignment: .leading, spacing: 8) {
                    Text("privacy.exportReady")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.success)
                    Text(String(format: NSLocalizedString("privacy.exportSavedTo", comment: ""),
                                url.lastPathComponent))
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                    Button {
                        exportShareItems = [url]
                    } label: {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("privacy.exportShare")
                        }
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(CupColors.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            case .rateLimited:
                Text("privacy.exportRateLimited")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(CupColors.star)
            case .error(let message):
                VStack(alignment: .leading, spacing: 8) {
                    Text(message)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.error)
                    exportPrimaryButton
                }
            }
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    private var exportPrimaryButton: some View {
        Button {
            Task { await runExport() }
        } label: {
            HStack {
                Image(systemName: "arrow.down.doc.fill")
                Text("privacy.exportButton")
            }
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundStyle(CupColors.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(CupColors.primaryTint.opacity(0.4))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(CupColors.primary.opacity(0.4), lineWidth: 1)
            )
        }
    }

    // MARK: - Delete card

    private var deleteCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "trash.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(CupColors.error)
                VStack(alignment: .leading, spacing: 6) {
                    Text("privacy.deleteSection")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.error)
                    Text("privacy.deleteDescription")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.cocoa)
                }
                Spacer(minLength: 0)
            }

            // Inline messaging beneath the button
            switch deleteStage {
            case .idle, .confirming:
                EmptyView()
            case .awaitingCode, .submittingCode:
                Text("privacy.deleteCodeBody")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            case .succeeded(let graceDays):
                Text(String(format: NSLocalizedString("privacy.deletePendingBody", comment: ""),
                            graceDays))
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.error)
            case .error(let message):
                Text(message)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(CupColors.error)
            }

            Button {
                showConfirmAlert = true
            } label: {
                HStack {
                    if case .submittingCode = deleteStage {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(CupColors.error)
                    } else {
                        Image(systemName: "exclamationmark.triangle.fill")
                    }
                    Text("privacy.deleteButton")
                }
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.error)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(CupColors.error.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(CupColors.error.opacity(0.4), lineWidth: 1)
                )
            }
            .disabled(deleteStage.isInFlight || (status?.isPending ?? false))
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(CupColors.error.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Code entry sheet

    private var deleteCodeSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("privacy.deleteCodeTitle")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Text("privacy.deleteCodeBody")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                    .multilineTextAlignment(.center)

                if case .awaitingCode(let devCode) = deleteStage,
                   let code = devCode, !code.isEmpty {
                    Text(String(format: NSLocalizedString("privacy.deleteDevCode", comment: ""), code))
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundStyle(CupColors.star)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(CupColors.star.opacity(0.12))
                        .clipShape(Capsule())
                }

                TextField(NSLocalizedString("privacy.deleteCodePlaceholder", comment: ""),
                          text: $deleteCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .font(.system(size: 22, weight: .semibold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 14)
                    .padding(.horizontal, 16)
                    .background(CupColors.paper)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(CupColors.stroke, lineWidth: 1)
                    )
                    .onChange(of: deleteCode) { _, newValue in
                        let digits = newValue.filter(\.isNumber).prefix(6)
                        if digits.count != newValue.count {
                            deleteCode = String(digits)
                        }
                    }

                if case .error(let message) = deleteStage {
                    Text(message)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.error)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await confirmDeletion() }
                } label: {
                    HStack {
                        if case .submittingCode = deleteStage {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                        }
                        Text("privacy.deleteFinalConfirm")
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(deleteCode.count == 6 ? CupColors.error : CupColors.error.opacity(0.4))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .disabled(deleteCode.count != 6 || isSubmittingCode)

                Spacer()
            }
            .padding(20)
            .background(CupColors.paper.ignoresSafeArea())
            .navigationTitle(Text("privacy.deleteCodeTitle"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("common.cancel") {
                        deleteStage = .idle
                        deleteCode = ""
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Bindings & helpers

    private var codeSheetBinding: Binding<Bool> {
        Binding(
            get: {
                switch deleteStage {
                case .awaitingCode, .submittingCode: return true
                case .error where !deleteCode.isEmpty: return true
                default: return false
                }
            },
            set: { isOn in
                if !isOn {
                    deleteStage = .idle
                    deleteCode = ""
                }
            }
        )
    }

    private var shareSheetBinding: Binding<Bool> {
        Binding(
            get: { exportShareItems != nil },
            set: { isOn in if !isOn { exportShareItems = nil } }
        )
    }

    private var isSubmittingCode: Bool {
        if case .submittingCode = deleteStage { return true }
        return false
    }

    // MARK: - Network actions

    private func loadStatus() async {
        do {
            status = try await AccountAPI.accountStatus()
        } catch {
            // Treat as active by default — the worst case is we show the
            // delete button to a user whose account is already pending,
            // which the server then 403s on the second request.
            status = AccountAPI.AccountDeletionStatus(
                status: "active",
                deletionRequestedAt: nil,
                deletedAt: nil,
                graceUntil: nil,
                graceDays: nil
            )
        }
    }

    /// Kick off an export, then poll every 3 s until the job is `done`,
    /// `failed`, or we've waited two minutes.
    private func runExport() async {
        exportPhase = .preparing(jobId: nil)
        do {
            let job = try await AccountAPI.requestExport()
            exportPhase = .preparing(jobId: job.jobId)

            if job.isDone {
                await downloadAndPersist(job: job)
                return
            }

            // Poll
            let started = Date()
            while Date().timeIntervalSince(started) < 120 {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                if Task.isCancelled { return }
                do {
                    let next = try await AccountAPI.exportStatus(jobId: job.jobId)
                    if next.isDone {
                        await downloadAndPersist(job: next)
                        return
                    }
                    if next.isFailed {
                        exportPhase = .error(next.error ??
                            NSLocalizedString("privacy.exportError", comment: ""))
                        return
                    }
                } catch {
                    // Transient network blip — keep polling unless the
                    // server told us to stop.
                    if let apiErr = error as? APIError, case .http(let code, _) = apiErr,
                       code == 401 || code == 403 || code == 404 {
                        exportPhase = .error(NSLocalizedString("privacy.exportError", comment: ""))
                        return
                    }
                }
            }
            exportPhase = .error(NSLocalizedString("privacy.exportError", comment: ""))
        } catch let APIError.http(code, _) where code == 429 {
            exportPhase = .rateLimited
        } catch {
            exportPhase = .error(NSLocalizedString("privacy.exportError", comment: ""))
        }
    }

    /// Fetch the JSON file body using the authenticated session and stash
    /// it in the app's Caches directory so iOS can hand it to the share
    /// sheet (which expects a real on-disk file).
    private func downloadAndPersist(job: AccountAPI.DataExportJob) async {
        do {
            let urlString = try await AccountAPI.exportDownloadURL(jobId: job.jobId)
            let absolute = absoluteURL(forServerPath: urlString)
            var req = URLRequest(url: absolute)
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            if let token = AuthStore.shared.token {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                exportPhase = .error(NSLocalizedString("privacy.exportError", comment: ""))
                return
            }
            let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            let filename = "cup-and-co-data-\(job.jobId).json"
            let fileURL = caches.appendingPathComponent(filename)
            try data.write(to: fileURL, options: .atomic)
            exportPhase = .ready(localFileURL: fileURL)
        } catch {
            exportPhase = .error(NSLocalizedString("privacy.exportError", comment: ""))
        }
    }

    /// Resolve a server-relative URL against the API base. We hold the
    /// base URL in `Info.plist[API_BASE_URL]` (see `APIClient`).
    private func absoluteURL(forServerPath path: String) -> URL {
        if let direct = URL(string: path), direct.scheme != nil { return direct }
        let base = (Bundle.main.infoDictionary?["API_BASE_URL"] as? String) ?? "http://localhost:4000"
        let trimmedBase = base.hasSuffix("/") ? String(base.dropLast()) : base
        let trimmedPath = path.hasPrefix("/") ? path : "/" + path
        return URL(string: trimmedBase + trimmedPath) ?? URL(string: base)!
    }

    private func startDeletion() async {
        deleteStage = .submittingCode  // briefly mark as in-flight while we request the OTP
        do {
            let res = try await AccountAPI.requestDeletion()
            deleteStage = .awaitingCode(devCode: res.devCode)
        } catch {
            deleteStage = .error(NSLocalizedString("privacy.deleteError", comment: ""))
        }
    }

    private func confirmDeletion() async {
        guard deleteCode.count == 6 else {
            deleteStage = .error(NSLocalizedString("privacy.deleteInvalidCode", comment: ""))
            return
        }
        deleteStage = .submittingCode
        do {
            let res = try await AccountAPI.confirmDeletion(code: deleteCode)
            // Re-read status so the banner appears.
            await loadStatus()
            deleteStage = .succeeded(graceDays: res.graceDays ?? 30)
            deleteCode = ""
        } catch let APIError.http(code, _) where code == 401 {
            deleteStage = .error(NSLocalizedString("privacy.deleteInvalidCode", comment: ""))
        } catch {
            deleteStage = .error(NSLocalizedString("privacy.deleteError", comment: ""))
        }
    }

    private func cancelDeletion() async {
        cancellingDeletion = true
        defer { cancellingDeletion = false }
        do {
            _ = try await AccountAPI.cancelDeletion()
            await loadStatus()
            deleteStage = .idle
        } catch {
            // Surface the failure; user can retry.
            status = status  // no-op; let the banner re-render via state mutation if needed
        }
    }
}

// MARK: - DeleteStage helpers

private extension PrivacyView.DeleteStage {
    var isInFlight: Bool {
        switch self {
        case .submittingCode: return true
        default: return false
        }
    }
}

// MARK: - UIActivityViewController wrapper

/// Minimal UIKit wrapper so we can offer the user a real share sheet for
/// the JSON export bundle. AirDrop, Files, Mail, etc. all work out of the
/// box.
private struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [URL]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationStack {
        PrivacyView()
    }
}
