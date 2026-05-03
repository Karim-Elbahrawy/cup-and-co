import SwiftUI

/// Three-slide onboarding: brand intro → benefits → CTA.
/// Uses `TabView` with `.page` style and a custom terracotta dot indicator.
struct OnboardingView: View {
    @Environment(SessionStore.self) private var session
    @State private var page: Int = 0

    private struct Slide: Identifiable {
        let id: Int
        let titleKey: LocalizedStringKey
        let bodyKey: LocalizedStringKey
        let symbol: String
    }

    private let slides: [Slide] = [
        Slide(id: 0,
              titleKey: "onboarding.title.1",
              bodyKey: "onboarding.body.1",
              symbol: "cup.and.saucer.fill"),
        Slide(id: 1,
              titleKey: "onboarding.title.2",
              bodyKey: "onboarding.body.2",
              symbol: "bolt.heart.fill"),
        Slide(id: 2,
              titleKey: "onboarding.title.3",
              bodyKey: "onboarding.body.3",
              symbol: "sparkles")
    ]

    var body: some View {
        ZStack {
            CupColors.paper.ignoresSafeArea()

            VStack(spacing: 0) {
                // Skip
                HStack {
                    Spacer()
                    Button {
                        session.completeOnboarding()
                    } label: {
                        Text("onboarding.skip")
                            .font(.system(size: 15, weight: .medium, design: .rounded))
                            .foregroundStyle(CupColors.muted)
                    }
                    .accessibilityLabel(Text("onboarding.skip"))
                }
                .padding(.horizontal, 24)
                .padding(.top, 12)

                // Pager
                TabView(selection: $page) {
                    ForEach(slides) { slide in
                        slideView(slide)
                            .tag(slide.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))

                // Indicator dots
                HStack(spacing: 8) {
                    ForEach(slides.indices, id: \.self) { i in
                        Capsule()
                            .fill(i == page ? CupColors.primary : CupColors.stroke)
                            .frame(width: i == page ? 22 : 8, height: 8)
                            .animation(.spring(response: 0.35,
                                               dampingFraction: 0.65),
                                       value: page)
                    }
                }
                .padding(.bottom, 24)

                // CTA
                Button {
                    if page < slides.count - 1 {
                        withAnimation { page += 1 }
                    } else {
                        session.completeOnboarding()
                    }
                } label: {
                    Text(page < slides.count - 1
                         ? LocalizedStringKey("onboarding.next")
                         : LocalizedStringKey("onboarding.get_started"))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(CupPrimaryButtonStyle())
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .preferredColorScheme(.light)
    }

    @ViewBuilder
    private func slideView(_ slide: Slide) -> some View {
        VStack(spacing: 24) {
            Spacer()
            ZStack {
                Circle()
                    .fill(LinearGradient(colors: CupColors.sunriseStops,
                                         startPoint: .topLeading,
                                         endPoint: .bottomTrailing))
                    .frame(width: 220, height: 220)
                    .shadow(color: CupColors.primary.opacity(0.25),
                            radius: 24, x: 0, y: 12)

                Image(systemName: slide.symbol)
                    .font(.system(size: 88, weight: .semibold))
                    .foregroundStyle(.white)
                    .symbolEffect(.bounce, options: .nonRepeating, value: page)
            }

            VStack(spacing: 12) {
                Text(slide.titleKey)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .multilineTextAlignment(.center)
                Text(slide.bodyKey)
                    .font(.system(size: 16, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
            }
            .padding(.horizontal, 32)

            Spacer()
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    OnboardingView()
        .environment(SessionStore())
}
