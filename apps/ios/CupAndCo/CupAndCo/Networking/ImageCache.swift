import Foundation
import SwiftUI

/// In-memory image cache backed by NSCache. Bound by total cost (≈ 80 MB
/// of decoded pixel data) so it self-trims under memory pressure. Used by
/// `CachedAsyncImage` to avoid redownloading product photos every time a
/// list scrolls or a sheet remounts.
final class ImageCache: @unchecked Sendable {
    static let shared = ImageCache()

    private let cache: NSCache<NSURL, NSData> = {
        let c = NSCache<NSURL, NSData>()
        c.totalCostLimit = 80 * 1024 * 1024
        return c
    }()

    func data(for url: URL) -> Data? {
        cache.object(forKey: url as NSURL) as Data?
    }

    func set(_ data: Data, for url: URL) {
        cache.setObject(data as NSData, forKey: url as NSURL, cost: data.count)
    }
}

/// Drop-in replacement for SwiftUI `AsyncImage` that memoizes downloads
/// across mounts. URLSession provides on-disk caching too, but iOS's
/// HTTP cache misses on response headers; an explicit in-memory cache
/// guarantees instant repeat renders.
struct CachedAsyncImage<Placeholder: View, Content: View>: View {
    let url: URL?
    let placeholder: () -> Placeholder
    let content: (Image) -> Content

    @State private var image: UIImage?
    @State private var isLoading = false

    init(url: URL?,
         @ViewBuilder placeholder: @escaping () -> Placeholder,
         @ViewBuilder content: @escaping (Image) -> Content) {
        self.url = url
        self.placeholder = placeholder
        self.content = content
    }

    var body: some View {
        Group {
            if let image {
                content(Image(uiImage: image))
            } else {
                placeholder()
            }
        }
        .task(id: url) {
            await load()
        }
    }

    @MainActor
    private func load() async {
        guard let url else { image = nil; return }
        if let cached = ImageCache.shared.data(for: url),
           let ui = UIImage(data: cached) {
            image = ui
            return
        }
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            ImageCache.shared.set(data, for: url)
            if let ui = UIImage(data: data) { image = ui }
        } catch {
            // Leave image nil so the placeholder stays
        }
    }
}
