import SwiftUI

struct AIView: View {
    @StateObject private var viewModel = AIViewModel()
    @FocusState private var inputFocused: Bool

    private let examplePrompts = [
        "திருக்குறள் என்ன சொல்கிறது?",
        "What is Sangam literature?",
        "Translate this Tamil text",
        "Tamil grammar help",
        "சங்க இலக்கியம் பற்றி சொல்லுங்கள்",
        "Explain the Tolkappiyam"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Example prompt chips (shown only when no messages)
                if viewModel.messages.isEmpty {
                    examplePromptsSection
                }

                // Messages
                messagesSection

                Divider().background(Color.white.opacity(0.1))

                // Input bar
                inputBar
            }
            .background(Color.tamizhiNavyDark.ignoresSafeArea())
            .navigationTitle("Tamizhi AI / தமிழி AI")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if !viewModel.messages.isEmpty {
                        Button {
                            viewModel.clearHistory()
                        } label: {
                            Label("Clear", systemImage: "trash")
                                .foregroundColor(.white.opacity(0.6))
                                .labelStyle(.iconOnly)
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        viewModel.toggleLanguage()
                    } label: {
                        Text(viewModel.language.label)
                            .font(.subheadline.bold())
                            .foregroundColor(Color.tamizhiNavy)
                            .frame(width: 36, height: 28)
                            .background(Color.tamizhiGold)
                            .cornerRadius(8)
                    }
                }
            }
        }
    }

    // MARK: - Example Prompts

    private var examplePromptsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Hero
            VStack(spacing: 10) {
                Image(systemName: "sparkles")
                    .font(.system(size: 40))
                    .foregroundColor(Color.tamizhiGold)

                Text("தமிழி AI")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)

                Text("Your Tamil language & literature assistant")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.55))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 24)
            .padding(.bottom, 16)

            Text("Try asking:")
                .font(.caption.bold())
                .foregroundColor(.white.opacity(0.5))
                .textCase(.uppercase)
                .tracking(1)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(examplePrompts, id: \.self) { prompt in
                        Button {
                            viewModel.inputText = prompt
                            Task {
                                await viewModel.sendMessage(content: prompt)
                                viewModel.inputText = ""
                            }
                        } label: {
                            Text(prompt)
                                .font(.subheadline)
                                .foregroundColor(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 9)
                                .background(Color.tamizhiNavy)
                                .cornerRadius(20)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color.tamizhiGold.opacity(0.4), lineWidth: 1)
                                )
                        }
                    }
                }
                .padding(.horizontal, 16)
            }

            Spacer(minLength: 16)
        }
    }

    // MARK: - Messages

    private var messagesSection: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(viewModel.messages) { msg in
                        AIMessageBubble(message: msg)
                            .id(msg.id)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .onChange(of: viewModel.messages.count) { _ in
                scrollToBottom(proxy: proxy)
            }
            .onChange(of: viewModel.messages.last?.content) { _ in
                scrollToBottom(proxy: proxy)
            }
            .onAppear {
                scrollToBottom(proxy: proxy)
            }
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField(
                viewModel.language == .english
                ? "Ask about Tamil literature…"
                : "தமிழ் இலக்கியம் பற்றி கேளுங்கள்…",
                text: $viewModel.inputText,
                axis: .vertical
            )
            .lineLimit(1...5)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white.opacity(0.07))
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .foregroundColor(.white)
            .tint(Color.tamizhiGold)
            .focused($inputFocused)

            if viewModel.isLoading {
                Button {
                    viewModel.stopGeneration()
                } label: {
                    Image(systemName: "stop.circle.fill")
                        .font(.system(size: 34))
                        .foregroundColor(Color.red.opacity(0.8))
                }
            } else {
                Button {
                    let content = viewModel.inputText
                    viewModel.inputText = ""
                    Task {
                        await viewModel.sendMessage(content: content)
                    }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 34))
                        .foregroundColor(
                            viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty
                            ? Color.tamizhiGold.opacity(0.35)
                            : Color.tamizhiSaffron
                        )
                }
                .disabled(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Color.tamizhiNavy.ignoresSafeArea(edges: .bottom)
        )
    }

    // MARK: - Helpers

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let lastId = viewModel.messages.last?.id else { return }
        withAnimation(.easeOut(duration: 0.2)) {
            proxy.scrollTo(lastId, anchor: .bottom)
        }
    }
}

// MARK: - AI Message Bubble

private struct AIMessageBubble: View {
    let message: AIMessage

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            if message.isUser {
                Spacer(minLength: 48)
            } else {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.tamizhiSaffron)
                        .frame(width: 32, height: 32)
                    Image(systemName: "sparkles")
                        .font(.system(size: 14))
                        .foregroundColor(Color.tamizhiNavy)
                }
            }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                if message.content.isEmpty && message.isStreaming {
                    TypingIndicatorView()
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color.tamizhiNavy)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                } else {
                    HStack(alignment: .bottom, spacing: 0) {
                        Text(message.content)
                            .font(.body)
                            .foregroundColor(message.isUser ? Color.tamizhiNavy : .white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(message.isUser ? Color.tamizhiSaffron : Color.tamizhiNavy)
                            .clipShape(RoundedRectangle(cornerRadius: 18))

                        if message.isStreaming {
                            // Blinking cursor
                            BlinkingCursor()
                                .padding(.leading, 4)
                                .padding(.bottom, 10)
                        }
                    }
                }

                Text(formattedTime(message.timestamp))
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.35))
                    .padding(.horizontal, 4)
            }

            if !message.isUser {
                Spacer(minLength: 48)
            }
        }
    }

    private func formattedTime(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }
}

// MARK: - Typing Indicator

private struct TypingIndicatorView: View {
    @State private var animate = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(Color.white.opacity(0.6))
                    .frame(width: 7, height: 7)
                    .offset(y: animate ? -4 : 0)
                    .animation(
                        .easeInOut(duration: 0.5)
                            .repeatForever()
                            .delay(Double(i) * 0.18),
                        value: animate
                    )
            }
        }
        .onAppear { animate = true }
    }
}

// MARK: - Blinking Cursor

private struct BlinkingCursor: View {
    @State private var visible = true

    var body: some View {
        Rectangle()
            .fill(Color.tamizhiGold)
            .frame(width: 2, height: 18)
            .opacity(visible ? 1 : 0)
            .animation(.easeInOut(duration: 0.5).repeatForever(), value: visible)
            .onAppear { visible = false }
    }
}

#Preview {
    AIView()
        .preferredColorScheme(.dark)
}
