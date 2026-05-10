import Foundation
import UIKit
import UserNotifications

/// Wraps `UNUserNotificationCenter` for permission requests + status reads
/// and `UIApplication.shared.registerForRemoteNotifications()` for the APNs
/// handshake. The actual `didRegisterForRemoteNotificationsWithDeviceToken`
/// callback is delivered to `AppDelegate`, which uploads the token via
/// `PushAPI.register(deviceToken:)`.
///
/// Conforms to `UNUserNotificationCenterDelegate` so we can show
/// notifications while the app is in the foreground (banner + sound only —
/// no rich content, no actions; that's out of scope per SHIP-PLAN 1.1).
@MainActor
final class PushService: NSObject, UNUserNotificationCenterDelegate {

    /// Singleton — set as the `UNUserNotificationCenter` delegate at launch.
    static let shared = PushService()

    /// Remembers the last APNs token we successfully uploaded so the toggle
    /// off path knows what to unregister. Keyed in UserDefaults.
    static let storedTokenKey = "push_last_apns_token_hex"

    private override init() { super.init() }

    /// Read the current authorization status without prompting.
    func currentStatus() async -> UNAuthorizationStatus {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        return settings.authorizationStatus
    }

    /// Request authorization. iOS only prompts the first time; subsequent
    /// calls return the existing decision.
    func requestAuthorization() async -> UNAuthorizationStatus {
        let center = UNUserNotificationCenter.current()
        do {
            _ = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            // The system docs are explicit: this never throws on a normal
            // device — the user just answers the prompt or the OS denies.
            // Log silently; the next `currentStatus()` read tells the truth.
        }
        return await currentStatus()
    }

    /// Kick off APNs registration. The result is delivered asynchronously to
    /// `AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`.
    /// Hops to the main thread because `UIApplication` is `@MainActor`-bound.
    func register() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    /// Unregister: stop the OS from delivering pushes and clear the cached
    /// device token. Server-side unregister happens in `PushAPI`.
    func unregister() {
        UIApplication.shared.unregisterForRemoteNotifications()
        UserDefaults.standard.removeObject(forKey: Self.storedTokenKey)
    }

    /// Convert the raw APNs token data to a hex string. Used by AppDelegate
    /// when forwarding the token to `PushAPI.register`.
    static func hexString(from data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Foreground presentation: just banner + sound. No rich content.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler:
            @escaping @Sendable (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    /// User-tap handler: no-op for now. Registration only is in scope.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping @Sendable () -> Void
    ) {
        completionHandler()
    }
}
