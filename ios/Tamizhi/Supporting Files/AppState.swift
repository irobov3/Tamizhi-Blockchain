import SwiftUI
import Combine

@MainActor
class AppState: ObservableObject {
    @Published var currentWallet: Wallet?
    @Published var isAuthenticated: Bool = false
    @Published var authToken: String?
    @Published var hasCompletedOnboarding: Bool
    @Published var selectedLanguage: AppLanguage = .english

    enum AppLanguage {
        case english, tamil

        var displayName: String {
            switch self {
            case .english: return "English"
            case .tamil:   return "தமிழ்"
            }
        }

        var code: String {
            switch self {
            case .english: return "en"
            case .tamil:   return "ta"
            }
        }
    }

    private let keychainManager = KeychainManager.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        self.hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "onboarding_complete")
        loadWalletFromKeychain()

        // Persist language preference
        if let langCode = UserDefaults.standard.string(forKey: "app_language") {
            selectedLanguage = langCode == "ta" ? .tamil : .english
        }
    }

    // MARK: - Sign In

    func signIn(mnemonic: String) async throws {
        // Derive wallet from mnemonic via CryptoService
        let cryptoService = CryptoService()
        let walletData = try await cryptoService.generateWallet(mnemonic: mnemonic)

        var wallet = Wallet(
            address: walletData.address,
            publicKey: walletData.publicKey,
            x25519PublicKey: walletData.x25519PublicKey
        )

        // Persist mnemonic securely in Keychain
        try keychainManager.saveMnemonic(mnemonic, for: wallet.address)

        // Save wallet to UserDefaults (without sensitive data)
        var all = Wallet.loadAll()
        // Mark all inactive
        for i in all.indices { all[i].isActive = false }
        wallet.isActive = true
        // Replace if already exists
        if let idx = all.firstIndex(where: { $0.address == wallet.address }) {
            all[idx] = wallet
        } else {
            all.append(wallet)
        }
        Wallet.saveAll(all)

        currentWallet = wallet
        isAuthenticated = true

        // Fetch initial balance
        if let balanceStr = try? await fetchBalance(address: wallet.address) {
            updateBalance(balanceStr)
        }
    }

    // MARK: - Sign Out

    func signOut() {
        isAuthenticated = false
        authToken = nil
        currentWallet = nil

        // Mark all wallets inactive in UserDefaults
        var all = Wallet.loadAll()
        for i in all.indices { all[i].isActive = false }
        Wallet.saveAll(all)
    }

    // MARK: - Update Balance

    func updateBalance(_ balance: String) {
        guard var wallet = currentWallet else { return }
        let numeric = Double(balance
            .replacingOccurrences(of: " TMZ", with: "")
            .replacingOccurrences(of: ",", with: "")) ?? 0
        wallet.balance = numeric
        currentWallet = wallet

        // Persist updated balance
        var all = Wallet.loadAll()
        if let idx = all.firstIndex(where: { $0.address == wallet.address }) {
            all[idx] = wallet
        }
        Wallet.saveAll(all)
    }

    // MARK: - Complete Onboarding

    func completeOnboarding() {
        hasCompletedOnboarding = true
        UserDefaults.standard.set(true, forKey: "onboarding_complete")
    }

    // MARK: - Language

    func toggleLanguage() {
        selectedLanguage = selectedLanguage == .english ? .tamil : .english
        UserDefaults.standard.set(selectedLanguage.code, forKey: "app_language")
    }

    // MARK: - Private Helpers

    private func loadWalletFromKeychain() {
        guard let wallet = Wallet.active() else { return }
        // Validate keychain still has mnemonic
        if (try? keychainManager.loadMnemonic(for: wallet.address)) != nil {
            currentWallet = wallet
            isAuthenticated = true
        }
    }

    private func fetchBalance(address: String) async throws -> String {
        let apiClient = APIClient.shared
        let balance = try await apiClient.getBalance(address: address)
        return balance
    }
}
