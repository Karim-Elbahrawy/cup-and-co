import SwiftUI

/// List of past and current orders.  Tap navigates to the tracking view.
struct OrderHistoryView: View {
    @Environment(OrderStore.self) private var orderStore

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            if orderStore.isLoading && orderStore.orders.isEmpty {
                ProgressView()
                    .tint(CupColors.primary)
            } else if orderStore.orders.isEmpty {
                emptyState
            } else {
                orderList
            }
        }
        .navigationTitle(Text("orders.title"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await orderStore.fetchOrders()
        }
        .refreshable {
            await orderStore.fetchOrders()
        }
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(CupColors.cream)
                    .frame(width: 96, height: 96)
                Image(systemName: "bag")
                    .font(.system(size: 38, weight: .semibold))
                    .foregroundStyle(CupColors.primary)
            }
            Text("orders.empty")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
            Text("orders.empty_subtitle")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.muted)
        }
        .padding(.bottom, 80)
    }

    // MARK: - Order list

    private var orderList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(orderStore.orders) { order in
                    NavigationLink(value: order.id) {
                        OrderHistoryCard(order: order)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
        .navigationDestination(for: String.self) { orderId in
            OrderTrackingView(orderId: orderId)
        }
    }
}

// MARK: - Order history card

struct OrderHistoryCard: View {
    let order: Order

    var body: some View {
        VStack(spacing: 12) {
            // Top row: pickup code + status
            HStack {
                if let code = order.pickupCode, !code.isEmpty {
                    Text(verbatim: "#\(code)")
                        .font(.system(size: 18, weight: .heavy, design: .rounded))
                        .foregroundStyle(CupColors.primary)
                }

                Spacer()

                statusPill
            }

            // Details row
            HStack(spacing: 16) {
                detailItem(icon: "calendar", value: order.formattedDate)
                Spacer()
                detailItem(icon: "bag.fill",
                           value: "\(order.totalItemCount) item\(order.totalItemCount == 1 ? "" : "s")")
                Spacer()
                Text(verbatim: "EGP \(Int(order.totalEgp.rounded()))")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
            }
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
        .shadow(color: CupColors.espresso.opacity(0.04), radius: 6, x: 0, y: 2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text("Order \(order.pickupCode ?? order.id), \(order.status.label), \(order.totalItemCount) items"))
    }

    private var statusPill: some View {
        Text(order.status.label)
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(statusColor)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(statusColor.opacity(0.12))
            .clipShape(Capsule())
    }

    private var statusColor: Color {
        switch order.status {
        case .completed:                     return CupColors.success
        case .cancelled, .refunded:          return CupColors.error
        case .ready:                         return CupColors.accent
        case .preparing, .accepted:          return CupColors.star
        default:                             return CupColors.muted
        }
    }

    private func detailItem(icon: String, value: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(CupColors.muted)
            Text(verbatim: value)
                .font(.system(size: 12, design: .rounded))
                .foregroundStyle(CupColors.cocoa)
                .lineLimit(1)
        }
    }
}

#Preview {
    NavigationStack {
        OrderHistoryView()
    }
    .environment(OrderStore())
}
