import Foundation

struct Wallet: Identifiable, Codable, Equatable {
    let id: UUID
    var address: String
    var publicKey: String          // Ed25519 hex-encoded
    var x25519PublicKey: String    // X25519 hex-encoded for E2E encryption
    var label: String
    var balance: Double            // Human-readable TMZ
    var isActive: Bool
    var createdAt: Date

    init(
        id: UUID = UUID(),
        address: String,
        publicKey: String,
        x25519PublicKey: String,
        label: String = "My Wallet",
        balance: Double = 0,
        isActive: Bool = true,
        createdAt: Date = Date()
    ) {
        self.id              = id
        self.address         = address
        self.publicKey       = publicKey
        self.x25519PublicKey = x25519PublicKey
        self.label           = label
        self.balance         = balance
        self.isActive        = isActive
        self.createdAt       = createdAt
    }

    /// Balance formatted for display, e.g. "1,234.56 TMZ"
    var formattedBalance: String {
        let formatter = NumberFormatter()
        formatter.numberStyle           = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 6
        return "\(formatter.string(from: NSNumber(value: balance)) ?? "0") TMZ"
    }

    /// Truncated address for display
    var shortAddress: String {
        address.truncateAddress(chars: 6)
    }
}

// MARK: - Wallet Storage Key

extension Wallet {
    static let storageKey = "tamizhi_wallets"

    static func loadAll() -> [Wallet] {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let wallets = try? JSONDecoder().decode([Wallet].self, from: data) else {
            return []
        }
        return wallets
    }

    static func saveAll(_ wallets: [Wallet]) {
        guard let data = try? JSONEncoder().encode(wallets) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    static func active() -> Wallet? {
        loadAll().first { $0.isActive }
    }
}
