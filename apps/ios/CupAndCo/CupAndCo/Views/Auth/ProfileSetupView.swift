import SwiftUI

/// First-time profile setup: choose a personality avatar and gender.
/// Shown once after role selection; subsequent logins skip straight to `.home`.
struct ProfileSetupView: View {
    @Environment(SessionStore.self) private var session

    @State private var selectedAvatar: Int = 1
    @State private var selectedGender: Gender = .male

    private let avatarCount = 7

    private let genderOptions: [(Gender, LocalizedStringKey, String)] = [
        (.male,           "profile.gender.male",             "person.fill"),
        (.female,         "profile.gender.female",           "person.fill"),
        (.preferNotToSay, "profile.gender.prefer_not_to_say","questionmark.circle.fill"),
    ]

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header

                    avatarSection

                    genderSection

                    Spacer(minLength: 0)

                    continueButton
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
        }
        .preferredColorScheme(.light)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            MonogramView()
                .frame(width: 44, height: 44)
            Text("profile.setup.title")
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
            Text("profile.setup.subtitle")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.muted)
        }
    }

    // MARK: - Avatar picker

    private var avatarSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("profile.setup.pick_avatar")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.muted)
                .textCase(.uppercase)
                .tracking(1.2)

            let columns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 4)
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(1...avatarCount, id: \.self) { id in
                    avatarCell(id: id)
                }
            }
        }
    }

    @ViewBuilder
    private func avatarCell(id: Int) -> some View {
        let selected = selectedAvatar == id
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.65)) {
                selectedAvatar = id
            }
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(selected ? CupColors.primary.opacity(0.12) : CupColors.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(selected ? CupColors.primary : CupColors.stroke,
                                    lineWidth: selected ? 2 : 1)
                    )

                // Avatar image from assets
                Image("avatar_\(id)")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 52, height: 52)
                    .padding(10)
            }
            .frame(height: 76)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Avatar \(id)")
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : [.isButton])
    }

    // MARK: - Gender picker

    private var genderSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("profile.setup.gender")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.muted)
                .textCase(.uppercase)
                .tracking(1.2)

            VStack(spacing: 10) {
                ForEach(genderOptions, id: \.0.rawValue) { (gender, titleKey, symbol) in
                    genderCard(gender: gender, titleKey: titleKey, symbol: symbol)
                }
            }
        }
    }

    @ViewBuilder
    private func genderCard(gender: Gender, titleKey: LocalizedStringKey, symbol: String) -> some View {
        let selected = selectedGender == gender
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.65)) {
                selectedGender = gender
            }
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(selected ? CupColors.primary : CupColors.cream)
                        .frame(width: 44, height: 44)
                    Image(systemName: symbol)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(selected ? .white : CupColors.primary)
                }
                Text(titleKey)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Spacer()
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(selected ? CupColors.primary : CupColors.stroke)
            }
            .padding(14)
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(selected ? CupColors.primary : CupColors.stroke,
                            lineWidth: selected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Continue

    private var continueButton: some View {
        Button {
            session.completeProfileSetup(gender: selectedGender, avatarId: selectedAvatar)
        } label: {
            Text("common.continue")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(CupPrimaryButtonStyle())
        .padding(.top, 8)
    }
}

#Preview {
    ProfileSetupView()
        .environment(SessionStore())
}
