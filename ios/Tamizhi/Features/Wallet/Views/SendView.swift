import SwiftUI
import LocalAuthentication

struct SendView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = WalletViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var recipientAddress = ""
    @State private var amountText       = ""
    @State private var memo             = ""
    @State private var useUTMZ          = false
    @State private var showConfirm      = false
    @State private var biometricError   = ""
    @State private var showBiometricErr = false

    private var amount: Double {
        let raw = Double(amountText) ?? 0
        return useUTMZ ? raw / 1_000_000 : raw
    }

    private var estimatedGas: Double {
        viewModel.estimateGas(amount: amount)
    }

    private var isFormValid: Bool {
        recipientAddress.isValidTamizhiAddress && amount > 0 && amount <= appState.currentWallet?.balance ?? 0
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.tamizhiBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        recipientField
                        amountField
                        memoField
                        gasEstimate
                        sendButton
                    }
                    .padding(16)
                }
            }
            .navigationTitle("அனுப்பு · Send")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("ரத்து") { dismiss() }
                        .foregroundColor(.tamizhiSaffron)
                }
            }
            .alert("பிழை", isPresented: $showBiometricErr) {
                Button("சரி", role: .cancel) {}
            } message: {
                Text(biometricError)
            }
            .alert("வெற்றி!", isPresented: $viewModel.sendSuccess) {
                Button("சரி") { dismiss() }
            } message: {
                Text("தொகை வெற்றிகரமாக அனுப்பப்பட்டது")
            }
        }
    }

    // MARK: - Subviews

    private var recipientField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("பெறுநர் முகவரி", systemImage: "person.fill")
                .font(.subheadline)
                .foregroundColor(.tamizhiSecondary)

            TextField("tamizhi1…", text: $recipientAddress)
                .textFieldStyle(TamizhiTextFieldStyle())
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .monospaced()

            if !recipientAddress.isEmpty && !recipientAddress.isValidTamizhiAddress {
                Text("தவறான முகவரி வடிவம்")
                    .font(.caption)
                    .foregroundColor(.tamizhiRed)
            }
        }
    }

    private var amountField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("தொகை", systemImage: "dollarsign.circle.fill")
                    .font(.subheadline)
                    .foregroundColor(.tamizhiSecondary)
                Spacer()
                Picker("Unit", selection: $useUTMZ) {
                    Text("TMZ").tag(false)
                    Text("uTMZ").tag(true)
                }
                .pickerStyle(.segmented)
                .frame(width: 120)
            }

            HStack {
                TextField("0.000000", text: $amountText)
                    .textFieldStyle(TamizhiTextFieldStyle())
                    .keyboardType(.decimalPad)

                Button("அதிகபட்சம்") {
                    let max = appState.currentWallet?.balance ?? 0
                    amountText = String(format: "%.6f", max - estimatedGas)
                }
                .font(.caption)
                .foregroundColor(.tamizhiSaffron)
            }

            if let balance = appState.currentWallet?.balance {
                Text("இருப்பு: \(String(format: "%.4f", balance)) TMZ")
                    .font(.caption)
                    .foregroundColor(.tamizhiSecondary)
            }
        }
    }

    private var memoField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("குறிப்பு (விருப்பத்தேர்வு)", systemImage: "text.bubble.fill")
                .font(.subheadline)
                .foregroundColor(.tamizhiSecondary)

            TextField("மெமோ…", text: $memo)
                .textFieldStyle(TamizhiTextFieldStyle())
        }
    }

    private var gasEstimate: some View {
        HStack {
            Image(systemName: "flame.fill")
                .foregroundColor(.tamizhiGold)
            Text("கட்டண மதிப்பீடு")
                .font(.subheadline)
                .foregroundColor(.tamizhiSecondary)
            Spacer()
            Text(String(format: "~%.4f TMZ", estimatedGas))
                .font(.subheadline.monospacedDigit())
                .foregroundColor(.tamizhiGold)
        }
        .padding(12)
        .tamizhiCard(cornerRadius: 12, padding: 0)
        .padding(.horizontal, 0)
    }

    private var sendButton: some View {
        Button {
            authenticateAndSend()
        } label: {
            if viewModel.isSending {
                HStack {
                    ProgressView()
                        .tint(.white)
                    Text("அனுப்புகிறது…")
                }
            } else {
                Text("அனுப்பு · Send \(String(format: "%.4f", amount)) TMZ")
            }
        }
        .buttonStyle(.tamizhiPrimary)
        .disabled(!isFormValid || viewModel.isSending)
        .padding(.top, 8)
    }

    // MARK: - Biometric Auth

    private func authenticateAndSend() {
        let context = LAContext()
        var authError: NSError?

        let reason = "\(String(format: "%.4f", amount)) TMZ அனுப்புவதை உறுதிப்படுத்தவும்"

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                DispatchQueue.main.async {
                    if success {
                        viewModel.sendTokens(to: recipientAddress, amount: amount, memo: memo)
                    } else {
                        biometricError   = error?.localizedDescription ?? "அங்கீகாரம் தோல்வி"
                        showBiometricErr = true
                    }
                }
            }
        } else {
            // Fallback: passcode auth
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
                DispatchQueue.main.async {
                    if success {
                        viewModel.sendTokens(to: recipientAddress, amount: amount, memo: memo)
                    } else {
                        biometricError   = error?.localizedDescription ?? "அங்கீகாரம் தோல்வி"
                        showBiometricErr = true
                    }
                }
            }
        }
    }
}

// MARK: - Custom TextField Style

struct TamizhiTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(12)
            .background(Color.tamizhiNavy)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.tamizhiBorder, lineWidth: 1)
            )
            .foregroundColor(.white)
    }
}

#Preview {
    SendView().environmentObject(AppState())
}
