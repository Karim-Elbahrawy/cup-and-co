import SwiftUI

/// Settings + identity screen.  Phase 1 surface: name, phone, role,
/// language toggle, Face ID toggle, notifications toggle, logout.
struct ProfileView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var languageEN: Bool = AppLanguage.current == .english
    @State private var biometricEnabled: Bool = BiometricAuthManager.shared.isEnabled
    @State private var notificationsEnabled: Bool = UserDefaults.standard.bool(forKey: "notifications_enabled")
    @State private var showLogoutConfirm: Bool = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                identityHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 12)

                sectionTitle("profile.section.account")
                infoCard

                sectionTitle("profile.section.preferences")
                preferencesCard

                sectionTitle("profile.section.about")
                aboutCard

                Button(role: .destructive) {
                    showLogoutConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("profile.logout")
                    }
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.error)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(CupColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(CupColors.error.opacity(0.25), lineWidth: 1)
                    )
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
        }
        .background(CupColors.paper.ignoresSafeArea())
        .navigationTitle(Text("profile.title"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(CupColors.espresso)
                }
                .accessibilityLabel(Text("common.close"))
            }
        }
        .confirmationDialog(
            Text("profile.logout.confirm.title"),
            isPresented: $showLogoutConfirm,
            titleVisibility: .visible
        ) {
            Button("profile.logout", role: .destructive) {
                session.logout()
                dismiss()
            }
            Button("common.cancel", role: .cancel) {}
        } message: {
            Text("profile.logout.confirm.message")
        }
    }

    // MARK: - Identity header

    private var identityHeader: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: CupColors.sunriseStops,
                                         startPoint: .topLeading,
                                         endPoint: .bottomTrailing))
                    .frame(width: 64, height: 64)
                Text(initials)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(verbatim: session.user?.fullName ?? NSLocalizedString("profile.guest", comment: ""))
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Text(verbatim: session.user?.phone ?? "—")
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                if let role = session.user?.role {
                    HStack(spacing: 4) {
                        Image(systemName: role.sfSymbol)
                            .font(.system(size: 10, weight: .semibold))
                        Text(LocalizedStringKey(role.localizationKey))
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .foregroundStyle(CupColors.primary)
                    .background(CupColors.primary.opacity(0.12))
                    .clipShape(Capsule())
                }
            }
            Spacer()
        }
        .accessibilityElement(children: .combine)
    }

    private var initials: String {
        guard let full = session.user?.fullName, !full.isEmpty else { return "C" }
        let parts = full.split(separator: " ").prefix(2)
        return parts.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }

    // MARK: - Sections

    private func sectionTitle(_ key: LocalizedStringKey) -> some View {
        Text(key)
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .tracking(1.2)
            .foregroundStyle(CupColors.muted)
            .textCase(.uppercase)
            .padding(.horizontal, 24)
            .padding(.top, 12)
    }

    private var infoCard: some View {
        VStack(spacing: 0) {
            row(icon: "person.fill",
                title: "profile.row.name",
                trailing: session.user?.fullName ?? "—")
            divider()
            row(icon: "phone.fill",
                title: "profile.row.phone",
                trailing: session.user?.phone ?? "—")
            divider()
            row(icon: "checkmark.seal.fill",
                title: "profile.row.verification",
                trailing: verificationLabel,
                trailingColor: verificationColor)
        }
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }

    private var preferencesCard: some View {
        VStack(spacing: 0) {
            // Language pill switch
            HStack {
                Image(systemName: "globe")
                    .frame(width: 24)
                    .foregroundStyle(CupColors.primary)
                Text("profile.row.language")
                    .font(.system(size: 15, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Spacer()
                languagePill
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            divider()

            // Face ID toggle
            Toggle(isOn: $biometricEnabled) {
                HStack {
                    Image(systemName: "faceid")
                        .frame(width: 24)
                        .foregroundStyle(CupColors.primary)
                    Text("profile.row.face_id")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                }
            }
            .tint(CupColors.primary)
            .disabled(!BiometricAuthManager.shared.isAvailable)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .onChange(of: biometricEnabled) { _, newValue in
                BiometricAuthManager.shared.isEnabled = newValue
            }

            divider()

            // Notifications toggle (UI-only Phase 1)
            Toggle(isOn: $notificationsEnabled) {
                HStack {
                    Image(systemName: "bell.badge.fill")
                        .frame(width: 24)
                        .foregroundStyle(CupColors.primary)
                    Text("profile.row.notifications")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                }
            }
            .tint(CupColors.primary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .onChange(of: notificationsEnabled) { _, newValue in
                UserDefaults.standard.set(newValue, forKey: "notifications_enabled")
            }
        }
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }

    private var aboutCard: some View {
        VStack(spacing: 0) {
            row(icon: "doc.text.fill",
                title: "profile.row.terms",
                trailing: "")
            divider()
            row(icon: "lock.fill",
                title: "profile.row.privacy",
                trailing: "")
            divider()
            row(icon: "info.circle.fill",
                title: "profile.row.version",
                trailing: appVersion)
        }
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }

    private var languagePill: some View {
        HStack(spacing: 0) {
            pillSegment(label: "EN", isOn: languageEN) {
                setLanguage(en: true)
            }
            pillSegment(label: "AR", isOn: !languageEN) {
                setLanguage(en: false)
            }
        }
        .padding(3)
        .background(CupColors.cream)
        .clipShape(Capsule())
    }

    private func pillSegment(label: String, isOn: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(isOn ? .white : CupColors.cocoa)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(
                    Group {
                        if isOn {
                            Capsule().fill(CupColors.primary)
                        } else {
                            Color.clear
                        }
                    }
                )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? [.isSelected, .isButton] : [.isButton])
    }

    private func setLanguage(en: Bool) {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
            languageEN = en
        }
        UserDefaults.standard.set(en ? "en" : "ar", forKey: "language_pref")
        // The app re-reads `AppLanguage.current` on next launch.  A full
        // mid-session locale swap requires re-rooting the view tree, which
        // we do via a custom notification in Phase 2 — for now we rely on
        // the user backgrounding the app.
    }

    private func divider() -> some View {
        Rectangle()
            .fill(CupColors.stroke)
            .frame(height: 1)
            .padding(.leading, 50)
    }

    private func row(icon: String,
                     title: LocalizedStringKey,
                     trailing: String,
                     trailingColor: Color = CupColors.muted) -> some View {
        HStack {
            Image(systemName: icon)
                .frame(width: 24)
                .foregroundStyle(CupColors.primary)
            Text(title)
                .font(.system(size: 15, design: .rounded))
                .foregroundStyle(CupColors.espresso)
            Spacer()
            Text(verbatim: trailing)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(trailingColor)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .accessibilityElement(children: .combine)
    }

    private var verificationLabel: String {
        switch session.user?.verificationStatus ?? .pending {
        case .pending:  return NSLocalizedString("verify.status.pending", comment: "")
        case .approved: return NSLocalizedString("verify.status.approved", comment: "")
        case .rejected: return NSLocalizedString("verify.status.rejected", comment: "")
        case .blocked:  return NSLocalizedString("verify.status.blocked", comment: "")
        }
    }

    private var verificationColor: Color {
        switch session.user?.verificationStatus ?? .pending {
        case .approved: return CupColors.success
        case .rejected, .blocked: return CupColors.error
        case .pending: return CupColors.muted
        }
    }

    private var appVersion: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.1.0"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(v) (\(b))"
    }
}

#Preview {
    NavigationStack {
        ProfileView()
            .environment(SessionStore())
    }
}
