import SwiftUI
import Combine

// MARK: - AI Message Model

struct AIMessage: Identifiable, Equatable {
    let id: String
    let role: Role
    var content: String
    let timestamp: Date
    var isStreaming: Bool

    enum Role { case user, assistant }

    init(
        id: String = UUID().uuidString,
        role: Role,
        content: String,
        timestamp: Date = Date(),
        isStreaming: Bool = false
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
        self.isStreaming = isStreaming
    }

    var isUser: Bool { role == .user }
}

// MARK: - AIViewModel

@MainActor
class AIViewModel: ObservableObject {
    @Published var messages: [AIMessage] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var language: Language = .english
    @Published var inputText: String = ""

    enum Language: String {
        case english = "en"
        case tamil = "ta"

        var label: String {
            switch self {
            case .english: return "EN"
            case .tamil: return "த"
            }
        }

        var systemPrompt: String {
            switch self {
            case .english:
                return "You are Tamizhi AI, an expert assistant specialising in Tamil literature, history, language, and culture. Answer in English unless asked otherwise."
            case .tamil:
                return "நீங்கள் தமிழி AI, தமிழ் இலக்கியம், வரலாறு, மொழி மற்றும் கலாச்சாரத்தில் நிபுணர். தமிழில் பதில் சொல்லுங்கள்."
            }
        }
    }

    private let apiClient = APIClient.shared
    private var streamingTask: Task<Void, Never>?

    // MARK: - Send Message

    func sendMessage(content: String) async {
        let trimmed = content.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        // Append user message
        let userMsg = AIMessage(role: .user, content: trimmed)
        messages.append(userMsg)

        // Start assistant streaming placeholder
        let assistantMsg = AIMessage(role: .assistant, content: "", isStreaming: true)
        messages.append(assistantMsg)
        let assistantId = assistantMsg.id

        isLoading = true
        error = nil

        streamingTask = Task { [weak self] in
            guard let self else { return }
            do {
                let history = self.messages
                    .filter { !$0.isStreaming }
                    .dropLast() // exclude the empty assistant placeholder
                    .map { ["role": $0.isUser ? "user" : "assistant", "content": $0.content] }

                let stream = try await self.apiClient.streamAIResponse(
                    userMessage: trimmed,
                    history: Array(history),
                    systemPrompt: self.language.systemPrompt,
                    language: self.language.rawValue
                )

                var accumulated = ""
                for try await chunk in stream {
                    accumulated += chunk
                    if let idx = self.messages.firstIndex(where: { $0.id == assistantId }) {
                        self.messages[idx].content = accumulated
                    }
                }

                // Mark streaming done
                if let idx = self.messages.firstIndex(where: { $0.id == assistantId }) {
                    self.messages[idx].isStreaming = false
                }
            } catch {
                if let idx = self.messages.firstIndex(where: { $0.id == assistantId }) {
                    self.messages[idx].content = "Error: \(error.localizedDescription)"
                    self.messages[idx].isStreaming = false
                }
                self.error = error.localizedDescription
            }
            self.isLoading = false
        }

        await streamingTask?.value
    }

    // MARK: - Clear History

    func clearHistory() {
        streamingTask?.cancel()
        streamingTask = nil
        messages = []
        error = nil
        isLoading = false
    }

    // MARK: - Toggle Language

    func toggleLanguage() {
        language = language == .english ? .tamil : .english
    }

    // MARK: - Stop Generation

    func stopGeneration() {
        streamingTask?.cancel()
        streamingTask = nil
        // Mark last message as done streaming
        if let idx = messages.lastIndex(where: { $0.isStreaming }) {
            messages[idx].isStreaming = false
        }
        isLoading = false
    }
}

// MARK: - APIClient stream extension

extension APIClient {
    /// Streams AI response chunks via SSE.
    func streamAIResponse(
        userMessage: String,
        history: [[String: String]],
        systemPrompt: String,
        language: String
    ) async throws -> AsyncThrowingStream<String, Error> {
        struct Body: Encodable {
            let message: String
            let history: [[String: String]]
            let systemPrompt: String
            let language: String
            let stream: Bool
        }

        var request = URLRequest(url: AppConfig.apiURL("/api/v1/ai/chat"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONEncoder().encode(
            Body(message: userMessage, history: history, systemPrompt: systemPrompt, language: language, stream: true)
        )

        return AsyncThrowingStream { continuation in
            Task {
                do {
                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
                        continuation.finish(throwing: URLError(.badServerResponse))
                        return
                    }

                    for try await line in bytes.lines {
                        if line.hasPrefix("data: ") {
                            let data = String(line.dropFirst(6))
                            if data == "[DONE]" { break }
                            // Parse SSE JSON chunk
                            if let jsonData = data.data(using: .utf8),
                               let obj = try? JSONDecoder().decode(SSEChunk.self, from: jsonData) {
                                continuation.yield(obj.delta)
                            }
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    private struct SSEChunk: Decodable {
        let delta: String
    }

    func getBalance(address: String) async throws -> String {
        struct Resp: Decodable {
            let amount: String
            let denom: String
        }
        let resp: Resp = try await {
            let url = AppConfig.chainLCDURL("/cosmos/bank/v1beta1/balances/\(address)")
            let (data, _) = try await URLSession.shared.data(from: url)
            return try JSONDecoder().decode(Resp.self, from: data)
        }()
        return resp.amount
    }
}
