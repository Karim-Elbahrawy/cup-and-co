import SwiftUI

/// Brand typography tokens. Sizes scale with Dynamic Type via `@ScaledMetric`
/// at the call site so users with larger text sizes get a readable interface
/// without the layout collapsing.
///
/// Usage:
/// ```swift
/// @ScaledMetric private var headingLg = CupTypography.headingLg
/// Text("...").font(.system(size: headingLg, weight: .bold, design: .rounded))
/// ```
///
/// We expose plain `CGFloat` constants rather than `Font` so each call site
/// stays in control of weight/design. Mirrors the web design-tokens scale.
enum CupTypography {
    // MARK: - Headings
    /// 28pt — page hero (e.g. product name on detail screen)
    static let headingXl: CGFloat = 28
    /// 22pt — section hero (e.g. "Coffee Collector" on game start)
    static let headingLg: CGFloat = 22
    /// 18pt — section title (e.g. "Popular" on home)
    static let headingMd: CGFloat = 18
    /// 16pt — card title (e.g. quantity stepper label)
    static let headingSm: CGFloat = 16

    // MARK: - Body
    /// 15pt — primary body
    static let bodyLg: CGFloat = 15
    /// 14pt — secondary body
    static let bodyMd: CGFloat = 14
    /// 13pt — captions, helper text
    static let bodySm: CGFloat = 13

    // MARK: - Micro
    /// 12pt — eyebrow / category
    static let microLg: CGFloat = 12
    /// 11pt — labels, role chip
    static let microMd: CGFloat = 11
    /// 10pt — pickup-code-style super micro
    static let microSm: CGFloat = 10
}
