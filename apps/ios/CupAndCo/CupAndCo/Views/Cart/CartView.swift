import SwiftUI

/// Cart screen — lists all cart items with quantity steppers, a points
/// redemption slider, order summary, and a "Continue to Checkout" button.
struct CartView: View {
    @Environment(CartStore.self) private var cart
    @Environment(SessionStore.self) private var session

    @State private var showCheckout: Bool = false
    @State private var loyaltyBalance: Int = 0
    @State private var discountPerPoint: Double = 0

    private var discount: Double {
        guard discountPerPoint > 0 else { return 0 }
        return Double(cart.redeemPoints) * discountPerPoint
    }

    private var total: Double {
        max(0, cart.subtotal - discount)
    }

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            if cart.isEmpty {
                emptyState
            } else {
                cartContent
            }
        }
        .navigationTitle(Text("cart.title"))
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showCheckout) {
            CheckoutView()
        }
        .task {
            await fetchLoyalty()
        }
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(CupColors.cream)
                    .frame(width: 96, height: 96)
                MonogramView()
                    .frame(width: 48, height: 48)
            }
            Text("cart.empty")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
            Text("cart.empty_subtitle")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.muted)
                .multilineTextAlignment(.center)
        }
        .padding(.bottom, 80)
    }

    // MARK: - Cart content

    private var cartContent: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(cart.items) { item in
                        CartItemRow(item: item)
                    }

                    if loyaltyBalance > 0 {
                        pointsRedemption
                    }

                    orderSummary

                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
            }

            checkoutBar
        }
    }

    // MARK: - Points redemption

    private var pointsRedemption: some View {
        @Bindable var cartBindable = cart
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "star.circle.fill")
                    .foregroundStyle(CupColors.star)
                Text("cart.redeem_points")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                Spacer()
                Text(verbatim: "\(cart.redeemPoints) pts")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.primary)
            }

            Slider(value: Binding(
                get: { Double(cart.redeemPoints) },
                set: { cart.redeemPoints = Int($0) }
            ), in: 0...Double(loyaltyBalance), step: 10)
            .tint(CupColors.primary)
            .accessibilityLabel(Text("cart.redeem_slider_a11y"))

            HStack {
                Text(verbatim: "0")
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                Spacer()
                Text(verbatim: "\(loyaltyBalance) pts available")
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            }

            if discount > 0 {
                Text(verbatim: "You save EGP \(Int(discount.rounded()))")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.success)
            }
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    // MARK: - Order summary

    private var orderSummary: some View {
        VStack(spacing: 10) {
            summaryRow(label: "cart.subtotal", value: "EGP \(Int(cart.subtotal.rounded()))")
            if discount > 0 {
                summaryRow(label: "cart.points_discount", value: "-EGP \(Int(discount.rounded()))",
                           valueColor: CupColors.success)
            }
            Rectangle()
                .fill(CupColors.stroke)
                .frame(height: 1)
            summaryRow(label: "cart.total", value: "EGP \(Int(total.rounded()))", isBold: true)
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    private func summaryRow(label: LocalizedStringKey, value: String,
                            valueColor: Color = CupColors.espresso,
                            isBold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: isBold ? 16 : 14,
                              weight: isBold ? .bold : .medium,
                              design: .rounded))
                .foregroundStyle(CupColors.cocoa)
            Spacer()
            Text(verbatim: value)
                .font(.system(size: isBold ? 18 : 14,
                              weight: isBold ? .bold : .semibold,
                              design: .rounded))
                .foregroundStyle(valueColor)
        }
    }

    // MARK: - Checkout bar

    private var checkoutBar: some View {
        Button {
            showCheckout = true
        } label: {
            HStack {
                Text("cart.continue")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                Spacer()
                Text(verbatim: "EGP \(Int(total.rounded()))")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(CupColors.primary)
            .clipShape(RoundedRectangle(cornerRadius: 999, style: .continuous))
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(
            CupColors.surface
                .shadow(color: CupColors.espresso.opacity(0.08),
                        radius: 16, x: 0, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
        .accessibilityLabel(Text("cart.continue"))
    }

    // MARK: - Loyalty fetch

    private func fetchLoyalty() async {
        do {
            let res = try await LoyaltyAPI.fetch()
            loyaltyBalance = res.balance
            if res.balance > 0 {
                discountPerPoint = res.discountAvailableEgp / Double(res.balance)
            }
        } catch {
            // Non-critical — just hide the slider
        }
    }
}

// MARK: - Cart Item Row

struct CartItemRow: View {
    let item: CartItem
    @Environment(CartStore.self) private var cart
    @Environment(SessionStore.self) private var session

    private var language: LanguagePref {
        session.user?.languagePref ?? .en
    }

    var body: some View {
        HStack(spacing: 12) {
            // Product image
            productImage

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(verbatim: item.product.localizedName(language: language))
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .lineLimit(1)

                if !item.optionsSummary.isEmpty {
                    Text(verbatim: item.optionsSummary)
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                        .lineLimit(1)
                }

                Text(verbatim: item.priceLabel)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.primary)
            }

            Spacer()

            // Quantity stepper
            HStack(spacing: 0) {
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                        cart.updateQuantity(itemId: item.id, quantity: item.quantity - 1)
                    }
                } label: {
                    Image(systemName: item.quantity == 1 ? "trash" : "minus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(item.quantity == 1 ? CupColors.error : CupColors.primary)
                        .frame(width: 30, height: 30)
                        .background(CupColors.cream)
                        .clipShape(Circle())
                }
                .accessibilityLabel(item.quantity == 1 ? Text("cart.remove_item") : Text("cart.decrease_qty"))

                Text(verbatim: "\(item.quantity)")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .frame(width: 32)

                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                        cart.updateQuantity(itemId: item.id, quantity: item.quantity + 1)
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(CupColors.primary)
                        .clipShape(Circle())
                }
                .accessibilityLabel(Text("cart.increase_qty"))
            }
        }
        .padding(14)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .shadow(color: CupColors.espresso.opacity(0.04), radius: 6, x: 0, y: 2)
        .accessibilityElement(children: .combine)
    }

    private var productImage: some View {
        Group {
            if let url = URL(string: item.product.imageUrl), !item.product.imageUrl.isEmpty {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    default:
                        imagePlaceholder
                    }
                }
            } else {
                imagePlaceholder
            }
        }
        .frame(width: 56, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var imagePlaceholder: some View {
        ZStack {
            LinearGradient(colors: CupColors.sunriseStops,
                           startPoint: .topLeading,
                           endPoint: .bottomTrailing)
            Image(systemName: "cup.and.saucer.fill")
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.white.opacity(0.65))
        }
    }
}

#Preview {
    NavigationStack {
        CartView()
    }
    .environment(CartStore())
    .environment(SessionStore())
}
