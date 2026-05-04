import Foundation

// MARK: - Enums

enum OrderStatus: String, Codable, Sendable, CaseIterable {
    case received
    case accepted
    case preparing
    case ready
    case outForDelivery = "out_for_delivery"
    case completed
    case cancelled
    case refunded

    var label: String {
        switch self {
        case .received:       return "Received"
        case .accepted:       return "Accepted"
        case .preparing:      return "Preparing"
        case .ready:          return "Ready"
        case .outForDelivery: return "Out for Delivery"
        case .completed:      return "Completed"
        case .cancelled:      return "Cancelled"
        case .refunded:       return "Refunded"
        }
    }

    var sfSymbol: String {
        switch self {
        case .received:       return "tray.and.arrow.down.fill"
        case .accepted:       return "checkmark.circle.fill"
        case .preparing:      return "cup.and.saucer.fill"
        case .ready:          return "bell.fill"
        case .outForDelivery: return "bicycle"
        case .completed:      return "bag.fill.badge.checkmark"
        case .cancelled:      return "xmark.circle.fill"
        case .refunded:       return "arrow.uturn.backward.circle.fill"
        }
    }

    /// Whether the order can still be cancelled by the customer.
    var isCancellable: Bool {
        switch self {
        case .received, .accepted: return true
        default: return false
        }
    }

    /// Whether this is a terminal status.
    var isTerminal: Bool {
        switch self {
        case .completed, .cancelled, .refunded: return true
        default: return false
        }
    }
}

enum FulfillmentType: String, Codable, Sendable {
    case pickup
    case delivery
}

enum PaymentMethod: String, Codable, Sendable {
    case paymobCard   = "paymob_card"
    case paymobWallet = "paymob_wallet"
    case cash

    var label: String {
        switch self {
        case .paymobCard:   return "Card"
        case .paymobWallet: return "Wallet"
        case .cash:         return "Cash"
        }
    }

    var sfSymbol: String {
        switch self {
        case .paymobCard:   return "creditcard.fill"
        case .paymobWallet: return "wallet.pass.fill"
        case .cash:         return "banknote.fill"
        }
    }
}

enum PaymentStatus: String, Codable, Sendable {
    case unpaid
    case pending
    case paid
    case failed
    case refunded
}

// MARK: - Structs

struct OrderItem: Codable, Identifiable, Equatable, Sendable {
    var id: String { "\(productId)_\(productNameEn)" }

    let productId: String
    let productNameEn: String
    let productNameAr: String
    let imageUrl: String
    let quantity: Int
    let options: [String: String]
    let unitPriceEgp: Double
    let lineTotalEgp: Double

    enum CodingKeys: String, CodingKey {
        case productId      = "product_id"
        case productNameEn  = "product_name_en"
        case productNameAr  = "product_name_ar"
        case imageUrl       = "image_url"
        case quantity, options
        case unitPriceEgp   = "unit_price_egp"
        case lineTotalEgp   = "line_total_egp"
    }
}

struct StatusEvent: Codable, Equatable, Sendable {
    let status: OrderStatus
    let at: String
    let note: String?
}

struct Order: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let userId: String
    let status: OrderStatus
    let fulfillmentType: FulfillmentType
    let paymentMethod: PaymentMethod
    let paymentStatus: PaymentStatus
    let subtotalEgp: Double
    let discountEgp: Double
    let pointsRedeemed: Int
    let totalEgp: Double
    let pointsAwarded: Int
    let pickupCode: String?
    let scheduledFor: String?
    let notes: String?
    let items: [OrderItem]
    let statusHistory: [StatusEvent]
    let createdAt: String
    let pickedUpAt: String?

    enum CodingKeys: String, CodingKey {
        case id, status, notes, items
        case userId          = "user_id"
        case fulfillmentType = "fulfillment_type"
        case paymentMethod   = "payment_method"
        case paymentStatus   = "payment_status"
        case subtotalEgp     = "subtotal_egp"
        case discountEgp     = "discount_egp"
        case pointsRedeemed  = "points_redeemed"
        case totalEgp        = "total_egp"
        case pointsAwarded   = "points_awarded"
        case pickupCode      = "pickup_code"
        case scheduledFor    = "scheduled_for"
        case statusHistory   = "status_history"
        case createdAt       = "created_at"
        case pickedUpAt      = "picked_up_at"
    }

    /// Human-friendly date string.
    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: createdAt) else {
            // Retry without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let date2 = formatter.date(from: createdAt) else { return createdAt }
            return Self.displayFormatter.string(from: date2)
        }
        return Self.displayFormatter.string(from: date)
    }

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .short
        return f
    }()

    /// Total item count across all line items.
    var totalItemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }
}

// MARK: - API Response wrappers

struct TimelineStep: Codable, Identifiable, Equatable, Sendable {
    var id: String { status.rawValue }

    let status: OrderStatus
    let label: String
    let at: String?
    let active: Bool
    let done: Bool
}

struct OrderResponse: Codable, Sendable {
    let order: Order
    let timeline: [TimelineStep]
}

struct OrdersListResponse: Codable, Sendable {
    let orders: [Order]
}
