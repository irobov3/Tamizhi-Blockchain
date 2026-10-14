import Foundation

struct Conversation: Identifiable, Codable, Equatable {
    let id: String
    let participant1: String
    let participant2: String
    var lastMessage: String
    var lastTimestamp: Date
    var unreadCount: Int32

    init(
        id: String = UUID().uuidString,
        participant1: String,
        participant2: String,
        lastMessage: String = "",
        lastTimestamp: Date = Date(),
        unreadCount: Int32 = 0
    ) {
        self.id            = id
        self.participant1  = participant1
        self.participant2  = participant2
        self.lastMessage   = lastMessage
        self.lastTimestamp = lastTimestamp
        self.unreadCount   = unreadCount
    }

    // MARK: - Helpers

    /// Returns the participant address that is NOT our own wallet address.
    func otherParticipant(myAddress: String) -> String {
        participant1 == myAddress ? participant2 : participant1
    }

    var formattedTimestamp: String {
        let formatter = DateFormatter()
        let calendar  = Calendar.current
        if calendar.isDateInToday(lastTimestamp) {
            formatter.dateFormat = "HH:mm"
        } else if calendar.isDateInYesterday(lastTimestamp) {
            return "நேற்று"
        } else {
            formatter.dateStyle = .short
        }
        return formatter.string(from: lastTimestamp)
    }

    /// Avatar letter from the other participant address
    func avatarLetter(myAddress: String) -> String {
        let other = otherParticipant(myAddress: myAddress)
        return String(other.prefix(1)).uppercased()
    }
}

// MARK: - API DTO

struct ConversationDTO: Decodable {
    let id: String
    let participant1: String
    let participant2: String
    let lastMessage: String
    let lastTimestamp: String
    let unreadCount: Int32

    func toConversation() -> Conversation {
        let date = ISO8601DateFormatter().date(from: lastTimestamp) ?? Date()
        return Conversation(
            id:            id,
            participant1:  participant1,
            participant2:  participant2,
            lastMessage:   lastMessage,
            lastTimestamp: date,
            unreadCount:   unreadCount
        )
    }
}
