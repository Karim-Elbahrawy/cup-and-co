import SwiftUI

struct CupPrimaryButtonStyle: ButtonStyle {
    var inverted: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(inverted ? Color.white : CupColors.primaryOrange)
            .foregroundStyle(inverted ? CupColors.primaryOrange : Color.white)
            .clipShape(Capsule())
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct CupSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium, design: .rounded))
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(CupColors.surface)
            .foregroundStyle(CupColors.brown)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(CupColors.stroke, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
