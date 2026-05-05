import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showCreate = false
    @State private var showImport = false

    var body: some View {
        ZStack {
            Color.tamizhiBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()
                logoSection
                Spacer()
                taglineSection
                Spacer()
                buttonSection
                    .padding(.bottom, 48)
            }
            .padding(.horizontal, 32)
        }
        .sheet(isPresented: $showCreate) { CreateWalletView() }
        .sheet(isPresented: $showImport) { ImportWalletView() }
    }

    // MARK: - Logo

    private var logoSection: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.tamizhiSaffron, .tamizhiGold],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                    .glowEffect(color: .tamizhiSaffron, radius: 24)

                Text("த")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundColor(.white)
            }

            Text("தமிழி")
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text("TAMIZHI")
                .font(.system(size: 16, weight: .semibold))
                .tracking(6)
                .foregroundColor(.tamizhiGold)
        }
    }

    // MARK: - Tagline

    private var taglineSection: some View {
        VStack(spacing: 8) {
            Text("தனிமையும் தமிழும் ஒன்றே")
                .font(.title3.bold())
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text("Tamil-first private messenger & blockchain wallet")
                .font(.subheadline)
                .foregroundColor(.tamizhiSecondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 20) {
                featurePill(icon: "lock.shield.fill",    text: "E2E குறியாக்கம்")
                featurePill(icon: "books.vertical.fill", text: "இலக்கியம்")
                featurePill(icon: "sparkles",            text: "AI")
            }
            .padding(.top, 8)
        }
    }

    private func featurePill(icon: String, text: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundColor(.tamizhiGold)
            Text(text)
                .font(.caption2)
                .foregroundColor(.tamizhiSecondary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.tamizhiSurface)
        .cornerRadius(20)
    }

    // MARK: - Buttons

    private var buttonSection: some View {
        VStack(spacing: 14) {
            Button { showCreate = true } label: {
                Label("புதிய பணப்பை உருவாக்கு", systemImage: "plus.circle.fill")
            }
            .buttonStyle(.tamizhiPrimary)

            Button { showImport = true } label: {
                Label("ஏற்கனவே இருக்கிறது · Import", systemImage: "square.and.arrow.down")
            }
            .buttonStyle(.tamizhiSecondary)

            Text("உங்கள் திறவுகோல் உங்களிடமே")
                .font(.caption2)
                .foregroundColor(.tamizhiSecondary)
        }
    }
}

// MARK: - Create Wallet View

struct CreateWalletView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var mnemonic: [String] = []
    @State private var walletLabel = "My Wallet"
    @State private var confirmed   = false
    @State private var isCreating  = false
    @State private var errorMsg    = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.tamizhiBackground.ignoresSafeArea()

                VStack(spacing: 24) {
                    if mnemonic.isEmpty {
                        generateSection
                    } else {
                        mnemonicGrid
                        confirmSection
                    }
                }
                .padding(16)
            }
            .navigationTitle("புதிய பணப்பை")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("ரத்து") { dismiss() }
                        .foregroundColor(.tamizhiSaffron)
                }
            }
        }
        .onAppear { generateMnemonic() }
    }

    private var generateSection: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(.tamizhiSaffron)
            Text("திறவுகோல் உருவாக்குகிறோம்…")
                .foregroundColor(.tamizhiSecondary)
        }
    }

    private var mnemonicGrid: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("உங்கள் மறை சொற்றொடர்")
                    .font(.headline)
                    .foregroundColor(.white)
                Text("இதை பாதுகாப்பாக சேமிக்கவும். யாரிடமும் பகிர வேண்டாம்.")
                    .font(.caption)
                    .foregroundColor(.tamizhiRed)
            }

            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3),
                spacing: 8
            ) {
                ForEach(Array(mnemonic.enumerated()), id: \.offset) { index, word in
                    HStack(spacing: 4) {
                        Text("\(index + 1).")
                            .font(.caption2)
                            .foregroundColor(.tamizhiSecondary)
                            .frame(width: 20, alignment: .trailing)
                        Text(word)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundColor(.tamizhiGold)
                            .minimumScaleFactor(0.8)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color.tamizhiNavy)
                    .cornerRadius(8)
                }
            }

            TextField("பணப்பை பெயர்", text: $walletLabel)
                .textFieldStyle(TamizhiTextFieldStyle())
        }
    }

    private var confirmSection: some View {
        VStack(spacing: 12) {
            Toggle(isOn: $confirmed) {
                Text("மறை சொற்றொடரை நான் சேமித்துவிட்டேன்")
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
            .tint(.tamizhiSaffron)

            if !errorMsg.isEmpty {
                Text(errorMsg)
                    .font(.caption)
                    .foregroundColor(.tamizhiRed)
            }

            Button {
                createWallet()
            } label: {
                if isCreating {
                    ProgressView().tint(.white)
                } else {
                    Text("பணப்பை உருவாக்கு")
                }
            }
            .buttonStyle(.tamizhiPrimary)
            .disabled(!confirmed || isCreating)
        }
    }

    private func generateMnemonic() {
        // BIP-39 word list subset — in production load full 2048-word list
        let words = [
            "abandon","ability","able","about","above","absent","absorb","abstract",
            "absurd","abuse","access","accident","account","accuse","achieve","acid",
            "acoustic","acquire","across","act","action","actor","actress","actual",
            "adapt","add","addict","address","adjust","admit","adult","advance","advice",
            "aerobic","afford","afraid","again","age","agent","agree","ahead","aim","air",
            "airport","aisle","alarm","album","alcohol","alert","alien","all","alley",
            "allow","almost","alone","alpha","already","also","alter","always","amateur",
            "amazing","among","amount","amused","analyst","anchor","ancient","anger","angle"
        ]
        mnemonic = (0..<12).map { _ in words.randomElement()! }
    }

    private func createWallet() {
        isCreating = true
        errorMsg   = ""

        Task { @MainActor in
            defer { isCreating = false }
            do {
                let phrase = mnemonic.joined(separator: " ")
                try await appState.signIn(mnemonic: phrase, label: walletLabel)
                dismiss()
            } catch {
                errorMsg = error.localizedDescription
            }
        }
    }
}

