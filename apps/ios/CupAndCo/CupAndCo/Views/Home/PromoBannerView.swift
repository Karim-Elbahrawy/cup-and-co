import SwiftUI

/// Sunrise gradient hero card. Single source of truth for the
/// "Today Only — 70% OFF — Super Discount" promo on the home screen.
struct PromoBannerView: View {
    /// Discount percentage to display. 70 → "70% OFF".
    let percent: Int
    var onTap: () -> Void = {}

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var blobAnim = false

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Gradient background
            LinearGradient(colors: CupColors.sunriseStops,
                           startPoint: .topLeading,
                           endPoint: .bottomTrailing)

            // Decorative blurred white blobs
            Circle()
                .fill(.white.opacity(0.18))
                .frame(width: 180, height: 180)
                .blur(radius: 12)
                .offset(x: blobAnim ? 70 : 90, y: blobAnim ? -60 : -40)

            Circle()
                .fill(.white.opacity(0.12))
                .frame(width: 120, height: 120)
                .blur(radius: 18)
                .offset(x: blobAnim ? 130 : 110, y: blobAnim ? 70 : 90)

            // Foreground content
            VStack(alignment: .leading, spacing: 6) {
                Text("home.today_only_eyebrow")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .tracking(2.5)
                    .foregroundStyle(.white.opacity(0.92))

                Text(verbatim: "\(percent)% OFF")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .accessibilityLabel(Text(String(format: NSLocalizedString("home.off_percent_a11y",
                                                                              comment: ""),
                                                    percent)))

                Text("home.super_discount")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))

                Button(action: onTap) {
                    Text("common.order_now")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 22)
                        .padding(.vertical, 10)
                        .background(.white)
                        .foregroundStyle(CupColors.primary)
                        .clipShape(Capsule())
                }
                .padding(.top, 8)
                .accessibilityLabel(Text("common.order_now"))
            }
            .padding(22)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 170)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: CupColors.primary.opacity(0.18), radius: 16, x: 0, y: 8)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                blobAnim.toggle()
            }
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    PromoBannerView(percent: 70)
        .padding()
        .background(CupColors.paper)
}
