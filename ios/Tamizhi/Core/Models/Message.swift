import Foundation

// MARK: - MessageStatus

enum MessageStatus: String, Codable, CaseIterable {
    case sending   = "sending"
    case sent      = "sent"
    case delivered = "delivered"
    case read      = "read"
    case failed    = "failed"

    var displayText: String {
        switch self {
        case .sending:   return "அனுப்புகிறது…"
        case .sent:      return "அனுப்பப்பட்டது"
        case .delivered: return "வழங்கப்பட்டது"
        case .read:      return "படிக்கப்பட்டது"
        case .failed:    return "தோல்வி"
        }
    }

    var icon: String {
        switch self {
        case .sending:   return "clock"
        case .sent:      return "checkmark"
        case .delivered: return "checkmark.circle"
        case .read:      return "checkmark.circle.fill"
        case .failed:    return "exclamationmark.circle"
        }
    }
}

// MARK: - Message

struct Message: Identifiable, Codable, Equatable {
    let id: String
    let fromAddress: String
    let toAddress: String
    let encryptedContent: String
    var decryptedContent: String?
    let timestamp: Date
    var status: MessageStatus
    let conversationId: String

    init(
        id: String = UUID().uuidString,
        fromAddress: String,
        toAddress: String,
        encryptedContent: String,
        decryptedContent: String? = nil,
        timestamp: Date = Date(),
        status: MessageStatus = .sending,
        conversationId: String
    ) {
        self.id               = id
        self.fromAddress      = fromAddress
        self.toAddress        = toAddress
        self.encryptedContent = encryptedContent
        self.decryptedContent = decryptedContent
        self.timestamp        = timestamp
        self.status           = status
        self.conversationId   = conversationId
    }

    /// True when the message was sent by our wallet address
    func isSent(by address: String) -> Bool {
        fromAddress == address
    }

    var displayContent: String {
        decryptedContent ?? "🔒 Encrypted"
    }

    var formattedTimestamp: String {
        let formatter = DateFormatter()
        let calendar  = Calendar.current
        if calendar.isDateInToday(timestamp) {
            formatter.dateFormat = "HH:mm"
        } else if calendar.isDateInYesterday(timestamp) {
            return "நேற்று"
        } else {
            formatter.dateStyle = .short
        }
        return formatter.string(from: timestamp)
    }
}

// MARK: - API DTOs

struct MessageDTO: Decodable {
    let id: String
    let from: String
    let to: String
    let encryptedContent: String
    let nonce: String
    let timestamp: String
    let status: String

    func toMessage(conversationId: String) -> Message {
        let date = ISO8601DateFormatter().date(from: timestamp) ?? Date()
        return Message(
            id:               id,
            fromAddress:      from,
            toAddress:        to,
            encryptedContent: encryptedContent,
            timestamp:        date,
            status:           MessageStatus(rawValue: status) ?? .sent,
            conversationId:   conversationId
        )
    }
}