// MARK: - Import Wallet View

struct ImportWalletView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var mnemonicInput = ""
    @State private var walletLabel   = "Imported Wallet"
    @State private var isImporting   = false
    @State private var errorMsg      = ""
    @FocusState private var isFocused: Bool

    private var isValid: Bool {
        mnemonicInput.isMnemonic
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.tamizhiBackground.ignoresSafeArea()

                VStack(spacing: 24) {
                    header
                    mnemonicField
                    labelField
                    errorText
                    importButton
                    Spacer()
                }
                .padding(16)
            }
            .navigationTitle("ஏற்றுமதி · Import")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("ரத்து") { dismiss() }
                        .foregroundColor(.tamizhiSaffron)
                }
            }
        }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Image(systemName: "key.fill")
                .font(.largeTitle)
                .foregroundColor(.tamizhiGold)
            Text("உங்கள் மறை சொற்றொடரை உள்ளிடவும்")
                .font(.headline)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            Text("12 or 24 words separated by spaces")
                .font(.caption)
                .foregroundColor(.tamizhiSecondary)
        }
    }

    private var mnemonicField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("மறை சொற்றொடர்")
                .font(.subheadline)
                .foregroundColor(.tamizhiSecondary)

            SecureField("சொல்1 சொல்2 சொல்3 …", text: $mnemonicInput)
                .textFieldStyle(TamizhiTextFieldStyle())
                .focused($isFocused)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .frame(minHeight: 60)
        }
    }

    private var labelField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("பணப்பை பெயர்")
                .font(.subheadline)
                .foregroundColor(.tamizhiSecondary)
            TextField("Imported Wallet", text: $walletLabel)
                .textFieldStyle(TamizhiTextFieldStyle())
        }
    }

    private var errorText: some View {
        Group {
            if !errorMsg.isEmpty {
                Text(errorMsg)
                    .font(.caption)
                    .foregroundColor(.tamizhiRed)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var importButton: some View {
        Button {
            importWallet()
        } label: {
            if isImporting {
                ProgressView().tint(.white)
            } else {
                Text("பணப்பை ஏற்றுமதி செய்")
            }
        }
        .buttonStyle(.tamizhiPrimary)
        .disabled(!isValid || isImporting)
    }

    private func importWallet() {
        isImporting = true
        errorMsg    = ""

        Task { @MainActor in
            defer { isImporting = false }
            do {
                try await appState.signIn(mnemonic: mnemonicInput.trimmingCharacters(in: .whitespaces), label: walletLabel)
                dismiss()
            } catch {
                errorMsg = error.localizedDescription
            }
        }
    }
}

#Preview {
    OnboardingView().environmentObject(AppState())
}
