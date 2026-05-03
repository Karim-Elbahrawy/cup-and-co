import SwiftUI

/// Rounded-pill search bar with a separate filled circle filter button.
/// Pure UI for Phase 1 — search wires up in Phase 2.
struct SearchBarView: View {
    @Binding var query: String
    var onFilterTap: () -> Void = {}

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(CupColors.muted)

                TextField("home.search_placeholder", text: $query)
                    .font(.system(size: 15, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .submitLabel(.search)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(CupColors.surface)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(CupColors.stroke, lineWidth: 1))
            .accessibilityLabel(Text("home.search_placeholder"))

            Button(action: onFilterTap) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 50, height: 50)
                    .background(CupColors.primary)
                    .clipShape(Circle())
                    .shadow(color: CupColors.primary.opacity(0.3),
                            radius: 10, x: 0, y: 4)
            }
            .accessibilityLabel(Text("home.filter"))
        }
    }
}

#Preview {
    @Previewable @State var q = ""
    return SearchBarView(query: $q)
        .padding()
        .background(CupColors.paper)
}
