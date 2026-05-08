import SwiftUI

/// Six-digit OTP entry with auto-advancing focus.
///
/// Implementation note: SwiftUI's `TextField` doesn't expose first-responder
/// movement easily across `FocusState` items. We therefore use a single
/// hidden `TextField` to accept input and render six visual cells on top.
/// This is the standard SwiftUI workaround and gets us paste support for free.
struct OTPVerifyView: View {
    let phone: String
    @Environment(SessionStore.self) private var session

    @State private var code: String = ""
    @State private var resendCooldown: Int = 30
    @FocusState private var focused: Bool

    private let length = 6

    private var isValid: Bool {
        code.count == length && code.allSatisfy(\.isNumber)
    }

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                MonogramView()
                    .frame(width: 56, height: 56)
                    .padding(.top, 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text("otp.title")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    (
                        Text(LocalizedStringKey("otp.subtitle")) +
                        Text(verbatim: " ") +
                        Text(verbatim: phone)
                            .foregroundColor(CupColors.primary)
                    )
                    .font(.system(size: 15, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                }

                otpRow
                    .padding(.top, 24)
                    .onTapGesture { focused = true }

                if let err = session.lastError {
                    Text(err)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundStyle(CupColors.error)
                }

                // Hidden input
                TextField("", text: $code)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .focused($focused)
                    .opacity(0.001) // not 0 so the system still shows the keyboard
                    .frame(height: 1)
                    .onChange(of: code) { _, newValue in
                        let digits = newValue.filter(\.isNumber)
                        if digits != newValue { code = digits; return }
                        if digits.count > length {
                            code = String(digits.prefix(length))
                        }
                        if digits.count == length {
                            Task { await session.verifyOTP(code: digits) }
                        }
                    }

                Spacer()

                Button {
                    Task { await session.verifyOTP(code: code) }
                } label: {
                    HStack(spacing: 10) {
                        if session.isLoading {
                            ProgressView().tint(.white)
                        }
                        Text("otp.verify")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(CupPrimaryButtonStyle())
                .disabled(!isValid || session.isLoading)
                .opacity(isValid ? 1 : 0.6)
                .padding(.bottom, 8)

                Button {
                    Task {
                        await session.sendOTP(phone: phone)
                        resendCooldown = 30
                    }
                } label: {
                    if resendCooldown > 0 {
                        Text("Resend in \(resendCooldown)s")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundStyle(CupColors.muted)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("otp.resend")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundStyle(CupColors.accent)
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(resendCooldown > 0)
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
        }
        .preferredColorScheme(.light)
        .onAppear { focused = true }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            if resendCooldown > 0 { resendCooldown -= 1 }
        }
    }

    private var otpRow: some View {
        HStack(spacing: 10) {
            ForEach(0..<length, id: \.self) { index in
                otpCell(at: index)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text("otp.title"))
    }

    @ViewBuilder
    private func otpCell(at index: Int) -> some View {
        let chars = Array(code)
        let char: Character? = index < chars.count ? chars[index] : nil
        let isFocused = focused && index == chars.count
        ZStack {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(CupColors.surface)
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(isFocused ? CupColors.primary : CupColors.stroke,
                        lineWidth: isFocused ? 2 : 1)
            if let char {
                Text(String(char))
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 58)
    }
}

#Preview {
    OTPVerifyView(phone: "+201000000001")
        .environment(SessionStore())
}
