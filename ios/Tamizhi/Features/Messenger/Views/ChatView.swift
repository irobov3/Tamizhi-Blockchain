import SwiftUI

struct ChatView: View {
    let conversation: Conversation

    @EnvironmentObject private var viewModel: MessengerViewModel
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var inputText = ""
    @State private var isSending = false
    @FocusState private var inputFocused: Bool

    private var myAddress: String { appState.currentWallet?.address ?? "" }
    private var peerAddress: String { conversation.otherParticipant(myAddress: myAddress) }
    private var conversationMessages: [Message] {
        viewModel.messages[conversation.id] ?? []
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages scroll area
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(conversationMessages) { msg in
                            MessageBubbleView(
                                message: msg,
                                isSent: msg.isSent(by: myAddress)
                            )
                            .id(msg.id)
                        }

                        if !viewModel.typingAddresses.isEmpty {
                            typingIndicator
                                .id("typing")
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 8)
                }
                .background(Color.tamizhiNavyDark)
                .onAppear {
                    scrollToBottom(proxy: proxy, animated: false)
                }
                .onChange(of: conversationMessages.count) { _ in
                    scrollToBottom(proxy: proxy, animated: true)
                }
                .onChange(of: viewModel.typingAddresses) { _ in
                    if !viewModel.typingAddresses.isEmpty {
                        withAnimation {
                            proxy.scrollTo("typing", anchor: .bottom)
                        }
                    }
                }
            }

            Divider().background(Color.white.opacity(0.1))
        }
        .safeAreaInset(edge: .bottom) {
            inputBar
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(peerAddress.truncateAddress(chars: 8))
                        .font(.headline)
                        .foregroundColor(.white)

                    HStack(spacing: 4) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 9))
                            .foregroundColor(Color.green)
                        Text("E2E மறைகுறியாக்கப்பட்டது")
                            .font(.system(size: 10))
                            .foregroundColor(Color.green)
                    }
                }
            }
        }
        .task {
            await viewModel.loadMessages(for: conversation.id)
            await viewModel.markRead(conversationId: conversation.id)
        }
    }

    // MARK: - Typing Indicator

    private var typingIndicator: some View {
        HStack(alignment: .bottom, spacing: 8) {
            Circle()
                .fill(Color.tamizhiGold)
                .frame(width: 28, height: 28)
                .overlay(
                    Text(String(peerAddress.prefix(1)).uppercased())
                        .font(.caption.bold())
                        .foregroundColor(Color.tamizhiNavy)
                )

            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    AnimatedDot(delay: Double(i) * 0.2)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.tamizhiNavy)
            .clipShape(RoundedRectangle(cornerRadius: 18))

            Spacer()
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField("Message / செய்தி…", text: $inputText, axis: .vertical)
                .lineLimit(1...5)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .foregroundColor(.white)
                .tint(Color.tamizhiGold)
                .focused($inputFocused)
                .onSubmit {
                    sendMessage()
                }

            Button {
                sendMessage()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 34))
                    .foregroundColor(
                        inputText.trimmingCharacters(in: .whitespaces).isEmpty || isSending
                        ? Color.tamizhiGold.opacity(0.35)
                        : Color.tamizhiSaffron
                    )
            }
            .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Color.tamizhiNavy
                .ignoresSafeArea(edges: .bottom)
        )
    }

    // MARK: - Actions

    private func sendMessage() {
        let trimmed = inputText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !isSending else { return }
        guard let wallet = appState.currentWallet else { return }

        inputText = ""
        isSending = true

        Task {
            defer { isSending = false }
            do {
                try await viewModel.sendMessage(
                    to: peerAddress,
                    content: trimmed,
                    senderIdentity: wallet
                )
            } catch {
                viewModel.error = error.localizedDescription
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy, animated: Bool) {
        guard let lastId = conversationMessages.last?.id else { return }
        if animated {
            withAnimation(.easeOut(duration: 0.25)) {
                proxy.scrollTo(lastId, anchor: .bottom)
            }
        } else {
            proxy.scrollTo(lastId, anchor: .bottom)
        }
    }
}

// MARK: - Message Bubble View

struct MessageBubbleView: View {
    let message: Message
    let isSent: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isSent { Spacer(minLength: 48) }

            VStack(alignment: isSent ? .trailing : .leading, spacing: 4) {
                Text(message.displayContent)
                    .font(.body)
                    .foregroundColor(isSent ? Color.tamizhiNavy : .white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isSent ? Color.tamizhiSaffron : Color.tamizhiNavy)
                    .clipShape(
                        RoundedRectangle(
                            cornerRadius: isSent ? 16 : 16
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                isSent ? Color.clear : Color.white.opacity(0.08),
                                lineWidth: 1
                            )
                    )

                HStack(spacing: 4) {
                    Text(message.formattedTimestamp)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.4))

                    if isSent {
                        statusIcon
                    }
                }
                .padding(.horizontal, 4)
            }

            if !isSent { Spacer(minLength: 48) }
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch message.status {
        case .sending:
            Image(systemName: "clock")
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.4))
        case .sent:
            Image(systemName: "checkmark")
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.6))
        case .delivered:
            Image(systemName: "checkmark.circle")
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.6))
        case .read:
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 10))
                .foregroundColor(Color.blue)
        case .failed:
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 10))
                .foregroundColor(.red)
        }
    }
}

// MARK: - Animated Dot

private struct AnimatedDot: View {
    let delay: Double
    @State private var isAnimating = false

    var body: some View {
        Circle()
            .fill(Color.white.opacity(0.6))
            .frame(width: 7, height: 7)
            .offset(y: isAnimating ? -4 : 0)
            .animation(
                .easeInOut(duration: 0.5)
                    .repeatForever()
                    .delay(delay),
                value: isAnimating
            )
            .onAppear { isAnimating = true }
    }
}

#Preview {
    NavigationStack {
        ChatView(
            conversation: Conversation(
                participant1: "cosmos1abc",
                participant2: "cosmos1xyz",
                lastMessage: "வணக்கம்!",
                lastTimestamp: Date()
            )
        )
    }
    .environmentObject(MessengerViewModel())
    .environmentObject(AppState())
    .preferredColorScheme(.dark)
}
