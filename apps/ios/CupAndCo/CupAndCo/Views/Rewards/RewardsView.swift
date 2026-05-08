import SwiftUI

struct RewardsView: View {
    @Environment(SessionStore.self) private var session
    @State private var loyalty: LoyaltyResponse?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showScanner = false
    @State private var scanResult: String?
    @State private var showGame = false

    // Dynamic Type
    @ScaledMetric(relativeTo: .largeTitle) private var balanceSize: CGFloat = 48
    @ScaledMetric(relativeTo: .body) private var balanceLabelSize = CupTypography.bodyMd

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                balanceCard
                if session.user?.role == .student {
                    gameSection
                }
                qrSection
                leaderboardSection
                historySection
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 100)
        }
        .background(CupColors.paper.ignoresSafeArea())
        .navigationTitle("Rewards")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadLoyalty() }
        .refreshable { await loadLoyalty() }
        .sheet(isPresented: $showScanner) {
            QRScannerView { code in
                showScanner = false
                Task { await redeemCode(code) }
            }
        }
        .sheet(isPresented: $showGame) {
            NavigationStack {
                GameView()
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") { showGame = false }
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundStyle(CupColors.primary)
                        }
                    }
            }
        }
        .overlay {
            if let result = scanResult {
                scanResultToast(result)
            }
        }
    }

    // MARK: - Balance Card

    private var balanceCard: some View {
        VStack(spacing: 12) {
            if isLoading {
                ProgressView()
                    .frame(height: 120)
            } else if let loyalty {
                ZStack {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: CupColors.sunriseStops,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    VStack(spacing: 8) {
                        Text("Your Points")
                            .font(.system(size: balanceLabelSize, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.85))
                        Text("\(loyalty.balance)")
                            .font(.system(size: balanceSize, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        if loyalty.discountAvailableEgp > 0 {
                            Text("= \(Int(loyalty.discountAvailableEgp)) EGP discount available")
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.8))
                        } else {
                            Text("Earn 100 points for 5 EGP off")
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.7))
                        }
                    }
                    .padding(.vertical, 28)
                }
                .frame(maxWidth: .infinity)
            } else if let error {
                errorView(error)
            }
        }
    }

    // MARK: - Game Section (students only)

    private var gameSection: some View {
        Button {
            showGame = true
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(CupColors.primaryTint)
                        .frame(width: 44, height: 44)
                    Image(systemName: "gamecontroller.fill")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(CupColors.primary)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Play Coffee Collector")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("Earn loyalty points by playing")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(CupColors.muted)
            }
            .padding(16)
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Leaderboard Section

    private var leaderboardSection: some View {
        NavigationLink(destination: LeaderboardView()) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(CupColors.accentTint)
                        .frame(width: 44, height: 44)
                    Image(systemName: "list.number")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(CupColors.accent)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Leaderboard")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("Weekly top players & prizes")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(CupColors.muted)
            }
            .padding(16)
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - QR Section

    private var qrSection: some View {
        Button {
            showScanner = true
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(CupColors.primaryTint)
                        .frame(width: 44, height: 44)
                    Image(systemName: "qrcode.viewfinder")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(CupColors.primary)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Scan QR Receipt")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("Earn points from cash purchases")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(CupColors.muted)
            }
            .padding(16)
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - History

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Points History")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)

            if let loyalty, loyalty.history.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 32))
                        .foregroundStyle(CupColors.muted)
                    Text("No history yet")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                    Text("Place an order or scan a QR receipt to start earning points.")
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            } else if let loyalty {
                LazyVStack(spacing: 0) {
                    ForEach(loyalty.history) { entry in
                        historyRow(entry)
                        if entry.id != loyalty.history.last?.id {
                            Divider().padding(.leading, 52)
                        }
                    }
                }
                .background(CupColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(CupColors.stroke, lineWidth: 1)
                )
            }
        }
    }

    private func historyRow(_ entry: LoyaltyEntry) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(entry.points >= 0 ? CupColors.accentTint : CupColors.primaryTint)
                    .frame(width: 36, height: 36)
                Image(systemName: sourceIcon(entry.source))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(entry.points >= 0 ? CupColors.accent : CupColors.primary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(sourceLabel(entry.source))
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Text(formatDate(entry.createdAt))
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            }

            Spacer()

            Text(entry.points >= 0 ? "+\(entry.points)" : "\(entry.points)")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(entry.points >= 0 ? CupColors.accent : CupColors.primary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Helpers

    private func sourceIcon(_ source: String) -> String {
        switch source {
        case "online_paid":  return "creditcard.fill"
        case "cash_in_app":  return "banknote.fill"
        case "qr_receipt":   return "qrcode"
        case "redeemed":     return "gift.fill"
        case "game_reward":  return "gamecontroller.fill"
        default:             return "star.fill"
        }
    }

    private func sourceLabel(_ source: String) -> String {
        switch source {
        case "online_paid":  return "Online Order"
        case "cash_in_app":  return "Cash Order"
        case "qr_receipt":   return "QR Receipt"
        case "redeemed":     return "Redeemed"
        case "game_reward":  return "Game Reward"
        default:             return source
        }
    }

    private func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: iso) else { return iso }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: date)
    }

    private func loadLoyalty() async {
        isLoading = true
        error = nil
        do {
            loyalty = try await LoyaltyAPI.fetch()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
        isLoading = false
    }

    private func redeemCode(_ code: String) async {
        do {
            _ = try await LoyaltyAPI.redeemQR(code: code)
            scanResult = "Points added!"
            await loadLoyalty()
        } catch {
            scanResult = (error as? LocalizedError)?.errorDescription ?? "Failed to redeem"
        }
        try? await Task.sleep(for: .seconds(2.5))
        scanResult = nil
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 28))
                .foregroundStyle(CupColors.primary)
            Text(message)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.muted)
            Button("Retry") { Task { await loadLoyalty() } }
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.primary)
        }
        .padding(.vertical, 24)
    }

    private func scanResultToast(_ message: String) -> some View {
        VStack {
            Spacer()
            Text(message)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(
                    Capsule()
                        .fill(message.contains("added") ? CupColors.accent : CupColors.primary)
                )
                .shadow(color: CupColors.espresso.opacity(0.15), radius: 8, y: 4)
                .padding(.bottom, 100)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: scanResult)
    }
}
