import SwiftUI

/// Product grid cell — image at top, favorite heart, name + description,
/// price, and rating row.  Tap is exposed via `onTap` (Phase 2 wires
/// product detail).
struct ProductCardView: View {
    let product: Product
    var language: LanguagePref = .en
    @State private var isFavorite: Bool = false
    var onTap: () -> Void = {}
    var onFavoriteTap: () -> Void = {}

    // Dynamic Type
    @ScaledMetric(relativeTo: .body) private var nameSize = CupTypography.bodyLg
    @ScaledMetric(relativeTo: .caption) private var descSize = CupTypography.microLg
    @ScaledMetric(relativeTo: .subheadline) private var priceSize = CupTypography.bodyMd

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                imageSection
                infoSection
            }
            .background(CupColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(CupColors.stroke, lineWidth: 1)
            )
            .shadow(color: CupColors.espresso.opacity(0.05),
                    radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text(verbatim: product.localizedName(language)))
        .accessibilityValue(Text(product.priceLabel))
    }

    // MARK: - Image

    private var imageSection: some View {
        ZStack(alignment: .topTrailing) {
            // Sunrise gradient placeholder, swapped out by AsyncImage on success.
            Rectangle()
                .fill(LinearGradient(colors: CupColors.sunriseStops,
                                     startPoint: .topLeading,
                                     endPoint: .bottomTrailing))
                .overlay(
                    Image(systemName: "cup.and.saucer.fill")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.65))
                )

            if let url = URL(string: product.imageUrl), !product.imageUrl.isEmpty {
                CachedAsyncImage(url: url) {
                    Color.clear
                } content: { img in
                    img.resizable().scaledToFill()
                }
                .clipped()
            }

            // Favorite heart
            Button {
                isFavorite.toggle()
                onFavoriteTap()
            } label: {
                Image(systemName: isFavorite ? "heart.fill" : "heart")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isFavorite ? CupColors.primary : CupColors.muted)
                    .frame(width: 30, height: 30)
                    .background(.white.opacity(0.95))
                    .clipShape(Circle())
                    .shadow(color: CupColors.espresso.opacity(0.08),
                            radius: 4, x: 0, y: 2)
            }
            .padding(8)
            .accessibilityLabel(Text(isFavorite
                                     ? "product.unfavorite"
                                     : "product.favorite"))
        }
        .frame(height: 120)
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: 16,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: 0,
                topTrailingRadius: 16,
                style: .continuous
            )
        )
    }

    // MARK: - Info

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(verbatim: product.localizedName(language))
                .font(.system(size: nameSize, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
                .lineLimit(1)

            Text(verbatim: product.localizedDescription(language))
                .font(.system(size: descSize, design: .rounded))
                .foregroundStyle(CupColors.muted)
                .lineLimit(1)

            HStack(spacing: 6) {
                Text(product.priceLabel)
                    .font(.system(size: priceSize, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.primary)
                Spacer(minLength: 0)
                Image(systemName: "star.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(CupColors.star)
                Text(verbatim: String(format: "%.1f", product.ratingAvg))
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(CupColors.cocoa)
            }
            .padding(.top, 2)
        }
        .padding(12)
    }
}

#Preview {
    let p = Product(
        id: "demo",
        categoryId: "c1",
        nameEn: "Velvet Cappuccino",
        nameAr: "كابتشينو فيلفت",
        descriptionEn: "Silky steamed milk with cocoa dust",
        descriptionAr: "حليب مبخر مع كاكاو",
        basePriceEgp: 65,
        imageUrl: "",
        prepMinutes: 4,
        isAvailable: true,
        sortOrder: 0,
        ratingAvg: 4.9,
        ratingCount: 132
    )
    return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
        ProductCardView(product: p)
        ProductCardView(product: p)
    }
    .padding()
    .background(CupColors.paper)
}
