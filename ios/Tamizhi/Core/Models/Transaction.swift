import Foundation

// MARK: - TransactionType

enum TransactionType: String, Codable {
    case send    = "send"
    case receive = "receive"
    case stake   = "stake"
    case unstake = "unstake"
    case reward  = "reward"
    case unknown = "unknown"

    var displayName: String {
        switch self {
        case .send:    return "அனுப்பினோம்"
        case .receive: return "பெற்றோம்"
        case .stake:   return "ஸ்டேக்"
        case .unstake: return "அன்ஸ்டேக்"
        case .reward:  return "வெகுமதி"
        case .unknown: return "தெரியாத வகை"
        }
    }

    var icon: String {
        switch self {
        case .send:    return "arrow.up.circle.fill"
        case .receive: return "arrow.down.circle.fill"
        case .stake:   return "lock.circle.fill"
        case .unstake: return "lock.open.circle.fill"
        case .reward:  return "star.circle.fill"
        case .unknown: return "questionmark.circle.fill"
        }
    }

    var isCredit: Bool {
        switch self {
        case .receive, .reward: return true
        default:                return false
        }
    }
}

// MARK: - Transaction

struct Transaction: Identifiable, Codable, Equatable {
    let id: String          // tx hash
    let type: TransactionType
    let fromAddress: String
    let toAddress: String
    let amount: Double      // human-readable TMZ
    let denom: String
    let memo: String
    let timestamp: Date
    let blockHeight: Int64
    var status: TxStatus

    enum TxStatus: String, Codable {
        case pending   = "pending"
        case confirmed = "confirmed"
        case failed    = "failed"

        var displayName: String {
            switch self {
            case .pending:   return "நிலுவையில்"
            case .confirmed: return "உறுதிப்படுத்தப்பட்டது"
            case .failed:    return "தோல்வி"
            }
        }
    }

    init(
        id: String,
        type: TransactionType,
        fromAddress: String,
        toAddress: String,
        amount: Double,
        denom: String = "TMZ",
        memo: String = "",
        timestamp: Date = Date(),
        blockHeight: Int64 = 0,
        status: TxStatus = .confirmed
    ) {
        self.id          = id
        self.type        = type
        self.fromAddress = fromAddress
        self.toAddress   = toAddress
        self.amount      = amount
        self.denom       = denom
        self.memo        = memo
        self.timestamp   = timestamp
        self.blockHeight = blockHeight
        self.status      = status
    }

    var formattedAmount: String {
        let sign  = type.isCredit ? "+" : "-"
        let value = String(format: "%.6f", amount)
        return "\(sign)\(value) TMZ"
    }

    var shortHash: String {
        guard id.count > 12 else { return id }
        return "\(id.prefix(6))…\(id.suffix(6))"
    }

    var formattedDate: String {
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        fmt.timeStyle = .short
        return fmt.string(from: timestamp)
    }
}
