import SwiftUI

/// Replaces the plain search bar on the home screen.
/// Top row: two quick-action tiles to build the daily ordering habit.
/// Bottom row: compact search + filter for menu browsing.
struct DailyOrderBarView: View {
    @Binding var query: String
    var onFilterTap: () -> Void = {}
    var onUsualTap: () -> Void = {}

    var body: some View {
        VStack(spacing: 10) {
            quickButtons
            searchRow
        }
    }

    // MARK: - Quick-order tiles

    private var quickButtons: some View {
        HStack(spacing: 10) {
            usualButton
            newOrderButton
        }
        .frame(height: 78)
    }

    private var usualButton: some View {
        Button(action: onUsualTap) {
            ZStack(alignment: .bottomLeading) {
                LinearGradient(
                    colors: CupColors.sunriseStops,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                Circle()
                    .fill(.white.opacity(0.10))
                    .frame(width: 56, height: 56)
                    .blur(radius: 10)
                    .offset(x: 40, y: -28)

                VStack(alignment: .leading, spacing: 2) {
                    Image(systemName: "arrow.counterclockwise.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))

                    Spacer()

                    Text("home.your_usual")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("home.one_tap")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.80))
                }
                .padding(12)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: CupColors.primary.opacity(0.30), radius: 12, x: 0, y: 6)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("home.your_usual"))
    }

    private var newOrderButton: some View {
        Button {
            // Scroll down to the product grid — handled by the parent view.
        } label: {
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(CupColors.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(CupColors.stroke, lineWidth: 1)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(CupColors.primary)

                    Spacer()

                    Text("home.new_order")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)
                    Text("home.browse_build")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
                .padding(12)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("home.new_order"))
    }

    // MARK: - Search row

    private var searchRow: some View {
        HStack(spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(CupColors.muted)

                TextField("home.search_placeholder", text: $query)
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .submitLabel(.search)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(CupColors.surface)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(CupColors.stroke, lineWidth: 1))

            Button(action: onFilterTap) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(CupColors.primary)
                    .clipShape(Circle())
                    .shadow(color: CupColors.primary.opacity(0.28), radius: 10, x: 0, y: 4)
            }
            .accessibilityLabel(Text("home.filter"))
        }
    }
}

#Preview {
    @Previewable @State var q = ""
    return DailyOrderBarView(query: $q)
        .padding()
        .background(CupColors.paper)
}
