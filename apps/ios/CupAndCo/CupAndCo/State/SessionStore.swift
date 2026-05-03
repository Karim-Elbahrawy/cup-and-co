import Foundation
import Observation

/// Auth-gating root model.  Drives which screen the app shows on launch:
/// splash → onboarding → phone OTP → role select → home.
///
/// The store is `@MainActor` because every property it exposes drives
/// SwiftUI state and must mutate on the main actor.
@MainActor
@Observable
final class SessionStore {

    // MARK: - Phase

    /// Coarse navigation phase used by `RootView` to decide what to show.
    enum Phase: Equatable {
        case splash
        case onboarding
        case phone           // collecting phone number
        case otp(phone: String)
        case roleSelect      // signed in but missing role
        case home            // fully authed
    }

    // MARK: - State

    var phase: Phase = .splash
    var user: User?
    /// Set after a successful OTP send so the verify screen can render.
    var pendingPhone: String?
    /// Last error shown to the user as a toast / inline message.
    var lastError: String?
    var isLoading: Bool = false

    // MARK: - Lifecycle

    /// Called once on app launch.  Decides where to send the user.
    func bootstrap() async {
        // Honor seen-onboarding flag.
        let seenOnboarding = UserDefaults.standard.bool(forKey: Keys.seenOnboarding)

        // No token yet → onboarding (or phone if previously seen).
        guard AuthStore.shared.token != nil else {
            phase = seenOnboarding ? .phone : .onboarding
            return
        }

        // We have a token — try to fetch /me to validate it.
        do {
            let res = try await MeAPI.fetch()
            self.user = res.user
            // Staff still see the home tab in Phase 1; admin tools are web-only.
            phase = .home
        } catch APIError.unauthorized {
            AuthStore.shared.clear()
            phase = seenOnboarding ? .phone : .onboarding
        } catch {
            // Transport / decoding error — surface a soft error and let the
            // user retry from the phone screen.  Don't strand them on splash.
            lastError = (error as? LocalizedError)?.errorDescription ?? "\(error)"
            phase = seenOnboarding ? .phone : .onboarding
        }
    }

    // MARK: - OTP flow

    func sendOTP(phone: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await AuthAPI.send(phone: phone)
            pendingPhone = phone
            phase = .otp(phone: phone)
        } catch {
            lastError = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }

    func verifyOTP(code: String) async {
        guard let phone = pendingPhone else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let res = try await AuthAPI.verify(phone: phone, code: code)
            AuthStore.shared.save(res.token)
            user = res.user
            // If we don't have a real role assignment yet (default may be student
            // for new accounts), Phase 1 still routes them through role select on
            // brand-new sign-ups.  We use `fullName == nil` as a proxy for "first
            // login" since the API hasn't asked for it elsewhere yet.
            phase = (res.user.fullName?.isEmpty ?? true) ? .roleSelect : .home
        } catch {
            lastError = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }

    // MARK: - Role

    func selectRole(_ role: UserRole) {
        // Phase 1: we persist the role locally and move on. Phase 2 will
        // wire `PATCH /me` to write it server-side.
        UserDefaults.standard.set(role.rawValue, forKey: Keys.lastRole)
        if var u = user {
            u = User(
                id: u.id,
                phone: u.phone,
                fullName: u.fullName,
                role: role,
                verificationStatus: u.verificationStatus,
                universityId: u.universityId,
                major: u.major,
                department: u.department,
                languagePref: u.languagePref,
                biometricEnabled: u.biometricEnabled,
                blocked: u.blocked,
                createdAt: u.createdAt
            )
            user = u
        }
        phase = .home
    }

    // MARK: - Onboarding

    func completeOnboarding() {
        UserDefaults.standard.set(true, forKey: Keys.seenOnboarding)
        phase = .phone
    }

    // MARK: - Logout

    func logout() {
        AuthStore.shared.clear()
        user = nil
        pendingPhone = nil
        phase = .phone
    }

    // MARK: - Keys

    private enum Keys {
        static let seenOnboarding = "seen_onboarding"
        static let lastRole       = "last_role"
    }
}
