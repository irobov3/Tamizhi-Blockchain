import SwiftUI

struct WalletView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = WalletViewModel()
    @State private var showSend    = false
    @State private var showReceive = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.tamizhiBackground.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        balanceCard
                        actionButtons
                        transactionSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
                .refreshable { viewModel.refreshBalance() }
            }
            .navigationTitle("பணப்பை")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        viewModel.refreshBalance()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.tamizhiSaffron)
                    }
                }
            }
            .sheet(isPresented: $showSend)    { SendView() }
            .sheet(isPresented: $showReceive) { ReceiveView() }
            .onAppear {
                viewModel.refreshBalance()
            }
        }
        .onAppear {
            viewModel.refreshBalance()
        }
    }

    // MARK: - Balance Card

    private var balanceCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(LinearGradient(
                    colors: [.tamizhiSaffron, .tamizhiGold],
                    startPoint: .topLeading,
                    endPoint:   .bottomTrailing
                ))
                .shadow(color: .tamizhiSaffron.opacity(0.4), radius: 20, y: 8)

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("மொத்த இருப்பு")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                        Text("Total Balance")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                    }
                    Spacer()
                    Image(systemName: "wallet.pass.fill")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.8))
                }

                Text(String(format: "%.4f TMZ", viewModel.balance))
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                if let wallet = appState.currentWallet {
                    HStack {
                        Text(wallet.shortAddress)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))
                            .monospaced()
                        Button {
                            UIPasteboard.general.string = wallet.address
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
            }
            .padding(24)
        }
        .frame(height: 180)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 16) {
            actionButton(icon: "arrow.up.circle.fill",   label: "அனுப்பு\nSend") {
                showSend = true
            }
            actionButton(icon: "arrow.down.circle.fill", label: "பெறு\nReceive") {
                showReceive = true
            }
            actionButton(icon: "qrcode.viewfinder",      label: "ஸ்கேன்\nScan") {
                viewModel.scanQR()
            }
        }
    }

    private func actionButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(Color.tamizhiSurface)
                        .frame(width: 56, height: 56)
                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundColor(.tamizhiSaffron)
                }
                Text(label)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.tamizhiSecondary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Transactions

    private var transactionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("பரிவர்த்தனைகள்")
                    .font(.headline)
                    .foregroundColor(.white)
                Text("Transactions")
                    .font(.caption)
                    .foregroundColor(.tamizhiSecondary)
                Spacer()
            }

            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.tamizhiSaffron)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
            } else if viewModel.transactions.isEmpty {
                emptyTransactions
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(viewModel.transactions) { tx in
                        TransactionRow(transaction: tx, myAddress: appState.currentWallet?.address ?? "")
                    }
                }
            }

            if let error = viewModel.error {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.tamizhiRed)
                    .padding(12)
                    .tamizhiCard(cornerRadius: 10, padding: 0)
            }
        }
    }

    private var emptyTransactions: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundColor(.tamizhiSecondary)
            Text("பரிவர்த்தனைகள் இல்லை")
                .font(.headline)
                .foregroundColor(.tamizhiSecondary)
            Text("No transactions yet")
                .font(.caption)
                .foregroundColor(.tamizhiSecondary.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

// MARK: - Transaction Row

struct TransactionRow: View {
    let transaction: Transaction
    let myAddress:   String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(iconColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: transaction.type.icon)
                    .foregroundColor(iconColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.type.displayName)
                    .font(.subheadline)
                    .foregroundColor(.white)
                Text(transaction.shortHash)
                    .font(.caption)
                    .foregroundColor(.tamizhiSecondary)
                    .monospaced()
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(transaction.formattedAmount)
                    .font(.subheadline.bold())
                    .foregroundColor(transaction.type.isCredit ? .tamizhiGreen : .tamizhiRed)
                Text(transaction.formattedDate)
                    .font(.caption2)
                    .foregroundColor(.tamizhiSecondary)
            }
        }
        .padding(12)
        .background(Color.tamizhiSurface)
        .cornerRadius(12)
    }

    private var iconColor: Color {
        transaction.type.isCredit ? .tamizhiGreen : .tamizhiRed
    }
}

#Preview {
    WalletView()
        .environmentObject(AppState())
}
