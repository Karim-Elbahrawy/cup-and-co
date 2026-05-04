import SwiftUI

/// The home screen — top bar greeting, search pill, hero promo card,
/// role chip row, and a "Popular" 2-column grid.  Wraps everything in a
/// scroll view and adds pull-to-refresh on the catalog.
struct HomeView: View {
    @Environment(SessionStore.self) private var session
    @Environment(CatalogStore.self) private var catalog

    @State private var query: String = ""
    @State private var selectedCategory: String? = nil
    @State private var showUsual: Bool = false

    private var greetingName: String {
        let name = session.user?.firstName ?? ""
        return name.isEmpty
            ? NSLocalizedString("home.guest", comment: "")
            : name
    }

    private var roleSubtitle: LocalizedStringKey {
        guard let role = session.user?.role else { return "role.student" }
        return LocalizedStringKey(role.localizationKey)
    }

    private var heroPercent: Int {
        if let offer = catalog.heroOffer, offer.type == "percentage" {
            return Int(offer.value.rounded())
        }
        return 70
    }

    private let columns: [GridItem] = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    private var displayedProducts: [Product] {
        if let cat = selectedCategory {
            return catalog.products.filter { $0.categoryId == cat }
        }
        return catalog.popular
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                topBar
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                DailyOrderBarView(query: $query, onUsualTap: { showUsual = true })
                    .padding(.horizontal, 20)

                PromoBannerView(percent: heroPercent)
                    .padding(.horizontal, 20)

                // Active offers pills
                if !catalog.offers.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(catalog.offers, id: \.id) { offer in
                                Text(offer.localizedName(language: session.user?.languagePref ?? .en))
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(
                                        LinearGradient(
                                            colors: CupColors.sunriseStops,
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .clipShape(Capsule())
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }

                CategoryChipRow(
                    categories: catalog.categories,
                    selected: $selectedCategory,
                    language: session.user?.languagePref ?? .en
                )
                .padding(.horizontal, 20)

                sectionHeader
                    .padding(.horizontal, 20)

                if catalog.isLoading && catalog.products.isEmpty {
                    ProgressView()
                        .tint(CupColors.primary)
                        .frame(maxWidth: .infinity, minHeight: 160)
                } else if let err = catalog.error, catalog.products.isEmpty {
                    errorView(message: err)
                        .padding(.horizontal, 20)
                } else {
                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(displayedProducts) { product in
                            NavigationLink(value: product) {
                                ProductCardView(
                                    product: product,
                                    language: session.user?.languagePref ?? .en
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .navigationDestination(for: Product.self) { product in
                        ProductDetailView(product: product)
                    }
                }

                Color.clear.frame(height: 90) // tab-bar safe area
            }
            .padding(.bottom, 12)
        }
        .background(CupColors.paper.ignoresSafeArea())
        .refreshable {
            await catalog.load()
        }
        .task {
            // Only fetch once per session; pull-to-refresh handles re-fetches.
            if catalog.products.isEmpty {
                await catalog.load()
            }
        }
        .sheet(isPresented: $showUsual) {
            NavigationStack {
                OrderHistoryView()
            }
            .presentationDragIndicator(.visible)
            .presentationDetents([.large])
        }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(alignment: .center, spacing: 12) {
            ZStack {
                Circle()
                    .fill(CupColors.cream)
                    .frame(width: 44, height: 44)
                if let avatarId = session.user?.avatarId {
                    Image("avatar_\(avatarId)")
                        .resizable()
                        .scaledToFill()
                        .frame(width: 44, height: 44)
                        .clipShape(Circle())
                } else if let initials = avatarInitials {
                    Text(initials)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(CupColors.primary)
                } else {
                    MonogramView()
                        .frame(width: 30, height: 30)
                }
            }
            .overlay(Circle().stroke(CupColors.stroke, lineWidth: 1))
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 6) {
                    Text(Self.greetingKey())
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                    Text(verbatim: ", \(greetingName)")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundStyle(CupColors.muted)
                }
                Text(roleSubtitle)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(CupColors.espresso)
            }

            Spacer()
        }
    }

    private static func greetingKey() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "home.good_morning" }
        if hour < 17 { return "home.good_afternoon" }
        return "home.good_evening"
    }

    private var avatarInitials: String? {
        guard let full = session.user?.fullName?.trimmingCharacters(in: .whitespaces),
              !full.isEmpty else { return nil }
        let parts = full.split(separator: " ").prefix(2)
        return parts
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    // MARK: - Section header

    private var sectionHeader: some View {
        HStack {
            Text("home.popular")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(CupColors.espresso)
            Spacer()
            Button {
                // See All wires up in Phase 2.
            } label: {
                HStack(spacing: 4) {
                    Text("home.see_all")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(CupColors.accent)
            }
        }
    }

    // MARK: - Error

    @ViewBuilder
    private func errorView(message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32))
                .foregroundStyle(CupColors.muted)
            Text(message)
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(CupColors.muted)
                .multilineTextAlignment(.center)
            Button {
                Task { await catalog.load() }
            } label: {
                Text("common.retry")
            }
            .buttonStyle(CupSecondaryButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }
}

#Preview {
    NavigationStack {
        HomeView()
    }
    .environment(SessionStore())
    .environment(CatalogStore())
    .environment(CartStore())
}
