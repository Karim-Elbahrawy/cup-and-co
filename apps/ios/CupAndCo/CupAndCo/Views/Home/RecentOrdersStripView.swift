import SwiftUI

/// Horizontal scroll strip of the user's 3 most-recent terminal orders,
/// shown on HomeView under the promo banner. Each card shows pickup code,
/// items summary, total, status, and a one-tap Reorder button that maps
/// items back onto products in the catalog and adds them to the cart.
///
/// Renders nothing while loading or when the user has no past orders, so
/// new users never see an empty placeholder on home.
struct RecentOrdersStripView: View {
    @Environment(OrderStore.self) private var orderStore
    @Environment(CatalogStore.self) private var catalog
    @Environment(CartStore.self) private var cart
    @Environment(SessionStore.self) private var session

    @State private var loaded: Bool = false
    @State private var toast: String?

    /// Up to 3 most-recent terminal orders.
    private var recentTerminal: [Order] {
        orderStore.orders
            .filter { $0.status.isTerminal }
            .prefix(3)
            .map { $0 }
    }

    var body: some View {
        Group {
            if loaded && !recentTerminal.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("home.recent_orders")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(CupColors.espresso)
                        Spacer()
                        NavigationLink(destination: OrderHistoryView()) {
                            HStack(spacing: 4) {
                                Text("home.see_all")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundStyle(CupColors.accent)
                        }
                    }
                    .padding(.horizontal, 20)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(alignment: .top, spacing: 12) {
                            ForEach(recentTerminal, id: \.id) { order in
                                OrderCard(order: order, language: session.user?.languagePref ?? .en) {
                                    reorder(order)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }
            }
        }
        .task {
            // Populate the order list on first appearance so the strip can
            // surface past orders. We don't block the rest of the home page
            // on this — the rest of the UI is already rendering.
            if orderStore.orders.isEmpty {
                await orderStore.fetchOrders()
            }
            loaded = true
        }
        .overlay(alignment: .top) {
            if let toast = toast {
                Text(verbatim: toast)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(CupColors.primary)
                    .clipShape(Capsule())
                    .shadow(color: CupColors.primary.opacity(0.30), radius: 12, x: 0, y: 6)
                    .padding(.top, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.75), value: toast)
    }

    /// Maps the past order's items back onto the current catalog and adds
    /// them to the cart. Items whose product was removed from the catalog
    /// are silently skipped.
    private func reorder(_ order: Order) {
        var added = 0
        for item in order.items {
            guard let product = catalog.products.first(where: { $0.id == item.productId }) else { continue }
            cart.addItem(
                product: product,
                quantity: item.quantity,
                options: item.options
            )
            added += item.quantity
        }
        let lang = session.user?.languagePref ?? .en
        if added > 0 {
            toast = lang == .ar ? "تمت الإضافة إلى السلة" : "Added to cart"
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                toast = nil
            }
        }
    }
}

// MARK: - Card

private struct OrderCard: View {
    let order: Order
    let language: LanguagePref
    let onReorder: () -> Void

    private var itemsSummary: String {
        order.items
            .prefix(3)
            .map { "\($0.quantity)× \(language == .ar ? $0.productNameAr : $0.productNameEn)" }
            .joined(separator: " · ")
    }

    private var statusColor: Color {
        switch order.status {
        case .completed: return Color(red: 0.16, green: 0.55, blue: 0.39) // emerald-700
        case .cancelled, .refunded: return Color(red: 0.71, green: 0.18, blue: 0.27) // rose-700
        default: return CupColors.muted
        }
    }

    private var statusBg: Color {
        switch order.status {
        case .completed: return Color(red: 0.85, green: 0.95, blue: 0.89) // emerald-100
        case .cancelled, .refunded: return Color(red: 0.99, green: 0.88, blue: 0.90) // rose-100
        default: return CupColors.cream
        }
    }

    private var totalText: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: language == .ar ? "ar-EG" : "en-US")
        let amount = formatter.string(from: NSNumber(value: order.totalEgp)) ?? "\(order.totalEgp)"
        return language == .ar ? "\(amount) ج.م" : "EGP \(amount)"
    }

    var body: some View {
        NavigationLink(value: order.id) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("#\(order.pickupCode ?? String(order.id.prefix(6)))")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                        .tracking(0.5)
                    Spacer()
                    Text(LocalizedStringKey("orders.\(order.status.rawValue)"))
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundStyle(statusColor)
                        .tracking(0.4)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(statusBg)
                        .clipShape(Capsule())
                }

                Text(verbatim: itemsSummary)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(verbatim: order.formattedDate)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(CupColors.muted)

                Text(verbatim: totalText)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.primary)

                Button(action: onReorder) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 11, weight: .bold))
                        Text("orders.reorder")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                    }
                    .foregroundStyle(CupColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(CupColors.cream)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(12)
            .frame(width: 240, alignment: .leading)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
