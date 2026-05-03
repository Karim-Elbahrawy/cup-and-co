import SwiftUI

/// Cup & Co — "Espresso Sunrise" palette.
/// Mirrors `@cup-and-co/design-tokens` for cross-platform consistency.
enum CupColors {
    // Primary — terracotta
    static let primary       = Color(red: 0.761, green: 0.255, blue: 0.047) // #C2410C
    static let primaryHover  = Color(red: 0.604, green: 0.204, blue: 0.071) // #9A3412
    static let primaryTint   = Color(red: 0.996, green: 0.843, blue: 0.667) // #FED7AA

    // Accent — deep teal
    static let accent        = Color(red: 0.059, green: 0.463, blue: 0.431) // #0F766E
    static let accentHover   = Color(red: 0.067, green: 0.369, blue: 0.349) // #115E59
    static let accentTint    = Color(red: 0.800, green: 0.984, blue: 0.945) // #CCFBF1

    // Sunrise gradient stops
    static let sunriseFrom   = Color(red: 0.957, green: 0.635, blue: 0.380) // #F4A261
    static let sunriseTo     = primary

    // Surfaces
    static let cream         = Color(red: 0.996, green: 0.953, blue: 0.780) // #FEF3C7
    static let paper         = Color(red: 0.980, green: 0.965, blue: 0.941) // #FAF6F0
    static let surface       = Color.white

    // Text
    static let espresso      = Color(red: 0.110, green: 0.098, blue: 0.090) // #1C1917
    static let cocoa         = Color(red: 0.267, green: 0.251, blue: 0.235) // #44403C
    static let muted         = Color(red: 0.471, green: 0.443, blue: 0.424) // #78716C

    // Borders + states
    static let stroke        = Color(red: 0.906, green: 0.898, blue: 0.890) // #E7E5E4
    static let success       = Color(red: 0.082, green: 0.502, blue: 0.239) // #15803D
    static let error         = Color(red: 0.725, green: 0.110, blue: 0.110) // #B91C1C
    static let star          = Color(red: 0.961, green: 0.620, blue: 0.043) // #F59E0B

    // Aliases kept for older files (removed in Phase 6 cleanup)
    static let primaryOrange   = primary
    static let secondaryOrange = sunriseFrom
    static let creamHighlight  = cream
    static let brown           = espresso

    // Sunrise gradient (use as `LinearGradient(colors: CupColors.sunriseStops, ...)`)
    static let sunriseStops: [Color] = [sunriseFrom, sunriseTo]
}
