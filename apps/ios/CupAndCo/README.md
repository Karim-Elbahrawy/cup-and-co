# Cup & Co — iOS App

SwiftUI + SpriteKit iOS app for Cup & Co. iOS 17+.

## Getting Started

This folder contains the source files. The Xcode project (`CupAndCo.xcodeproj`) is created on first open:

```bash
# On macOS:
cd apps/ios/CupAndCo
xcodegen generate     # uses project.yml below
# or
open Package.swift    # SwiftPM-only mode for previewing components
```

## Structure

```
CupAndCo/
  CupAndCoApp.swift               # @main entry
  Info.plist                      # capabilities, Face ID usage description
  DesignSystem/
    Colors.swift                  # Cup & Co palette (mirrors @cup-and-co/design-tokens)
    Typography.swift              # SF Pro Rounded + Cairo for Arabic
    Buttons.swift                 # Primary/secondary pill buttons
  Networking/
    APIClient.swift               # HTTP wrapper to Express API
    AuthStore.swift               # JWT persistence in Keychain
  Auth/
    PhoneOTPView.swift            # Phase 1
    BiometricAuthManager.swift    # Face ID / Touch ID via LocalAuthentication
  Views/
    HomeView.swift                # Phase 1 - matches Figma reference
    ProductDetailView.swift       # Phase 2 - matches Figma reference
    CartView.swift                # Phase 2
    CheckoutView.swift            # Phase 2
    OrderTrackingView.swift       # Phase 2
    LoyaltyView.swift             # Phase 3
    QRScannerView.swift           # Phase 3
    ProfileView.swift             # Phase 1
  Game/
    CoffeeCollectorScene.swift    # Phase 4 - SpriteKit
    Assets.xcassets/              # bean sprites, sounds
  Localization/
    en.lproj/Localizable.strings
    ar.lproj/Localizable.strings  # full Arabic with RTL
  Tests/
    CupAndCoTests/                # XCTest
```

## Capabilities (set in project signing)
- Face ID / Touch ID (LocalAuthentication)
- Push Notifications (APNs)
- Camera (QR scanner)
- Network (App Transport Security with localhost exception in dev)

## Phase 0 status
Scaffold only. Phase 1 (week 2) brings phone OTP login, Face ID toggle, and the home screen pixel-matched to the Figma reference.
