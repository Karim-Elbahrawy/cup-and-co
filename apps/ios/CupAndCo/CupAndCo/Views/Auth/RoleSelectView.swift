import SwiftUI

/// Pick one of Student / Faculty / Office. Each card is a large tap target
/// with an SF Symbol icon, role title, and a one-line description.
struct RoleSelectView: View {
    @Environment(SessionStore.self) private var session
    @State private var selected: UserRole?

    private struct Item: Identifiable {
        let id: UserRole
        let titleKey: LocalizedStringKey
        let descKey: LocalizedStringKey
    }

    private let items: [Item] = [
        Item(id: .student,
             titleKey: "role.student",
             descKey: "role.student.desc"),
        Item(id: .faculty,
             titleKey: "role.faculty",
             descKey: "role.faculty.desc"),
        Item(id: .office,
             titleKey: "role.office",
             descKey: "role.office.desc")
    ]

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                MonogramView()
                    .frame(width: 56, height: 56)
                    .padding(.top, 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text("role.title")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("role.subtitle")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }

                VStack(spacing: 12) {
                    ForEach(items) { item in
                        roleCard(item)
                    }
                }
                .padding(.top, 16)

                Spacer()

                Button {
                    if let role = selected {
                        session.selectRole(role)
                    }
                } label: {
                    Text("role.continue")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(CupPrimaryButtonStyle())
                .disabled(selected == nil)
                .opacity(selected == nil ? 0.6 : 1)
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
        .preferredColorScheme(.light)
    }

    @ViewBuilder
    private func roleCard(_ item: Item) -> some View {
        let isSelected = selected == item.id
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                selected = item.id
            }
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(isSelected ? CupColors.primary : CupColors.cream)
                        .frame(width: 52, height: 52)
                    Image(systemName: item.id.sfSymbol)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(isSelected ? .white : CupColors.primary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.titleKey)
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text(item.descKey)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? CupColors.primary : CupColors.stroke)
            }
            .padding(16)
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? CupColors.primary : CupColors.stroke,
                            lineWidth: isSelected ? 2 : 1)
            )
            .shadow(color: isSelected
                    ? CupColors.primary.opacity(0.12)
                    : .clear,
                    radius: 12, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
    }
}

#Preview {
    RoleSelectView()
        .environment(SessionStore())
}
