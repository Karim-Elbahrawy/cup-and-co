import SwiftUI

/// Loyalty tier badge — Bronze / Silver / Gold pill matching the web's
/// `apps/customer-web/src/components/TierBadge.tsx` (PR #21).
///
/// Two render modes:
///   - `.compact` — 24×24pt icon-only circle for the home greeting,
///     where horizontal real-estate is tight.
///   - `.full` — pill (~88×32pt) with icon + tier label, used near the
///     points balance card on the rewards screen.
///
/// Colors mirror the web palette so iOS users see the same gradient
/// when they switch devices: bronze warm brown, silver neutral gray,
/// gold #F59E0B (which we already expose as `CupColors.star`).
struct TierBadgeView: View {

    /// Render style. Pick `.compact` for tight surfaces (greeting line),
    /// `.full` for the rewards / profile entry points.
    enum Style {
        case compact
        case full
    }

    let tier: LoyaltyTier
    var style: Style = .full

    private var palette: TierPalette { TierPalette.forTier(tier) }

    var body: some View {
        switch style {
        case .compact:
            compactBadge
        case .full:
            fullBadge
        }
    }

    // MARK: - Compact (icon-only)

    private var compactBadge: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [palette.from, palette.to],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Image(systemName: palette.iconName)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(palette.foreground)
        }
        .frame(width: 24, height: 24)
        .shadow(color: palette.shadow, radius: 3, x: 0, y: 1)
        .accessibilityElement()
        .accessibilityLabel(Text(LocalizedStringKey(tier.localizationKey)))
    }

    // MARK: - Full (icon + label pill)

    private var fullBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: palette.iconName)
                .font(.system(size: 13, weight: .bold))
            Text(LocalizedStringKey(tier.localizationKey))
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .textCase(.uppercase)
                .tracking(0.6)
        }
        .foregroundStyle(palette.foreground)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(
            Capsule()
                .fill(
                    LinearGradient(
                        colors: [palette.from, palette.to],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .shadow(color: palette.shadow, radius: 4, x: 0, y: 2)
        .accessibilityElement()
        .accessibilityLabel(Text(LocalizedStringKey(tier.localizationKey)))
    }
}

/// Color + icon definitions for each tier. Kept in one place so the
/// compact and full styles stay perfectly in sync.
private struct TierPalette {
    let from: Color
    let to: Color
    let foreground: Color
    let shadow: Color
    let iconName: String

    static func forTier(_ tier: LoyaltyTier) -> TierPalette {
        switch tier {
        case .bronze:
            // #CD7F32 → #A0531D, white text. Matches web TierBadge.tsx.
            return TierPalette(
                from: Color(red: 0.804, green: 0.498, blue: 0.196),
                to: Color(red: 0.627, green: 0.325, blue: 0.114),
                foreground: .white,
                shadow: Color(red: 0.804, green: 0.498, blue: 0.196).opacity(0.35),
                iconName: "hourglass"
            )
        case .silver:
            // #E5E5E5 → #A8A8A8, dark text for contrast.
            return TierPalette(
                from: Color(red: 0.898, green: 0.898, blue: 0.898),
                to: Color(red: 0.659, green: 0.659, blue: 0.659),
                foreground: CupColors.espresso,
                shadow: Color(red: 0.753, green: 0.753, blue: 0.753).opacity(0.45),
                iconName: "star.fill"
            )
        case .gold:
            // #F59E0B → #B45309, dark text — `CupColors.star` is the same #F59E0B.
            return TierPalette(
                from: CupColors.star,
                to: Color(red: 0.706, green: 0.325, blue: 0.035),
                foreground: CupColors.espresso,
                shadow: CupColors.star.opacity(0.5),
                iconName: "crown.fill"
            )
        }
    }
}

#Preview("All tiers") {
    VStack(alignment: .leading, spacing: 20) {
        ForEach(LoyaltyTier.allCases, id: \.self) { tier in
            HStack(spacing: 16) {
                TierBadgeView(tier: tier, style: .compact)
                TierBadgeView(tier: tier, style: .full)
            }
        }
    }
    .padding(24)
    .background(CupColors.paper)
}
