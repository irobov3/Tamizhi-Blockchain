import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedTab: Tab = .wallet

    enum Tab: Int, CaseIterable {
        case wallet, messenger, literature, ai

        var title: String {
            switch self {
            case .wallet:     return "பணப்பை"
            case .messenger:  return "செய்தி"
            case .literature: return "இலக்கியம்"
            case .ai:         return "AI"
            }
        }

        var icon: String {
            switch self {
            case .wallet:     return "wallet.pass.fill"
            case .messenger:  return "bubble.left.and.bubble.right.fill"
            case .literature: return "books.vertical.fill"
            case .ai:         return "sparkles"
            }
        }
    }

    var body: some View {
        Group {
            if appState.hasCompletedOnboarding && appState.isAuthenticated {
                mainTabView
            } else {
                OnboardingView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.hasCompletedOnboarding)
    }

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            WalletView()
                .tabItem {
                    Label(Tab.wallet.title, systemImage: Tab.wallet.icon)
                }
                .tag(Tab.wallet)

            ConversationListView()
                .tabItem {
                    Label(Tab.messenger.title, systemImage: Tab.messenger.icon)
                }
                .tag(Tab.messenger)

            LiteratureView()
                .tabItem {
                    Label(Tab.literature.title, systemImage: Tab.literature.icon)
                }
                .tag(Tab.literature)

            AIView()
                .tabItem {
                    Label(Tab.ai.title, systemImage: Tab.ai.icon)
                }
                .tag(Tab.ai)
        }
        .tint(.tamizhiSaffron)
        .background(Color.tamizhiBackground)
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
