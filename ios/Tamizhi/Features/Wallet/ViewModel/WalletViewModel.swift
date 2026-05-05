import SwiftUI
import Combine

@MainActor
final class WalletViewModel: ObservableObject {
    // MARK: - Published State

    @Published var balance: Double = 0
    @Published var transactions: [Transaction] = []
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var isSending: Bool = false
    @Published var sendSuccess: Bool = false
    @Published var showQRScanner: Bool = false
    @Published var scannedAddress: String = ""

    // MARK: - Dependencies

    private let chainClient: ChainClient
    private let apiClient: APIClient
    private var cancellables = Set<AnyCancellable>()
    private weak var appState: AppState?

    // MARK: - Init

    init(chainClient: ChainClient = .shared, apiClient: APIClient = .shared, appState: AppState? = nil) {
        self.chainClient = chainClient
        self.apiClient   = apiClient
        self.appState    = appState
    }

    // MARK: - Public Actions

    func refreshBalance() {
        guard let address = appState?.currentWallet?.address else { return }
        isLoading = true
        error     = nil

        Task {
            defer { isLoading = false }
            do {
                let tmz = try await chainClient.getTMZBalance(address: address)
                balance = tmz
                appState?.updateBalance(tmz)
                await loadTransactions(address: address)
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    func sendTokens(to recipient: String, amount: Double, memo: String = "") {
        guard let wallet = appState?.currentWallet else {
            error = "No active wallet"
            return
        }
        guard recipient.isValidTamizhiAddress else {
            error = "தவறான முகவரி"
            return
        }
        guard amount > 0, amount <= balance else {
            error = "தவறான தொகை"
            return
        }

        isSending   = true
        sendSuccess = false
        error       = nil

        Task {
            defer { isSending = false }
            do {
                let signedTx = try buildSignedSendTx(
                    from:   wallet,
                    to:     recipient,
                    amount: amount,
                    memo:   memo
                )
                let txResp = try await chainClient.broadcastTx(signedTxData: signedTx)
                sendSuccess = true

                // Optimistic update
                let tx = Transaction(
                    id:          txResp.txhash,
                    type:        .send,
                    fromAddress: wallet.address,
                    toAddress:   recipient,
                    amount:      amount,
                    memo:        memo,
                    status:      .confirmed
                )
                transactions.insert(tx, at: 0)
                balance -= amount

            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    func scanQR() {
        showQRScanner = true
    }

    func estimateGas(amount: Double) -> Double {
        // Simple estimation: base fee + 0.5% of amount, minimum 0.001 TMZ
        max(0.001, amount * 0.005)
    }

    // MARK: - Private

    private func loadTransactions(address: String) async {
        do {
            let chainTxs = try await chainClient.getTransactions(address: address)
            transactions = chainTxs.compactMap { chainTx -> Transaction? in
                guard let height = Int64(chainTx.height) else { return nil }
                let date = ISO8601DateFormatter().date(from: chainTx.timestamp) ?? Date()
                return Transaction(
                    id:          chainTx.txhash,
                    type:        .receive,
                    fromAddress: "",
                    toAddress:   address,
                    amount:      0,
                    timestamp:   date,
                    blockHeight: height,
                    status:      chainTx.code == 0 ? .confirmed : .failed
                )
            }
        } catch {
            // Non-fatal: balance already refreshed
            print("Transaction load error: \(error)")
        }
    }

    private func buildSignedSendTx(from wallet: Wallet, to recipient: String, amount: Double, memo: String) throws -> Data {
        // In production: build Cosmos SDK MsgSend, sign with Ed25519, encode as Protobuf
        // Here we construct a minimal JSON payload that the backend can relay
        let utmz = Int64(amount * 1_000_000)
        let payload: [String: Any] = [
            "type":   "cosmos-sdk/MsgSend",
            "value":  [
                "from_address": wallet.address,
                "to_address":   recipient,
                "amount":       [["denom": "utmz", "amount": "\(utmz)"]]
            ],
            "memo":   memo
        ]
        return try JSONSerialization.data(withJSONObject: payload)
    }
}
