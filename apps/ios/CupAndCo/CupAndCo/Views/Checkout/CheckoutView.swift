import SwiftUI

/// Checkout screen — fulfillment toggle, time slot picker, payment method
/// selection, notes field, and "Place Order" button.
struct CheckoutView: View {
    @Environment(CartStore.self) private var cart
    @Environment(OrderStore.self) private var orderStore
    @Environment(\.dismiss) private var dismiss

    @State private var fulfillment: FulfillmentType = .pickup
    @State private var selectedTimeSlot: String = "ASAP"
    @State private var paymentMethod: PaymentMethod = .cash
    @State private var notes: String = ""
    @State private var isPlacing: Bool = false
    @State private var showSuccess: Bool = false
    @State private var showTracking: Bool = false
    @State private var placedOrderResponse: OrderResponse?

    private var timeSlots: [String] {
        var slots = ["ASAP"]
        let calendar = Calendar.current
        let now = Date()
        // Round up to next 15-min boundary
        let minute = calendar.component(.minute, from: now)
        let roundedMinute = ((minute / 15) + 1) * 15
        guard let base = calendar.date(bySetting: .minute, value: roundedMinute, of: now) else {
            return slots
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        for i in 0..<4 {
            if let slot = calendar.date(byAdding: .minute, value: i * 15, to: base) {
                slots.append(formatter.string(from: slot))
            }
        }
        return slots
    }

    private var scheduledISO: String? {
        guard selectedTimeSlot != "ASAP" else { return nil }
        // Parse the selected time and combine with today's date
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        guard let time = formatter.date(from: selectedTimeSlot) else { return nil }
        let calendar = Calendar.current
        let now = Date()
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)
        components.hour = timeComponents.hour
        components.minute = timeComponents.minute
        guard let date = calendar.date(from: components) else { return nil }
        return ISO8601DateFormatter().string(from: date)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            CupColors.paper.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    fulfillmentSection
                    timeSlotSection
                    paymentSection
                    notesSection
                    summarySection
                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
            }

