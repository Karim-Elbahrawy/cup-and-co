#if canImport(SwiftUI)
import SwiftUI
#else
import TokamakShim
#endif

struct OrderSuccessOverlay: View {
    let orderId: String
    let pickupCode: String?
    let onTrackOrder: () -> Void
    let onBackToHome: () -> Void

    @State private var showContent = false

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Checkmark icon
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80, weight: .medium))
                    .foregroundStyle(CupColors.primary)
                    .scaleEffect(showContent ? 1 : 0.01)
                    .opacity(showContent ? 1 : 0)
                    .animation(.spring(response: 0.5, dampingFraction: 0.55), value: showContent)

                // Title
                Text("checkout.order_placed")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .padding(.top, 20)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 16)
                    .animation(.easeOut(duration: 0.4).delay(0.25), value: showContent)

                // Subtitle
                Text("checkout.preparing_order")
                    .font(.system(size: 16, design: .rounded))
                    .foregroundStyle(CupColors.cocoa)
                    .padding(.top, 6)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 10)
                    .animation(.easeOut(duration: 0.4).delay(0.4), value: showContent)

                // Pickup code
                if let code = pickupCode, !code.isEmpty {
                    VStack(spacing: 4) {
                        Text("orders.pickup_code")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(CupColors.muted)
                            .textCase(.uppercase)
                            .tracking(0.2)

                        Text(code)
                            .font(.system(size: 48, weight: .bold, design: .rounded))
                            .foregroundStyle(CupColors.primary)
                    }
                    .padding(.horizontal, 32)
                    .padding(.vertical, 20)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(CupColors.surface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(CupColors.stroke, lineWidth: 1)
                            )
                    )
                    .padding(.top, 24)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 14)
                    .animation(.easeOut(duration: 0.4).delay(0.55), value: showContent)
                }

                // Buttons
                VStack(spacing: 12) {
                    Button(action: onTrackOrder) {
                        HStack(spacing: 8) {
                            Image(systemName: "location.fill.viewfinder")
                            Text("checkout.track_order")
                        }
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(CupColors.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 999, style: .continuous))
                    }

                    Button(action: onBackToHome) {
                        HStack(spacing: 8) {
                            Image(systemName: "house.fill")
                            Text("checkout.back_to_home")
                        }
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 999, style: .continuous)
                                .fill(CupColors.surface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 999, style: .continuous)
                                        .stroke(CupColors.stroke, lineWidth: 1)
                                )
                        )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 32)
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 20)
                .animation(.easeOut(duration: 0.4).delay(0.65), value: showContent)

                Spacer()
            }
        }
        .onAppear {
            showContent = true
        }
    }
}

#Preview {
    OrderSuccessOverlay(
        orderId: "test-123",
        pickupCode: "ABC123",
        onTrackOrder: {},
        onBackToHome: {}
    )
}






