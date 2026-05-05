import SwiftUI

struct SearchView: View {
    @Environment(SessionStore.self) private var session
    @Environment(CatalogStore.self) private var catalog

    @State private var query: String = ""

    private var language: LanguagePref {
        session.user?.languagePref ?? .en
    }

    private var filtered: [Product] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return catalog.products }
        return catalog.products.filter { product in
            product.nameEn.lowercased().contains(q) ||
            product.nameAr.contains(q) ||
            (product.descriptionEn?.lowercased().contains(q) ?? false)
        }
    }

    private let columns: [GridItem] = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(CupColors.muted)
                    TextField(language == .ar ? "بحث..." : "Search...", text: $query)
                        .font(.system(size: 15, design: .rounded))
                        .autocorrectionDisabled()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(CupColors.surface)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(CupColors.stroke, lineWidth: 1))

                if filtered.isEmpty && !query.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "cup.and.saucer")
                            .font(.system(size: 32))
                            .foregroundStyle(CupColors.muted)
                        Text(language == .ar ? "لا توجد نتائج" : "No results")
                            .font(.system(size: 14, design: .rounded))
                            .foregroundStyle(CupColors.muted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
                } else {
                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(filtered) { product in
                            NavigationLink(value: product) {
                                ProductCardView(
                                    product: product,
                                    language: language
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .navigationDestination(for: Product.self) { product in
                        ProductDetailView(product: product)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
        .background(CupColors.paper.ignoresSafeArea())
        .navigationTitle(language == .ar ? "بحث" : "Search")
        .navigationBarTitleDisplayMode(.large)
    }
}

#Preview {
    NavigationStack {
        SearchView()
    }
    .environment(SessionStore())
    .environment(CatalogStore())
}
