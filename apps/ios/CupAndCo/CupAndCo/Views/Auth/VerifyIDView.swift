import SwiftUI

/// Optional ID upload screen.
/// Phase 1: stub UI only — tapping "Skip" or "Verify Later" returns to home.
/// Phase 2 wires camera capture and `POST /me/verification` upload.
struct VerifyIDView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 20) {
                MonogramView()
                    .frame(width: 56, height: 56)
                    .padding(.top, 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text("verify.title")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("verify.subtitle")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }

                // Placeholder upload card
                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .fill(CupColors.cream)
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [6]))
                            .foregroundStyle(CupColors.primary.opacity(0.45))
                        VStack(spacing: 12) {
                            Image(systemName: "camera.viewfinder")
                                .font(.system(size: 44, weight: .semibold))
                                .foregroundStyle(CupColors.primary)
                            Text("verify.upload_cta")
                                .font(.system(size: 15, weight: .medium, design: .rounded))
                                .foregroundStyle(CupColors.cocoa)
                            Text("verify.upload_hint")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundStyle(CupColors.muted)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)
                        }
                    }
                    .frame(height: 220)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel(Text("verify.upload_cta"))
                }
                .padding(.top, 8)

                Spacer()

                Button {
                    // Phase 2 wires real upload; for now treat as "skip".
                    session.phase = .home
                } label: {
                    Text("verify.later")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(CupSecondaryButtonStyle())
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
        .preferredColorScheme(.light)
    }
}

#Preview {
    VerifyIDView()
        .environment(SessionStore())
}
