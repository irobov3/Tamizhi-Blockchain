import SwiftUI

struct ConversationListView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = MessengerViewModel()
    @State private var showNewConversation = false
    @State private var newAddress = ""
    @State private var selectedConversation: Conversation?
    @State private var navigateToChat = false

    private var myAddress: String { appState.currentWallet?.address ?? "" }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.conversations.isEmpty && !viewModel.isLoading {
                    emptyState
                } else {
                    conversationList
                }
            }
            .navigationTitle("Messenger / தூதுவர்")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showNewConversation = true
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .foregroundColor(.tamizhiGold)
                    }
                }
            }
            .task {
                await viewModel.loadConversations()
                viewModel.startPolling(for: myAddress)
            }
            .onDisappear {
                viewModel.stopPolling()
            }
            .refreshable {
                await viewModel.loadConversations()
            }
            .sheet(isPresented: $showNewConversation) {
                newConversationSheet
            }
            .navigationDestination(item: $selectedConversation) { conv in
                ChatView(conversation: conv)
                    .environmentObject(viewModel)
                    .environmentObject(appState)
            }
        }
    }

    // MARK: - Conversation List

    private var conversationList: some View {
        List {
            ForEach(viewModel.conversations) { conv in
                conversationRow(conv)
                    .listRowBackground(Color.tamizhiNavy.opacity(0.6))
                    .listRowSeparatorTint(Color.white.opacity(0.08))
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedConversation = conv
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            deleteConversation(conv)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
            }
        }
        .listStyle(.plain)
        .background(Color.tamizhiNavyDark)
        .scrollContentBackground(.hidden)
    }

    private func conversationRow(_ conv: Conversation) -> some View {
        HStack(spacing: 12) {
            // Avatar
            let letter = conv.avatarLetter(myAddress: myAddress)
            Circle()
                .fill(Color.tamizhiGold)
                .frame(width: 48, height: 48)
                .overlay(
                    Text(letter)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(Color.tamizhiNavy)
                )

            // Message preview
            VStack(alignment: .leading, spacing: 3) {
                Text(conv.otherParticipant(myAddress: myAddress).truncateAddress(chars: 8))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(conv.lastMessage.isEmpty ? "உரையாடல் தொடங்கியது" : conv.lastMessage)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.55))
                    .lineLimit(1)
                    .truncationMode(.tail)
            }

            Spacer()

            // Timestamp + unread badge
            VStack(alignment: .trailing, spacing: 6) {
                Text(conv.formattedTimestamp)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.4))

                if conv.unreadCount > 0 {
                    Circle()
                        .fill(Color.tamizhiSaffron)
                        .frame(width: 20, height: 20)
                        .overlay(
                            Text("\(conv.unreadCount)")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                        )
                } else {
                    Color.clear.frame(width: 20, height: 20)
                }
            }
        }
        .padding(.vertical, 6)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "lock.shield")
                .font(.system(size: 64))
                .foregroundColor(Color.tamizhiGold.opacity(0.6))

            Text("உரையாடல் இல்லை")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.white)

            Text("Start a new encrypted conversation\nதாழ்த்த குறியாக்கப்பட்ட உரையாடலை தொடங்குங்கள்")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.55))
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Button {
                showNewConversation = true
            } label: {
                Label("New Conversation", systemImage: "plus")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(Color.tamizhiNavy)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.tamizhiGold)
                    .clipShape(Capsule())
            }
            .padding(.top, 8)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .background(Color.tamizhiNavyDark)
    }

    // MARK: - New Conversation Sheet

    private var newConversationSheet: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Recipient Address")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                        .textCase(.uppercase)
                        .tracking(1)

                    TextField("cosmos1...", text: $newAddress)
                        .font(.system(.body, design: .monospaced))
                        .padding(12)
                        .background(Color.white.opacity(0.07))
                        .cornerRadius(10)
                        .foregroundColor(.white)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }

                Button {
                    startNewConversation()
                } label: {
                    Text("Start Chat / உரையாடல் தொடங்கு")
                        .font(.headline)
                        .foregroundColor(Color.tamizhiNavy)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            newAddress.count > 10
                            ? Color.tamizhiGold
                            : Color.tamizhiGold.opacity(0.4)
                        )
                        .cornerRadius(12)
                }
                .disabled(newAddress.count <= 10)

                Spacer()
            }
            .padding(24)
            .background(Color.tamizhiNavyDark.ignoresSafeArea())
            .navigationTitle("New Conversation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showNewConversation = false }
                        .foregroundColor(Color.tamizhiGold)
                }
            }
        }
    }

    // MARK: - Actions

    private func startNewConversation() {
        let trimmed = newAddress.trimmingCharacters(in: .whitespaces)
        guard trimmed.count > 10 else { return }

        let conversationId = [myAddress, trimmed].sorted().joined(separator: ":")
        let conv = Conversation(
            id: conversationId,
            participant1: myAddress,
            participant2: trimmed
        )
        viewModel.conversations.insert(conv, at: 0)
        showNewConversation = false
        newAddress = ""
        selectedConversation = conv
    }

    private func deleteConversation(_ conv: Conversation) {
        viewModel.conversations.removeAll { $0.id == conv.id }
        viewModel.messages.removeValue(forKey: conv.id)
    }
}

#Preview {
    ConversationListView()
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
