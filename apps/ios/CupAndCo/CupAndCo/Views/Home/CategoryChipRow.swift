import SwiftUI

/// Horizontal scroll of category chips.
struct CategoryChipRow: View {
    let categories: [Category]
    @Binding var selected: String?
    let language: LanguagePref
    
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                // "All" category
                chip(id: nil, title: language == .ar ? "الكل" : "All")
                
                ForEach(categories) { cat in
                    chip(id: cat.id, title: language == .ar ? cat.nameAr : cat.nameEn)
                }
            }
        }
    }

    @ViewBuilder
    private func chip(id: String?, title: String) -> some View {
        let isSelected = id == selected
        Button {
            let anim: Animation = reduceMotion
                ? .linear(duration: 0.001)
                : .spring(response: 0.35, dampingFraction: 0.65)
            withAnimation(anim) { selected = id }
        } label: {
            Text(title)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .foregroundStyle(isSelected ? .white : CupColors.espresso)
                .background(isSelected ? CupColors.primary : CupColors.cream)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(
                        isSelected ? CupColors.primary : Color.clear,
                        lineWidth: 1
                    )
                )
                .shadow(color: isSelected
                        ? CupColors.primary.opacity(0.25)
                        : .clear,
                        radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(title))
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
    }
}
