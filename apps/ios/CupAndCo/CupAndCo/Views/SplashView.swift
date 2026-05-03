import SwiftUI

/// 1.5s logo splash on a paper background.
/// The actual hand-off to onboarding/phone/home is driven by `SessionStore`
/// — this view just runs its intro animation and idles.
struct SplashView: View {
    @State private var appeared = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(spacing: 24) {
                MonogramView()
                    .frame(width: 120, height: 120)
                    .scaleEffect(appeared || reduceMotion ? 1 : 0.85)
                    .opacity(appeared || reduceMotion ? 1 : 0)

                VStack(spacing: 6) {
                    Text("app.name")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("app.tagline")
                        .font(.system(size: 15, weight: .medium, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
                .opacity(appeared || reduceMotion ? 1 : 0)
                .offset(y: appeared || reduceMotion ? 0 : 8)
            }
        }
        .task {
            if !reduceMotion {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    appeared = true
                }
            } else {
                appeared = true
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text("app.name"))
    }
}

#Preview {
    SplashView()
}
