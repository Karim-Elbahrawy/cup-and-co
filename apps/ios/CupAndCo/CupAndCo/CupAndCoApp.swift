import SwiftUI
import UIKit
import UserNotifications
import os.log

@main
struct CupAndCoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    @State private var session = SessionStore()
    @State private var catalog = CatalogStore()
    @State private var cart = CartStore()
    @State private var orderStore = OrderStore()
    @State private var language = LanguageStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(catalog)
                .environment(cart)
                .environment(orderStore)
                .environment(language)
                .environment(\.locale, .init(identifier: language.current.code))
                .environment(\.layoutDirection,
                             language.current == .arabic ? .rightToLeft : .leftToRight)
                .id(language.current)
                .preferredColorScheme(.light)
        }
    }
}

/// AppDelegate captures the APNs registration callbacks. SwiftUI's
/// `@UIApplicationDelegateAdaptor` lets us keep the App-as-Scene structure
/// while still receiving these UIKit-only delegate methods.
///
/// Marked `@MainActor` because UIKit always calls these methods on the
/// main thread and `UIApplication.shared` is `@MainActor`-bound.
@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    private static let log = Logger(subsystem: "com.cupandco.ios", category: "push")

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Wire the foreground-presentation delegate before any push arrives.
        UNUserNotificationCenter.current().delegate = PushService.shared
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let hex = PushService.hexString(from: deviceToken)
        Self.log.info("APNs token received (\(hex.count, privacy: .public) chars)")
        // Persist for later unregister, then upload.
        UserDefaults.standard.set(hex, forKey: PushService.storedTokenKey)
        Task {
            do {
                _ = try await PushAPI.register(deviceToken: hex)
            } catch {
                Self.log.error("PushAPI.register failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Self.log.error("APNs registration failed: \(error.localizedDescription, privacy: .public)")
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
            case .profileSetup:
                NavigationStack { ProfileSetupView() }
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
        case .profileSetup:     return "profileSetup"
        case .home:             return "home"
        }
    }
}

/// Bottom-tab shell shown once the user is authenticated.  Phase 2 adds
/// the cart, order history, and product detail navigation.
struct MainTabShell: View {
    @State private var tab: AppTab = .home
    @Environment(CartStore.self) private var cart

    var body: some View {
        ZStack(alignment: .bottom) {
            CupColors.paper.ignoresSafeArea()

            Group {
                switch tab {
                case .home:    NavigationStack { HomeView() }
                case .search:  NavigationStack { SearchView() }
                case .cart:    NavigationStack { CartView() }
                case .rewards: NavigationStack { RewardsView() }
                case .profile: NavigationStack { ProfileView() }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            BottomTabBar(selection: $tab, cartBadge: cart.itemCount)
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

/// Observable wrapper around the language preference so a runtime change
/// re-renders every view that consumes it (no app restart needed).
@MainActor
@Observable
final class LanguageStore {
    var current: AppLanguage = AppLanguage.current

    func set(_ lang: AppLanguage) {
        current = lang
        UserDefaults.standard.set(lang.code, forKey: "language_pref")
    }
}
