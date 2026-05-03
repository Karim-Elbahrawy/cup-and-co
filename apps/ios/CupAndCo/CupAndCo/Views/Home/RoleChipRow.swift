import SwiftUI

/// Three horizontal chips: Student / Faculty / Office.
/// The selected chip is filled terracotta; others are cream with espresso text.
struct RoleChipRow: View {
    @Binding var selected: UserRole
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let roles: [UserRole] = UserRole.customerRoles

    var body: some View {
        HStack(spacing: 10) {
            ForEach(roles, id: \.self) { role in
                chip(for: role)
            }
        }
    }

    @ViewBuilder
    private func chip(for role: UserRole) -> some View {
        let isSelected = role == selected
        Button {
            let anim: Animation = reduceMotion
                ? .linear(duration: 0.001)
                : .spring(response: 0.35, dampingFraction: 0.65)
            withAnimation(anim) { selected = role }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: role.sfSymbol)
                    .font(.system(size: 13, weight: .semibold))
                Text(LocalizedStringKey(role.localizationKey))
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .foregroundStyle(isSelected ? .white : CupColors.espresso)
            .background(isSelected ? CupColors.primary : CupColors.cream)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(
                    isSelected ? CupColors.primary : Color.clear,
                    lineWidth: 1
                )
            )
            .shadow(color: isSelected
                    ? CupColors.primary.opacity(0.25)
                    : .clear,
                    radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(LocalizedStringKey(role.localizationKey)))
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
    }
}

#Preview {
    @Previewable @State var role: UserRole = .student
    return RoleChipRow(selected: $role)
        .padding()
        .background(CupColors.paper)
}
