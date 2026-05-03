import SwiftUI

@main
struct CupAndCoApp: App {
    @State private var session = SessionStore()
    @State private var catalog = CatalogStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(catalog)
                .environment(\.locale, .init(identifier: AppLanguage.current.code))
                .environment(\.layoutDirection,
                             AppLanguage.current == .arabic ? .rightToLeft : .leftToRight)
                .preferredColorScheme(.light)
        }
    }
}

/// Auth-gated root.  Routes to the right top-level view based on
/// `SessionStore.phase`.  The bootstrap pass runs once on appear and
/// flips us out of `.splash` after fetching `/me` (or short-circuiting
/// to onboarding/phone if there's no token).
struct RootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        ZStack {
            switch session.phase {
            case .splash:
                SplashView()
                    .transition(.opacity)
            case .onboarding:
                OnboardingView()
                    .transition(.opacity)
            case .phone:
                NavigationStack { PhoneOTPView() }
                    .transition(.opacity)
            case .otp(let phone):
                NavigationStack { OTPVerifyView(phone: phone) }
                    .transition(.opacity)
            case .roleSelect:
                NavigationStack { RoleSelectView() }
                    .transition(.opacity)
            case .home:
                MainTabShell()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: phaseTag)
        .task {
            // Run the bootstrap once.  Splash holds for at least ~1.2s so
            // the user actually sees the brand mark.
            let started = Date()
            await session.bootstrap()
            let elapsed = Date().timeIntervalSince(started)
            let minSplashSeconds: TimeInterval = 1.2
            if elapsed < minSplashSeconds {
                let remaining = minSplashSeconds - elapsed
                try? await Task.sleep(for: .milliseconds(Int(remaining * 1000)))
            }
        }
    }

    /// `Phase` isn't directly `Hashable` because of the associated value,
    /// so we project it down to a stable identifier for the animation.
    private var phaseTag: String {
        switch session.phase {
        case .splash:           return "splash"
        case .onboarding:       return "onboarding"
        case .phone:            return "phone"
        case .otp(let p):       return "otp:\(p)"
        case .roleSelect:       return "role"
        case .home:             return "home"
        }
    }
}

/// Bottom-tab shell shown once the user is authenticated.  All five tabs
/// share the same chrome but only `Home` and `Profile` have real content
/// in Phase 1; the others show a friendly "coming soon" state.
struct MainTabShell: View {
    @State private var tab: AppTab = .home

    var body: some View {
        ZStack(alignment: .bottom) {
            CupColors.paper.ignoresSafeArea()

            Group {
                switch tab {
                case .home:    HomeView()
                case .search:  ComingSoonView(title: "tab.search",
                                              symbol: "magnifyingglass")
                case .cart:    ComingSoonView(title: "tab.cart",
                                              symbol: "bag")
                case .rewards: ComingSoonView(title: "tab.rewards",
                                              symbol: "gift")
                case .profile: NavigationStack { ProfileView() }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            BottomTabBar(selection: $tab)
        }
    }
}

/// Phase-1 placeholder for tabs that aren't yet implemented.
/// We keep this in-file because it's tiny and only used here.
struct ComingSoonView: View {
    let title: LocalizedStringKey
    let symbol: String

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(CupColors.cream)
                        .frame(width: 96, height: 96)
                    Image(systemName: symbol)
                        .font(.system(size: 38, weight: .semibold))
                        .foregroundStyle(CupColors.primary)
                }
                Text(title)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Text("common.coming_soon")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            }
            .padding(.bottom, 80) // keep above tab bar
        }
    }
}

// MARK: - Language helper

enum AppLanguage: String, CaseIterable {
    case english, arabic

    static var current: AppLanguage {
        let pref = UserDefaults.standard.string(forKey: "language_pref") ?? "en"
        return pref == "ar" ? .arabic : .english
    }

    var code: String { self == .arabic ? "ar" : "en" }
}
