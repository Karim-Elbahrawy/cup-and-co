// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "CupAndCo",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .executable(name: "CupAndCo", targets: ["CupAndCo"])
    ],
    dependencies: [
        // We add Tokamak to allow running SwiftUI-like code on the web/Windows
        .package(url: "https://github.com/TokamakUI/Tokamak", from: "0.11.0")
    ],
    targets: [
        .executableTarget(
            name: "CupAndCo",
            dependencies: [
                .product(name: "TokamakShim", package: "Tokamak")
            ],
            path: "CupAndCo",
            resources: [
                .process("Assets.xcassets")
            ]
        ),
        .testTarget(
            name: "CupAndCoTests",
            dependencies: ["CupAndCo"],
            path: "Tests/CupAndCoTests"
        )
    ]
)