            placeOrderBar
        }
        .navigationTitle(Text("checkout.title"))
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showSuccess) {
            if let response = placedOrderResponse {
                OrderSuccessOverlay(
                    orderId: response.order.id,
                    pickupCode: response.order.pickupCode,
                    onTrackOrder: {
                        showSuccess = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            showTracking = true
                        }
                    },
                    onBackToHome: {
                        showSuccess = false
                        dismiss()
                    }
                )
            }
        }
        .navigationDestination(isPresented: $showTracking) {
            if let response = placedOrderResponse {
                OrderTrackingView(orderId: response.order.id,
                                  initialResponse: response)
            }
        }
    }

    // MARK: - Fulfillment

    private var fulfillmentSection: some View {
        sectionCard(title: "checkout.fulfillment") {
            HStack(spacing: 0) {
                fulfillmentButton(type: .pickup, label: "checkout.pickup", icon: "bag.fill")
                fulfillmentButton(type: .delivery, label: "checkout.delivery", icon: "bicycle")
            }
            .padding(4)
            .background(CupColors.cream)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func fulfillmentButton(type: FulfillmentType, label: LocalizedStringKey, icon: String) -> some View {
        let isSelected = fulfillment == type
        return Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                fulfillment = type
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                Text(label)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
            }
            .foregroundStyle(isSelected ? .white : CupColors.cocoa)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? CupColors.primary : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(label))
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
    }

    // MARK: - Time slot

    private var timeSlotSection: some View {
        sectionCard(title: "checkout.time") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(timeSlots, id: \.self) { slot in
                        let isSelected = selectedTimeSlot == slot
                        let displayLabel = slot == "ASAP" ? String(localized: "checkout.asap") : slot
                        Button {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                                selectedTimeSlot = slot
                            }
                        } label: {
                            Text(verbatim: displayLabel)
                                .font(.system(size: 13, weight: isSelected ? .bold : .medium, design: .rounded))
                                .foregroundStyle(isSelected ? .white : CupColors.espresso)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(isSelected ? CupColors.primary : CupColors.cream)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text(verbatim: displayLabel))
                        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
                    }
                }
            }
        }
    }

    // MARK: - Payment method

    private var paymentSection: some View {
        sectionCard(title: "checkout.payment_method") {
            HStack(spacing: 10) {
                ForEach([PaymentMethod.paymobCard, .paymobWallet, .cash], id: \.rawValue) { method in
                    paymentCard(method: method)
                }
            }
        }
    }

    private func paymentCard(method: PaymentMethod) -> some View {
        let isSelected = paymentMethod == method
        return Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.65)) {
                paymentMethod = method
            }
        } label: {
            VStack(spacing: 8) {
                Image(systemName: method.sfSymbol)
                    .font(.system(size: 22, weight: .semibold))
                Text(method.label)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
            }
            .foregroundStyle(isSelected ? CupColors.primary : CupColors.cocoa)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isSelected
                    ? CupColors.primaryTint.opacity(0.5)
                    : CupColors.cream
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isSelected ? CupColors.primary : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(verbatim: "Pay with \(method.label)"))
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
    }

    // MARK: - Notes

    private var notesSection: some View {
        sectionCard(title: "checkout.notes") {
            TextField("checkout.notes_placeholder", text: $notes, axis: .vertical)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.espresso)
                .lineLimit(3...5)
                .padding(12)
                .background(CupColors.cream.opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .onChange(of: notes) { _, newValue in
                    if newValue.count > 500 {
                        notes = String(newValue.prefix(500))
                    }
                }

            HStack {
                Spacer()
                Text(verbatim: "\(notes.count)/500")
                    .font(.system(size: 11, design: .rounded))
                    .foregroundStyle(CupColors.muted)
            }
        }
    }

    // MARK: - Summary

    private var summarySection: some View {
        sectionCard(title: "checkout.order_summary") {
            VStack(spacing: 8) {
                HStack {
                    Text(verbatim: "\(cart.itemCount) item\(cart.itemCount == 1 ? "" : "s")")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundStyle(CupColors.cocoa)
                    Spacer()
                    Text(verbatim: "EGP \(Int(cart.subtotal.rounded()))")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                }
                if cart.redeemPoints > 0 {
                    HStack {
                        Text(verbatim: "\(cart.redeemPoints) points redeemed")
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(CupColors.cocoa)
                        Spacer()
                    }
                }
            }
        }
    }

    // MARK: - Place order bar

    private var placeOrderBar: some View {
        Button {
            Task {
                isPlacing = true
                let notesValue = notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes
                let response = await orderStore.placeOrder(
                    cart: cart,
                    fulfillment: fulfillment,
                    payment: paymentMethod,
                    scheduledFor: scheduledISO,
                    notes: notesValue
                )
                isPlacing = false
                if let response {
                    placedOrderResponse = response
                    cart.clear()
                    showSuccess = true
                }
            }
        } label: {
            HStack(spacing: 10) {
                if isPlacing {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18, weight: .bold))
                }
                Text("checkout.place_order")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isPlacing ? CupColors.muted : CupColors.primary)
            .clipShape(RoundedRectangle(cornerRadius: 999, style: .continuous))
        }
        .disabled(isPlacing || cart.isEmpty)
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(
            CupColors.surface
                .shadow(color: CupColors.espresso.opacity(0.08),
                        radius: 16, x: 0, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
        .accessibilityLabel(Text("checkout.place_order"))
    }

    // MARK: - Section card helper

    @ViewBuilder
    private func sectionCard<Content: View>(title: LocalizedStringKey,
                                             @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
            content()
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }
}

#Preview {
    NavigationStack {
        CheckoutView()
    }
    .environment(CartStore())
    .environment(OrderStore())
}
