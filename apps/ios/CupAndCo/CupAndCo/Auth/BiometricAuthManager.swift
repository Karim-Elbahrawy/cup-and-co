import Foundation
import LocalAuthentication

/// Face ID / Touch ID gate. User can opt in/out; default is off.
enum BiometricResult {
    case success
    case userCancelled
    case unavailable
    case failed(Error)
}

final class BiometricAuthManager {
    static let shared = BiometricAuthManager()

    var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "biometric_enabled") }
        set { UserDefaults.standard.set(newValue, forKey: "biometric_enabled") }
    }

    var isAvailable: Bool {
        var error: NSError?
        return LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    func authenticate(reason: String) async -> BiometricResult {
        let ctx = LAContext()
        var error: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .unavailable
        }
        do {
            let ok = try await ctx.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return ok ? .success : .userCancelled
        } catch let err as LAError where err.code == .userCancel {
            return .userCancelled
        } catch {
            return .failed(error)
        }
    }
}
