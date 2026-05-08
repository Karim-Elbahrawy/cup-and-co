#if !canImport(LocalAuthentication)
import Foundation

class LAContext {
    enum Policy { case deviceOwnerAuthenticationWithBiometrics }
    func canEvaluatePolicy(_ policy: Policy, error: UnsafeMutablePointer<NSError?>?) -> Bool { return false }
    func evaluatePolicy(_ policy: Policy, localizedReason: String) async throws -> Bool { return false }
}

enum LAError {
    struct Code: Equatable {
        static let userCancel = Code()
    }
    var code: Code { return .userCancel }
}
#endif

#if !canImport(AVFoundation)
import Foundation
class AVCaptureSession {}
class AVCaptureDevice {}
#endif

#if !canImport(SpriteKit)
import Foundation
class SKScene {}
class SKView {}
#endif

#if !canImport(Security)
import Foundation
typealias CFString = String
typealias CFDictionary = [String: Any]
typealias CFTypeRef = Any
typealias OSStatus = Int32

let kSecClass: String = "class"
let kSecAttrAccount: CFString = "account"
let kSecValueData: CFString = "data"
let kSecMatchLimit: CFString = "limit"
let kSecMatchLimitOne: CFString = "limitOne"
let kSecReturnData: CFString = "returnData"
let kSecAttrService: CFString = "service"
let kSecClassGenericPassword: CFString = "genp"
func SecItemAdd(_ attributes: CFDictionary, _ result: UnsafeMutablePointer<CFTypeRef?>?) -> OSStatus { return 0 }
func SecItemUpdate(_ query: CFDictionary, _ attributesToUpdate: CFDictionary) -> OSStatus { return 0 }
func SecItemCopyMatching(_ query: CFDictionary, _ result: UnsafeMutablePointer<CFTypeRef?>?) -> OSStatus { return 0 }
func SecItemDelete(_ query: CFDictionary) -> OSStatus { return 0 }
#endif

#if !canImport(UIKit)
import Foundation
class UIColor {
    static let white = UIColor()
    static let black = UIColor()
    static let clear = UIColor()
    init(red: Double, green: Double, blue: Double, alpha: Double) {}
}
class UIImage {
    init?(named: String) { return nil }
}
#endif






