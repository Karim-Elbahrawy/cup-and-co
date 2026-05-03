import SwiftUI

@main
struct CupAndCoApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.locale, .init(identifier: AppLanguage.current.code))
        }
    }
}

struct RootView: View {
    var body: some View {
        // Phase 0 placeholder with upgraded Espresso Sunrise palette.
        // Phase 1 replaces this with the auth-gated navigation stack +
        // Home + role select + verification.
        ZStack {
            CupColors.paper.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 28) {
                // Header
                HStack(spacing: 12) {
                    MonogramView()
                        .frame(width: 48, height: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("GOOD MORNING")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(CupColors.muted)
                        Text("Cup & Co")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(CupColors.espresso)
                    }
                    Spacer()
                }

                // Hero promo card
                VStack(alignment: .leading, spacing: 6) {
                    Text("TODAY ONLY")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(2.5)
                        .foregroundStyle(.white.opacity(0.9))
                    Text("70% OFF")
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Super Discount")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.92))
                    Button("Order Now") {}
                        .buttonStyle(CupPrimaryButtonStyle(inverted: true))
                        .padding(.top, 6)
                }
                .padding(22)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    LinearGradient(
                        colors: CupColors.sunriseStops,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .shadow(color: CupColors.primary.opacity(0.18), radius: 16, x: 0, y: 8)

                // Sample product card
                HStack(spacing: 14) {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(CupColors.cream)
                        .frame(width: 78, height: 78)
                        .overlay(
                            // Top-down cup glyph
                            ZStack {
                                Circle().fill(LinearGradient(colors: CupColors.sunriseStops,
                                                              startPoint: .top, endPoint: .bottom))
                                    .frame(width: 56, height: 56)
                                Circle().fill(CupColors.espresso).frame(width: 38, height: 38)
                                Ellipse().fill(CupColors.cream.opacity(0.55))
                                    .frame(width: 26, height: 7)
                                    .offset(y: -4)
                            }
                        )
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Velvet Cappuccino")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(CupColors.espresso)
                        Text("Silky steamed milk · cocoa dust")
                            .font(.system(size: 12))
                            .foregroundStyle(CupColors.muted)
                        Text("EGP 65")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(CupColors.primary)
                            .padding(.top, 2)
                    }
                    Spacer()
                }
                .padding(14)
                .background(CupColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(CupColors.stroke, lineWidth: 1)
                )

                Spacer()
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
    }
}

/// Inline SwiftUI rendering of the brand monogram (top-down cup with teal steam).
struct MonogramView: View {
    var body: some View {
        ZStack {
            Circle().fill(CupColors.paper)
            Circle()
                .fill(LinearGradient(colors: CupColors.sunriseStops,
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
                .frame(width: 32, height: 32)
                .offset(y: 3)
            Circle().fill(CupColors.espresso).frame(width: 22, height: 22).offset(y: 3)
            Ellipse().fill(CupColors.cream.opacity(0.55))
                .frame(width: 16, height: 4)
                .offset(y: 0)
            // Steam
            ZStack {
                ForEach(0..<3) { i in
                    let dx: CGFloat = CGFloat(i) * 8 - 8
                    Path { p in
                        p.move(to: CGPoint(x: 12 + dx, y: 0))
                        p.addQuadCurve(to: CGPoint(x: 12 + dx, y: 12),
                                       control: CGPoint(x: 16 + dx, y: 6))
                    }
                    .stroke(CupColors.accent, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                }
            }
            .offset(y: -16)
        }
    }
}

enum AppLanguage: String, CaseIterable {
    case english, arabic

    static var current: AppLanguage {
        let pref = UserDefaults.standard.string(forKey: "language_pref") ?? "en"
        return pref == "ar" ? .arabic : .english
    }

    var code: String { self == .arabic ? "ar" : "en" }
}
