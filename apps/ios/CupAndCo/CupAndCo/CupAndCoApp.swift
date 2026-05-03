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
        // Phase 0 placeholder. Phase 1 replaces with auth-gated navigation stack.
        ZStack {
            CupColors.paper.ignoresSafeArea()
            VStack(spacing: 24) {
                Text("Cup & Co")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.brown)
                Text("Your morning, handled.")
                    .font(.system(size: 16, weight: .regular, design: .rounded))
                    .foregroundStyle(CupColors.muted)

                VStack(alignment: .leading, spacing: 8) {
                    Label("Today Only", systemImage: "tag.fill")
                        .font(.system(size: 12, weight: .semibold).smallCaps())
                        .foregroundStyle(.white.opacity(0.9))
                    Text("70% OFF")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Super Discount")
                        .font(.system(size: 14))
                        .foregroundStyle(.white.opacity(0.9))
                    Button("Order Now") {}
                        .buttonStyle(CupPrimaryButtonStyle(inverted: true))
                        .padding(.top, 8)
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    LinearGradient(
                        colors: [CupColors.primaryOrange, CupColors.secondaryOrange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .padding(.horizontal, 24)
            }
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
