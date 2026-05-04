import SwiftUI

struct LeaderboardView: View {
    @Environment(SessionStore.self) private var session
    @State private var leaderboard: LeaderboardResponse?
    @State private var myRank: MyRankResponse?
    @State private var prizes: PrizesResponse?
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if isLoading {
                    ProgressView()
                        .tint(CupColors.primary)
                        .padding(.top, 60)
                } else if let error {
                    errorView(error)
                } else {
                    myRankCard
                    leaderboardSection
                    prizeTiersCard
                    myPrizesSection
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 100)
        }
        .background(CupColors.paper.ignoresSafeArea())
        .navigationTitle("Leaderboard")
        .navigationBarTitleDisplayMode(.large)
        .task { await load() }
        .refreshable { await load() }
    }

    // MARK: - My Rank Card

    private var myRankCard: some View {
        Group {
            if let myRank {
                ZStack {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: CupColors.sunriseStops,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    HStack(spacing: 0) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Your Rank")
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.85))
                            if let rank = myRank.rank {
                                Text("#\(rank)")
                                    .font(.system(size: 40, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white)
                            } else {
                                Text("—")
                                    .font(.system(size: 40, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Score")
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.85))
                            if let total = myRank.totalScore {
                                Text("\(total)")
                                    .font(.system(size: 40, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white)
                            } else {
                                Text("—")
                                    .font(.system(size: 40, weight: .bold, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 22)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Weekly Leaderboard

    private var leaderboardSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("This Week's Top Players")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)

            if let entries = leaderboard?.entries, !entries.isEmpty {
                LazyVStack(spacing: 0) {
                    ForEach(Array(entries.prefix(10))) { entry in
                        leaderboardRow(entry)
                        if entry.userId != entries.prefix(10).last?.userId {
                            Divider().padding(.leading, 56)
                        }
                    }
                }
                .background(CupColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(CupColors.stroke, lineWidth: 1)
                )
            } else {
                emptyState(
                    icon: "list.number",
                    message: "No scores yet this week",
                    subtext: "Play a game to appear on the leaderboard!"
                )
            }
        }
    }

    private func leaderboardRow(_ entry: LeaderboardEntry) -> some View {
        let isMe = entry.userId == session.user?.id
        return HStack(spacing: 12) {
            // Rank medal or number
            Text(rankDisplay(entry.rank))
                .font(.system(size: entry.rank <= 3 ? 22 : 14, weight: .bold, design: .rounded))
                .frame(width: 32)

            // User ID (truncated)
            Text(truncatedId(entry.userId))
                .font(.system(size: 14, weight: isMe ? .bold : .medium, design: .rounded))
                .foregroundStyle(isMe ? CupColors.primary : CupColors.espresso)
                .lineLimit(1)

            Spacer()

            // Score
            Text("\(entry.totalScore)")
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(isMe ? CupColors.primary : CupColors.cocoa)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(isMe ? CupColors.primaryTint.opacity(0.35) : Color.clear)
    }

    private func rankDisplay(_ rank: Int) -> String {
        switch rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return "#\(rank)"
        }
    }

    private func truncatedId(_ userId: String) -> String {
        guard userId.count > 12 else { return userId }
        let prefix = userId.prefix(6)
        let suffix = userId.suffix(4)
        return "\(prefix)…\(suffix)"
    }

    // MARK: - Prize Tiers Info Card

    private var prizeTiersCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Weekly Prizes")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Spacer()
                Text("Resets Sunday")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            }

            VStack(spacing: 0) {
                prizeTierRow(medal: "🥇", label: "1st Place", reward: "Free combo meal")
                Divider().padding(.leading, 52)
                prizeTierRow(medal: "🥈", label: "2nd Place", reward: "Free drink")
                Divider().padding(.leading, 52)
                prizeTierRow(medal: "🥉", label: "3rd Place", reward: "50% off your order")
            }
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
        }
    }

    private func prizeTierRow(medal: String, label: String, reward: String) -> some View {
        HStack(spacing: 12) {
            Text(medal)
                .font(.system(size: 22))
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Text(reward)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - My Prizes

    private var myPrizesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your Prizes")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)

            if let prizeList = prizes?.prizes, !prizeList.isEmpty {
                LazyVStack(spacing: 12) {
                    ForEach(prizeList) { prize in
                        prizeCard(prize)
                    }
                }
            } else {
                emptyState(
                    icon: "gift",
                    message: "No prizes yet",
                    subtext: "Reach the top 3 this week to earn a prize!"
                )
            }
        }
    }

    private func prizeCard(_ prize: Prize) -> some View {
        let redeemed = prize.redeemedAt != nil
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(redeemed ? CupColors.stroke : CupColors.primaryTint)
                        .frame(width: 44, height: 44)
                    Image(systemName: prizeIcon(prize.type))
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(redeemed ? CupColors.muted : CupColors.primary)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(prize.description)
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(redeemed ? CupColors.muted : CupColors.espresso)
                        Spacer()
                        if redeemed {
                            Text("Redeemed")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule().fill(CupColors.muted)
                                )
                        }
                    }
                    Text("Rank \(prize.rank)")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
            }

            // Coupon code
            HStack(spacing: 8) {
                Image(systemName: "ticket.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(redeemed ? CupColors.muted : CupColors.accent)
                Text(prize.code)
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundStyle(redeemed ? CupColors.muted : CupColors.espresso)
                    .tracking(2)
                Spacer()
            }
            .padding(12)
            .background(redeemed ? CupColors.stroke.opacity(0.3) : CupColors.accentTint)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            Text("Expires \(formatExpiry(prize.expiresAt))")
                .font(.system(size: 12, design: .rounded))
                .foregroundStyle(CupColors.muted)
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(redeemed ? CupColors.stroke : CupColors.primaryTint, lineWidth: 1)
        )
        .opacity(redeemed ? 0.7 : 1.0)
    }

    private func prizeIcon(_ type: String) -> String {
        switch type {
        case "free_combo":   return "fork.knife"
        case "free_drink":   return "cup.and.saucer.fill"
        case "discount_50":  return "percent"
        default:             return "gift.fill"
        }
    }

    private func formatExpiry(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: iso) else { return iso }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .none
        return display.string(from: date)
    }

    // MARK: - Empty / Error states

    private func emptyState(icon: String, message: String, subtext: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundStyle(CupColors.muted)
            Text(message)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.muted)
            Text(subtext)
                .font(.system(size: 13, design: .rounded))
                .foregroundStyle(CupColors.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 28))
                .foregroundStyle(CupColors.primary)
            Text(message)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.muted)
            Button("Retry") { Task { await load() } }
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.primary)
        }
        .padding(.top, 60)
    }

    // MARK: - Data loading

    private func load() async {
        isLoading = true
        error = nil
        do {
            async let lb = GameAPI.leaderboard()
            async let rank = GameAPI.myRank()
            async let pz = GameAPI.prizes()
            leaderboard = try await lb
            myRank = try await rank
            prizes = try await pz
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
        isLoading = false
    }
}

