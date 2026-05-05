import SwiftUI

/// Live order tracking — pickup code, vertical timeline, collapsible items,
/// and cancel button.  Polls every 5 seconds while the order is active.
struct OrderTrackingView: View {
    let orderId: String
    var initialResponse: OrderResponse?

    @Environment(OrderStore.self) private var orderStore
    @Environment(\.dismiss) private var dismiss

    @State private var order: Order?
    @State private var timeline: [TimelineStep] = []
    @State private var isItemsExpanded: Bool = false
    @State private var showCancelConfirm: Bool = false
    @State private var isCancelling: Bool = false
    @State private var pollingTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            if let order {
                ScrollView {
                    VStack(spacing: 20) {
                        pickupCodeSection(order: order)
                        timelineSection
                        itemsSection(order: order)
                        orderInfoSection(order: order)

                        if order.status.isCancellable {
                            cancelButton
                        }

                        Color.clear.frame(height: 40)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                }
            } else {
                ProgressView(String(localized: "orders.loading"))
                    .tint(CupColors.primary)
            }
        }
        .navigationTitle(Text("orders.tracking_title"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if let initialResponse {
                order = initialResponse.order
                timeline = initialResponse.timeline
            } else {
                await refreshOrder()
            }
            startPolling()
        }
        .onDisappear {
            pollingTask?.cancel()
        }
        .confirmationDialog(
            Text("orders.cancel_order"),
            isPresented: $showCancelConfirm,
            titleVisibility: .visible
        ) {
            Button("orders.cancel_order", role: .destructive) {
                Task { await performCancel() }
            }
            Button("orders.keep_order", role: .cancel) {}
        } message: {
            Text("orders.cancel_confirm_message")
        }
    }

    // MARK: - Pickup code

