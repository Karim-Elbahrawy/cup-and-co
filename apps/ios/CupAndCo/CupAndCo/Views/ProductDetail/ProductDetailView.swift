import SwiftUI

/// Full-screen product detail with hero image, option selectors,
/// quantity stepper, and a sticky "Add to Cart" bottom bar.
struct ProductDetailView: View {
    let product: Product

    @Environment(CartStore.self) private var cart
    @Environment(SessionStore.self) private var session
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dismiss) private var dismiss

    // Dynamic Type tokens — adopt key headings so users with larger text
    // sizes get a readable interface.
    @ScaledMetric(relativeTo: .title2) private var nameSize: CGFloat = 24
    @ScaledMetric(relativeTo: .subheadline) private var descSize = CupTypography.bodyMd

    @State private var quantity: Int = 1
    @State private var selectedSize: String = "Medium"
    @State private var selectedSugar: String = "Normal"
    @State private var selectedIce: String = "Normal"
    @State private var isFavorite: Bool = false
    @State private var addedToCart: Bool = false

    private let sizes = ["Small", "Medium", "Large"]
    private let sizeDeltas: [String: Double] = ["Small": -10, "Medium": 0, "Large": 10]
    private let sugarOptions = ["None", "Less", "Normal", "Extra"]
    private let iceOptions = ["None", "Less", "Normal", "Extra"]

    private static let arLabels: [String: String] = [
        "Size": "الحجم", "Sugar": "السكر", "Ice": "الثلج", "Quantity": "الكمية",
        "Small": "صغير", "Medium": "وسط", "Large": "كبير",
        "None": "بدون", "Less": "أقل", "Normal": "عادي", "Extra": "إضافي",
    ]

    private func localized(_ key: String) -> String {
        language == .ar ? (Self.arLabels[key] ?? key) : key
    }

    private var language: LanguagePref {
        session.user?.languagePref ?? .en
    }

    private var currentPrice: Double {
        let delta = sizeDeltas[selectedSize] ?? 0
        return (product.basePriceEgp + delta) * Double(quantity)
    }

    private var unitPrice: Double {
        product.basePriceEgp + (sizeDeltas[selectedSize] ?? 0)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            CupColors.paper.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    heroSection
                    detailSection
                    Color.clear.frame(height: 120)
                }
            }

            stickyBottomBar
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    withAnimation(reduceMotion ? .none : .spring(response: 0.35, dampingFraction: 0.65)) {
                        isFavorite.toggle()
                    }
                    Task {
                        if isFavorite {
                            _ = try? await FavoritesAPI.add(productId: product.id)
                        } else {
                            _ = try? await FavoritesAPI.remove(productId: product.id)
                        }
                    }
                } label: {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(isFavorite ? CupColors.primary : CupColors.muted)
                        .frame(width: 40, height: 40)
                        .background(CupColors.surface)
                        .clipShape(Circle())
                        .shadow(color: CupColors.espresso.opacity(0.06),
                                radius: 4, x: 0, y: 2)
                }
                .accessibilityLabel(Text(isFavorite ? "Remove from favorites" : "Add to favorites"))
            }
        }
    }

    // MARK: - Hero image

    private var heroSection: some View {
        ZStack {
            // Warm radial glow
            RadialGradient(
                colors: [CupColors.primary.opacity(0.18), CupColors.paper],
                center: .center,
                startRadius: 20,
                endRadius: 180
            )
            .frame(height: 280)

            // Product image
            if let url = URL(string: product.imageUrl), !product.imageUrl.isEmpty {
                CachedAsyncImage(url: url) {
                    ProgressView()
                        .tint(CupColors.primary)
                        .frame(width: 200, height: 200)
                } content: { img in
                    img.resizable()
                        .scaledToFit()
                        .frame(width: 200, height: 200)
                        .clipShape(Circle())
                        .shadow(color: CupColors.espresso.opacity(0.12),
                                radius: 20, x: 0, y: 10)
                }
            } else {
                placeholderIcon
            }
        }
    }

    private var placeholderIcon: some View {
        ZStack {
            Circle()
                .fill(LinearGradient(colors: CupColors.sunriseStops,
                                     startPoint: .topLeading,
                                     endPoint: .bottomTrailing))
                .frame(width: 200, height: 200)
            Image(systemName: "cup.and.saucer.fill")
                .font(.system(size: 64, weight: .semibold))
                .foregroundStyle(.white.opacity(0.7))
        }
        .shadow(color: CupColors.espresso.opacity(0.12),
                radius: 20, x: 0, y: 10)
    }

    // MARK: - Detail section

    private var detailSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Name + rating
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: product.localizedName(language))
                        .font(.system(size: nameSize, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.espresso)

                    Text(verbatim: product.localizedDescription(language))
                        .font(.system(size: descSize, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(CupColors.star)
                    Text(verbatim: String(format: "%.1f", product.ratingAvg))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.cocoa)
                    Text(verbatim: "(\(product.ratingCount))")
                        .font(.system(size: 12, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
            }

            // Quantity stepper
            quantityStepper

            // Option groups
            optionSection(title: localized("Size"), options: sizes, selection: $selectedSize,
                          deltas: sizeDeltas)
            optionSection(title: localized("Sugar"), options: sugarOptions, selection: $selectedSugar)
            optionSection(title: localized("Ice"), options: iceOptions, selection: $selectedIce)
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }

    // MARK: - Quantity stepper

    private var quantityStepper: some View {
        HStack(spacing: 0) {
            Text(localized("Quantity"))
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.espresso)

            Spacer()

            HStack(spacing: 0) {
                Button {
                    if quantity > 1 {
                        withAnimation(reduceMotion ? .none : .spring(response: 0.35, dampingFraction: 0.65)) {
                            quantity -= 1
                        }
                    }
                } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(quantity > 1 ? CupColors.primary : CupColors.muted)
                        .frame(width: 36, height: 36)
                        .background(CupColors.cream)
                        .clipShape(Circle())
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel(Text("Decrease quantity"))
                .disabled(quantity <= 1)

                Text(verbatim: "\(quantity)")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .frame(width: 44)

                Button {
                    withAnimation(reduceMotion ? .none : .spring(response: 0.35, dampingFraction: 0.65)) {
                        quantity += 1
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(CupColors.primary)
                        .clipShape(Circle())
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel(Text("Increase quantity"))
            }
        }
        .padding(16)
        .background(CupColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(CupColors.stroke, lineWidth: 1)
        )
    }

    // MARK: - Option chips

    @ViewBuilder
    private func optionSection(title: String,
                               options: [String],
                               selection: Binding<String>,
                               deltas: [String: Double]? = nil) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(CupColors.espresso)

            HStack(spacing: 10) {
                ForEach(options, id: \.self) { option in
                    let isSelected = selection.wrappedValue == option
                    Button {
                        withAnimation(reduceMotion ? .none : .spring(response: 0.35, dampingFraction: 0.65)) {
                            selection.wrappedValue = option
                        }
                    } label: {
                        VStack(spacing: 2) {
                            Text(localized(option))
                                .font(.system(size: 14, weight: isSelected ? .bold : .medium, design: .rounded))

                            if let deltas, let d = deltas[option], d != 0 {
                                Text(verbatim: d > 0 ? "+\(Int(d)) EGP" : "\(Int(d)) EGP")
                                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                                    .foregroundStyle(isSelected ? .white.opacity(0.8) : CupColors.muted)
                            }
                        }
                        .foregroundStyle(isSelected ? .white : CupColors.espresso)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(isSelected ? CupColors.primary : CupColors.cream)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .scaleEffect(isSelected ? 1.0 : 0.97)
                    .accessibilityLabel(Text("\(title): \(option)"))
                    .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
                }
            }
        }
    }

    // MARK: - Sticky bottom bar

    private var stickyBottomBar: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Total")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(CupColors.muted)
                Text(verbatim: "EGP \(Int(currentPrice.rounded()))")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
                    .contentTransition(.numericText())
            }

            Spacer()

            Button {
                let options = ["size": selectedSize, "sugar": selectedSugar, "ice": selectedIce]
                let deltas = sizeDeltas.filter { options.values.contains($0.key) }
                cart.addItem(
                    product: product,
                    quantity: quantity,
                    options: options,
                    optionDeltas: deltas
                )
                withAnimation(reduceMotion ? .none : .spring(response: 0.35, dampingFraction: 0.65)) {
                    addedToCart = true
                }
                // Reset after brief feedback
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    addedToCart = false
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: addedToCart ? "checkmark" : "bag.badge.plus")
                        .font(.system(size: 16, weight: .bold))
                    Text(addedToCart ? "Added!" : "Add to Cart")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 14)
                .background(addedToCart ? CupColors.success : CupColors.primary)
                .clipShape(Capsule())
            }
            .accessibilityLabel(Text("Add to cart"))
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            CupColors.surface
                .shadow(color: CupColors.espresso.opacity(0.08),
                        radius: 16, x: 0, y: -4)
                .ignoresSafeArea(edges: .bottom)
        )
    }
}

#Preview {
    let p = Product(
        id: "demo",
        categoryId: "c1",
        nameEn: "Velvet Cappuccino",
        nameAr: "\u{0643}\u{0627}\u{0628}\u{062a}\u{0634}\u{064a}\u{0646}\u{0648}",
        descriptionEn: "Silky steamed milk with cocoa dust",
        descriptionAr: "\u{062d}\u{0644}\u{064a}\u{0628}",
        basePriceEgp: 65,
        imageUrl: "",
        prepMinutes: 4,
        isAvailable: true,
        sortOrder: 0,
        ratingAvg: 4.9,
        ratingCount: 132
    )
    return NavigationStack {
        ProductDetailView(product: p)
    }
    .environment(CartStore())
    .environment(SessionStore())
}
