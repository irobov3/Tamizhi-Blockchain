import SwiftUI
import Combine

@MainActor
class MessengerViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var messages: [String: [Message]] = [:]  // keyed by conversationId
    @Published var isLoading = false
    @Published var error: String?
    @Published var typingAddresses: Set<String> = []

    private let apiClient = APIClient.shared
    private let cryptoService = CryptoService()
    private let coreDataStack = CoreDataStack.shared
    private var pollingTask: Task<Void, Never>?
    private var pollingAddress: String?

    // MARK: - Load Conversations

    func loadConversations() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let dtos = try await apiClient.getConversations()
            self.conversations = dtos.map { $0.toConversation() }
                .sorted { $0.lastTimestamp > $1.lastTimestamp }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Load Messages

    func loadMessages(for conversationId: String) async {
        do {
            let dtos = try await apiClient.getMessages(conversationId: conversationId)
            let msgs = dtos.map { $0.toMessage(conversationId: conversationId) }
            messages[conversationId] = msgs.sorted { $0.timestamp < $1.timestamp }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Send Message

    func sendMessage(to address: String, content: String, senderIdentity: Wallet) async throws {
        // 1. Get recipient's public key from chain/API
        let recipientPubKey = try await apiClient.getPublicKey(address: address)

        // 2. Encrypt the message using X25519 + XSalsa20-Poly1305
        let senderSecretKey = try KeychainManager.shared.loadX25519Secret(for: senderIdentity.address)
        let encrypted = try cryptoService.encryptMessage(
            plaintext: content,
            recipientX25519PublicKey: recipientPubKey,
            senderX25519SecretKey: senderSecretKey
        )

        // 3. Build conversation id (sorted addresses joined)
        let conversationId = [senderIdentity.address, address]
            .sorted().joined(separator: ":")

        // 4. Create optimistic local message
        let localMsg = Message(
            fromAddress: senderIdentity.address,
            toAddress: address,
            encryptedContent: encrypted.ciphertext,
            decryptedContent: content,
            status: .sending,
            conversationId: conversationId
        )

        // 5. Append optimistically
        var existing = messages[conversationId] ?? []
        existing.append(localMsg)
        messages[conversationId] = existing

        // 6. Send to API
        let sentMsg = try await apiClient.sendMessage(
            from: senderIdentity.address,
            to: address,
            encryptedContent: encrypted.ciphertext,
            nonce: encrypted.nonce,
            ephemeralPubKey: encrypted.ephemeralPubKey
        )

        // 7. Update status to sent
        if let idx = messages[conversationId]?.firstIndex(where: { $0.id == localMsg.id }) {
            messages[conversationId]?[idx].status = .sent
        }

        // 8. Update conversation list
        let conv = Conversation(
            id: conversationId,
            participant1: senderIdentity.address,
            participant2: address,
            lastMessage: content,
            lastTimestamp: Date(),
            unreadCount: 0
        )
        upsertConversation(conv)

        _ = sentMsg
    }

    // MARK: - Polling

    func startPolling(for address: String) {
        stopPolling()
        pollingAddress = address
        pollingTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                await self.pollForNewMessages(address: address)
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
        pollingAddress = nil
    }

    // MARK: - Mark Read

    func markRead(conversationId: String) async {
        do {
            try await apiClient.markConversationRead(conversationId: conversationId)
            if let idx = conversations.firstIndex(where: { $0.id == conversationId }) {
                conversations[idx].unreadCount = 0
            }
        } catch {
            // Non-critical, swallow
        }
    }

    // MARK: - Private

    private func pollForNewMessages(address: String) async {
        guard let wallet = Wallet.active() else { return }
        do {
            let newDTOs = try await apiClient.pollMessages(for: address)
            for dto in newDTOs {
                await decryptAndStore(dto, identity: wallet)
            }
        } catch {
            // Background polling — don't surface errors
        }
    }

    private func decryptAndStore(_ dto: MessageDTO, identity: Wallet) async {
        let conversationId: String
        if dto.from == identity.address {
            conversationId = [dto.from, dto.to].sorted().joined(separator: ":")
        } else {
            conversationId = [dto.from, dto.to].sorted().joined(separator: ":")
        }

        // Don't re-add duplicates
        if messages[conversationId]?.contains(where: { $0.id == dto.id }) == true {
            return
        }

        var msg = dto.toMessage(conversationId: conversationId)

        // Decrypt if message is incoming
        if dto.to == identity.address {
            do {
                let secretKey = try KeychainManager.shared.loadX25519Secret(for: identity.address)
                let decrypted = try cryptoService.decryptMessage(
                    ciphertext: dto.encryptedContent,
                    nonce: dto.nonce,
                    ephemeralPubKey: "",
                    recipientX25519SecretKey: secretKey
                )
                msg.decryptedContent = decrypted
            } catch {
                msg.decryptedContent = nil // leave encrypted fallback
            }
        }

        var existing = messages[conversationId] ?? []
        existing.append(msg)
        existing.sort { $0.timestamp < $1.timestamp }
        messages[conversationId] = existing

        // Update conversation list
        let conv = Conversation(
            id: conversationId,
            participant1: dto.from,
            participant2: dto.to,
            lastMessage: msg.decryptedContent ?? "🔒",
            lastTimestamp: msg.timestamp,
            unreadCount: dto.to == identity.address ? 1 : 0
        )
        upsertConversation(conv)
    }

    private func upsertConversation(_ conv: Conversation) {
        if let idx = conversations.firstIndex(where: { $0.id == conv.id }) {
            conversations[idx].lastMessage = conv.lastMessage
            conversations[idx].lastTimestamp = conv.lastTimestamp
            if conv.unreadCount > 0 {
                conversations[idx].unreadCount += 1
            }
        } else {
            conversations.append(conv)
        }
        conversations.sort { $0.lastTimestamp > $1.lastTimestamp }
    }
}

// MARK: - API Client Extensions (stubs for missing methods)
// These assume APIClient.shared exposes these methods

private extension APIClient {
    func getConversations() async throws -> [ConversationDTO] {
        try await get(path: "/api/v1/conversations")
    }

    func getMessages(conversationId: String) async throws -> [MessageDTO] {
        try await get(path: "/api/v1/conversations/\(conversationId)/messages")
    }

    func getPublicKey(address: String) async throws -> String {
        struct Resp: Decodable { let x25519Public: String }
        let resp: Resp = try await get(path: "/api/v1/identity/\(address)")
        return resp.x25519Public
    }

    func sendMessage(
        from: String,
        to: String,
        encryptedContent: String,
        nonce: String,
        ephemeralPubKey: String
    ) async throws -> MessageDTO {
        struct Body: Encodable {
            let from, to, encryptedContent, nonce, ephemeralPubKey: String
        }
        return try await post(
            path: "/api/v1/messages",
            body: Body(
                from: from,
                to: to,
                encryptedContent: encryptedContent,
                nonce: nonce,
                ephemeralPubKey: ephemeralPubKey
            )
        )
    }

    func pollMessages(for address: String) async throws -> [MessageDTO] {
        try await get(path: "/api/v1/messages/poll?address=\(address)")
    }

    func markConversationRead(conversationId: String) async throws {
        struct Body: Encodable { let conversationId: String }
        let _: EmptyResponse = try await post(
            path: "/api/v1/conversations/\(conversationId)/read",
            body: EmptyBody()
        )
    }

    struct EmptyBody: Encodable {}
    struct EmptyResponse: Decodable {}

    func get<T: Decodable>(path: String) async throws -> T {
        let url = AppConfig.apiURL(path)
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    func post<Body: Encodable, Response: Decodable>(path: String, body: Body) async throws -> Response {
        var request = URLRequest(url: AppConfig.apiURL(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

// MARK: - KeychainManager Extension

private extension KeychainManager {
    func loadX25519Secret(for address: String) throws -> String {
        // Load the X25519 secret stored at key-gen time
        if let secret = try? load(key: "x25519_secret_\(address)"), let str = String(data: secret, encoding: .utf8) {
            return str
        }
        throw KeychainError.itemNotFound
    }
}

enum KeychainError: Error {
    case itemNotFound
}
