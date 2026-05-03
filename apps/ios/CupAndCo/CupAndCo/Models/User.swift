import Foundation

/// User role.  Mirrors the Postgres enum on the API.
/// `owner` and `barista` are admin roles and never appear in the iOS UI;
/// they're included here so a `User` decoded from the API never crashes
/// the app for staff that happen to log in with a customer build.
enum UserRole: String, Codable, Sendable, CaseIterable {
    case student
    case faculty
    case office
    case owner
    case barista

    /// Roles selectable from the role-select screen on first sign-in.
    static let customerRoles: [UserRole] = [.student, .faculty, .office]

    var localizationKey: String {
        switch self {
        case .student:  return "role.student"
        case .faculty:  return "role.faculty"
        case .office:   return "role.office"
        case .owner:    return "role.owner"
        case .barista:  return "role.barista"
        }
    }

    var sfSymbol: String {
        switch self {
        case .student:  return "graduationcap.fill"
        case .faculty:  return "book.fill"
        case .office:   return "briefcase.fill"
        case .owner:    return "crown.fill"
        case .barista:  return "cup.and.saucer.fill"
        }
    }
}

enum VerificationStatus: String, Codable, Sendable {
    case pending, approved, rejected, blocked
}

enum LanguagePref: String, Codable, Sendable {
    case en, ar
}

/// Mirrors `User` from `packages/types`.  All fields except `id`, `phone`
/// and `role` are optional from the iOS perspective — a user may have just
/// signed up and not yet supplied a name, university id, etc.
struct User: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let phone: String
    let fullName: String?
    let role: UserRole
    let verificationStatus: VerificationStatus
    let universityId: String?
    let major: String?
    let department: String?
    let languagePref: LanguagePref
    let biometricEnabled: Bool
    let blocked: Bool
    let createdAt: String?

    /// Best-effort first name for the home greeting.
    var firstName: String {
        guard let full = fullName, !full.isEmpty else { return "" }
        return full.split(separator: " ").first.map(String.init) ?? full
    }

    enum CodingKeys: String, CodingKey {
        case id, phone, role, blocked, major, department
        case fullName = "full_name"
        case verificationStatus = "verification_status"
        case universityId = "university_id"
        case languagePref = "language_pref"
        case biometricEnabled = "biometric_enabled"
        case createdAt = "created_at"
    }
}
