import SwiftUI

/// Phone-number entry screen. Egypt-only for Phase 1: locked +20 prefix
/// and 9-digit local number (the leading 0 is implied).
struct PhoneOTPView: View {
    @Environment(SessionStore.self) private var session
    @State private var local: String = ""
    @FocusState private var focused: Bool

    /// Combined E.164 phone string for the API (`+20XXXXXXXXX`).
    private var fullPhone: String {
        "+20\(local)"
    }

    private var isValid: Bool {
        // 10 digits after the country code = full Egyptian mobile number
        // entered as e.g. 1000000001 (we accept 9 or 10 to be lenient).
        local.count >= 9 && local.count <= 11 && local.allSatisfy(\.isNumber)
    }

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 20) {
                MonogramView()
                    .frame(width: 56, height: 56)
                    .padding(.top, 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text("phone.title")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("phone.subtitle")
                        .font(.system(size: 15, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }

                phoneField
                    .padding(.top, 12)

                if let err = session.lastError {
                    Text(err)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.error)
                        .padding(.top, 4)
                }

                Spacer()

                Button {
                    Task { await session.sendOTP(phone: fullPhone) }
                } label: {
                    HStack(spacing: 10) {
                        if session.isLoading {
                            ProgressView().tint(.white)
                        }
                        Text("phone.send_code")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(CupPrimaryButtonStyle())
                .disabled(!isValid || session.isLoading)
                .opacity(isValid ? 1 : 0.6)
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
        .preferredColorScheme(.light)
        .onAppear { focused = true }
    }

    private var phoneField: some View {
        HStack(spacing: 0) {
            // Country code chip
            HStack(spacing: 6) {
                Text("🇪🇬")
                    .font(.system(size: 20))
                Text("+20")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 16)
            .background(CupColors.cream)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            TextField("phone.placeholder", text: $local)
                .keyboardType(.numberPad)
                .textContentType(.telephoneNumber)
                .focused($focused)
                .font(.system(size: 16, weight: .medium, design: .rounded))
                .foregroundStyle(CupColors.espresso)
                .padding(.horizontal, 14)
                .padding(.vertical, 16)
                .onChange(of: local) { _, newValue in
                    let digits = newValue.filter(\.isNumber)
                    if digits != newValue { local = digits }
                    if digits.count > 11 { local = String(digits.prefix(11)) }
                }
        }
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text("phone.title"))
    }
}

#Preview {
    PhoneOTPView()
        .environment(SessionStore())
}
