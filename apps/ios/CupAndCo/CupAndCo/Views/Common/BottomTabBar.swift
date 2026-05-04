import SwiftUI

/// The five tabs displayed at the bottom of the home stack.
enum AppTab: Hashable, CaseIterable {
    case home
    case search
    case cart
    case rewards
    case profile

    var sfSymbol: String {
        switch self {
        case .home:    return "house.fill"
        case .search:  return "slider.horizontal.3"
        case .cart:    return "bag.fill"
        case .rewards: return "gift.fill"
        case .profile: return "person.fill"
        }
    }

    var titleKey: LocalizedStringKey {
        switch self {
        case .home:    return "tab.home"
        case .search:  return "tab.search"
        case .cart:    return "tab.cart"
        case .rewards: return "tab.rewards"
        case .profile: return "tab.profile"
        }
    }
}

/// Custom bottom bar (we don't use SwiftUI's `TabView` because we want a
/// floating-pill aesthetic with a centered selected pill behind the icon).
struct BottomTabBar: View {
    @Binding var selection: AppTab
    var cartBadge: Int = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                Button {
                    let anim: Animation = reduceMotion
                        ? .linear(duration: 0.001)
                        : .spring(response: 0.35, dampingFraction: 0.65)
                    withAnimation(anim) { selection = tab }
                } label: {
                    tabButton(for: tab)
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
                .accessibilityLabel(Text(tab.titleKey))
                .accessibilityAddTraits(selection == tab ? [.isSelected, .isButton] : [.isButton])
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(
            CupColors.surface
                .shadow(color: CupColors.espresso.opacity(0.08),
                        radius: 16, x: 0, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    @ViewBuilder
    private func tabButton(for tab: AppTab) -> some View {
        let isSelected = selection == tab
        VStack(spacing: 4) {
            ZStack(alignment: .topTrailing) {
                ZStack {
                    if isSelected {
                        Circle()
                            .fill(CupColors.primary.opacity(0.12))
                            .frame(width: 38, height: 38)
                            .transition(.scale.combined(with: .opacity))
                    }
                    Image(systemName: tab.sfSymbol)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(isSelected ? CupColors.primary : CupColors.muted)
                }
                .frame(width: 38, height: 38)

                if tab == .cart && cartBadge > 0 {
                    Text(verbatim: "\(cartBadge)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 16, minHeight: 16)
                        .background(CupColors.primary)
                        .clipShape(Circle())
                        .offset(x: 4, y: -2)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(height: 38)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
    }
}

#Preview {
    @Previewable @State var sel: AppTab = .home
    return VStack {
        Spacer()
        BottomTabBar(selection: $sel)
    }
    .background(CupColors.paper)
}