    @ViewBuilder
    private func pickupCodeSection(order: Order) -> some View {
        if let code = order.pickupCode, !code.isEmpty {
            VStack(spacing: 8) {
                Text("orders.pickup_code")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(CupColors.muted)

                Text(verbatim: code)
                    .font(.system(size: 64, weight: .heavy, design: .rounded))
                    .foregroundStyle(CupColors.primary)
                    .tracking(4)

                Text("orders.show_code")
                    .font(.system(size: 13, design: .rounded))
                    .foregroundStyle(CupColors.cocoa)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
            .shadow(color: CupColors.espresso.opacity(0.06), radius: 12, x: 0, y: 4)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(Text(verbatim: "Pickup code: \(code)"))
        }
    }

    // MARK: - Timeline

    private var timelineSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("orders.status")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
                .padding(.bottom, 16)

            ForEach(Array(timeline.enumerated()), id: \.element.id) { index, step in
                HStack(alignment: .top, spacing: 14) {
                    // Timeline indicator
                    VStack(spacing: 0) {
                        timelineCircle(step: step)
                        if index < timeline.count - 1 {
                            Rectangle()
                                .fill(step.done ? CupColors.accent : CupColors.stroke)
                                .frame(width: 2)
                                .frame(height: 40)
                        }
                    }
                    .frame(width: 24)

                    // Label + time
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.label)
                            .font(.system(size: 15,
                                          weight: step.active ? .bold : (step.done ? .semibold : .medium),
                                          design: .rounded))
                            .foregroundStyle(step.done || step.active ? CupColors.espresso : CupColors.muted)

                        if let at = step.at {
                            Text(verbatim: formatTime(at))
                                .font(.system(size: 12, design: .rounded))
                                .foregroundStyle(CupColors.muted)
                        }
                    }
                    .padding(.bottom, index < timeline.count - 1 ? 20 : 0)

                    Spacer()
                }
                // Combine label + time into one VoiceOver utterance, with state
                // ("done", "in progress", "pending") as the value.
                .accessibilityElement(children: .combine)
                .accessibilityValue(Text(
                    step.done ? "done" : (step.active ? "in progress" : "pending")
                ))
            }
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func timelineCircle(step: TimelineStep) -> some View {
        if step.done {
            ZStack {
                Circle()
                    .fill(CupColors.accent)
                    .frame(width: 24, height: 24)
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
            }
        } else if step.active {
            ZStack {
                Circle()
                    .stroke(CupColors.accent, lineWidth: 3)
                    .frame(width: 24, height: 24)
                Circle()
                    .fill(CupColors.accent)
                    .frame(width: 10, height: 10)
            }
            .overlay(
                Circle()
                    .stroke(CupColors.accent.opacity(0.3), lineWidth: 2)
                    .frame(width: 32, height: 32)
                    .scaleEffect(1.0)
                    .opacity(0.6)
            )
        } else {
            Circle()
                .stroke(CupColors.stroke, lineWidth: 2)
                .frame(width: 24, height: 24)
        }
    }

    // MARK: - Items

    @ViewBuilder
    private func itemsSection(order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                    isItemsExpanded.toggle()
                }
            } label: {
                HStack {
                    Text(verbatim: "Items (\(order.totalItemCount))")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Spacer()
                    Image(systemName: isItemsExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(CupColors.muted)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text("orders.toggle_items_a11y"))

            if isItemsExpanded {
                VStack(spacing: 10) {
                    ForEach(order.items) { item in
                        HStack(spacing: 12) {
                            // Small image
                            itemImage(url: item.imageUrl)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(verbatim: item.productNameEn)
                                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                                    .foregroundStyle(CupColors.espresso)
                                    .lineLimit(1)

                                if !item.options.isEmpty {
                                    Text(verbatim: item.options.values.joined(separator: ", "))
                                        .font(.system(size: 12, design: .rounded))
                                        .foregroundStyle(CupColors.muted)
                                        .lineLimit(1)
                                }
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(verbatim: "x\(item.quantity)")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    .foregroundStyle(CupColors.cocoa)
                                Text(verbatim: "EGP \(Int(item.lineTotalEgp.rounded()))")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundStyle(CupColors.primary)
                            }
                        }
                    }
                }
                .padding(.top, 12)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func itemImage(url: String) -> some View {
        if let parsed = URL(string: url), !url.isEmpty {
            CachedAsyncImage(url: parsed) {
                imagePlaceholderSmall
            } content: { img in
                img.resizable().scaledToFill()
            }
            .frame(width: 40, height: 40)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        } else {
            imagePlaceholderSmall
                .frame(width: 40, height: 40)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
    }

    private var imagePlaceholderSmall: some View {
        ZStack {
            LinearGradient(colors: CupColors.sunriseStops,
                           startPoint: .topLeading,
                           endPoint: .bottomTrailing)
            Image(systemName: "cup.and.saucer.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white.opacity(0.65))
        }
    }

    // MARK: - Order info

    @ViewBuilder
    private func orderInfoSection(order: Order) -> some View {
        VStack(spacing: 8) {
            infoRow(label: "orders.order_date", value: order.formattedDate)
            infoRow(label: "orders.fulfillment_label",
                    value: String(localized: order.fulfillmentType == .pickup ? "orders.pickup" : "orders.delivery"))
            infoRow(label: "orders.payment_label", value: order.paymentMethod.label)
            Rectangle().fill(CupColors.stroke).frame(height: 1)
            infoRow(label: "orders.subtotal", value: "EGP \(Int(order.subtotalEgp.rounded()))")
            if order.discountEgp > 0 {
                infoRow(label: "orders.discount", value: "-EGP \(Int(order.discountEgp.rounded()))",
                        valueColor: CupColors.success)
            }
            infoRow(label: "orders.total", value: "EGP \(Int(order.totalEgp.rounded()))", isBold: true)
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    private func infoRow(label: LocalizedStringKey, value: String,
                         valueColor: Color = CupColors.espresso,
                         isBold: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14,
                              weight: isBold ? .bold : .medium,
                              design: .rounded))
                .foregroundStyle(CupColors.cocoa)
            Spacer()
            Text(verbatim: value)
                .font(.system(size: 14,
                              weight: isBold ? .bold : .semibold,
                              design: .rounded))
                .foregroundStyle(valueColor)
        }
    }

    // MARK: - Cancel

    private var cancelButton: some View {
        Button {
            showCancelConfirm = true
        } label: {
            HStack(spacing: 8) {
                if isCancelling {
                    ProgressView().tint(CupColors.error)
                } else {
                    Image(systemName: "xmark.circle")
                        .font(.system(size: 16, weight: .semibold))
                }
                Text("orders.cancel_order")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
            }
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
        .disabled(isCancelling)
        .accessibilityLabel(Text("orders.cancel_order"))
    }

    // MARK: - Actions

    private func refreshOrder() async {
        guard let res = await orderStore.fetchOrder(id: orderId) else { return }
        order = res.order
        timeline = res.timeline
    }

    private func performCancel() async {
        isCancelling = true
        let success = await orderStore.cancelOrder(id: orderId)
        isCancelling = false
        if success {
            await refreshOrder()
        }
    }

    private func startPolling() {
        pollingTask = Task {
            // Try SSE first; on drop, retry with exponential backoff;
            // on hard failure or absent SSE, fall back to 5-sec polling.
            var retryDelay: UInt64 = 1_000_000_000 // 1 s
            let maxDelay: UInt64 = 30_000_000_000  // 30 s

            while !Task.isCancelled {
                if let current = order?.status, current.isTerminal { break }
                do {
                    let stream = APIClient.shared.streamSSE(
                        "/orders/\(orderId)/events",
                        type: OrderResponse.self
                    )
                    for try await event in stream {
                        if Task.isCancelled { break }
                        order = event.order
                        timeline = event.timeline
                        if event.order.status.isTerminal { return }
                    }
                    // Stream ended cleanly — back off and reconnect
                    try? await Task.sleep(nanoseconds: retryDelay)
                    retryDelay = min(retryDelay * 2, maxDelay)
                } catch {
                    // SSE failed — fall back to polling for the rest of the lifecycle
                    while !Task.isCancelled {
                        try? await Task.sleep(for: .seconds(5))
                        guard !Task.isCancelled else { break }
                        if let current = order?.status, current.isTerminal { return }
                        await refreshOrder()
                    }
                    return
                }
            }
        }
    }

    // MARK: - Helpers

    private func formatTime(_ isoString: String) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = isoFormatter.date(from: isoString) else {
            isoFormatter.formatOptions = [.withInternetDateTime]
            guard let date2 = isoFormatter.date(from: isoString) else { return isoString }
            return Self.timeFormatter.string(from: date2)
        }
        return Self.timeFormatter.string(from: date)
    }

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()
}

#Preview {
    NavigationStack {
        OrderTrackingView(orderId: "demo-id")
    }
    .environment(OrderStore())
}
