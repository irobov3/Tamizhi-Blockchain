import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

struct ReceiveView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var copied = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.tamizhiBackground.ignoresSafeArea()

                VStack(spacing: 28) {
                    header
                    qrSection
                    addressSection
                    shareButton
                    Spacer()
                }
                .padding(24)
            }
            .navigationTitle("பெறு · Receive")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("மூடு") { dismiss() }
                        .foregroundColor(.tamizhiSaffron)
                }
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 6) {
            Text("உங்கள் TMZ முகவரி")
                .font(.headline)
                .foregroundColor(.white)
            Text("Share your address to receive TMZ tokens")
                .font(.caption)
                .foregroundColor(.tamizhiSecondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - QR Code

    private var qrSection: some View {
        Group {
            if let address = appState.currentWallet?.address,
               let qrImage = generateQRCode(from: address) {
                ZStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.white)
                        .frame(width: 220, height: 220)
                        .shadow(color: .tamizhiSaffron.opacity(0.3), radius: 16)

                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 190, height: 190)
                }
            } else {
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.tamizhiSurface)
                    .frame(width: 220, height: 220)
                    .overlay {
                        Text("QR generate தோல்வி")
                            .font(.caption)
                            .foregroundColor(.tamizhiSecondary)
                    }
            }
        }
    }

    // MARK: - Address

    private var addressSection: some View {
        VStack(spacing: 10) {
            if let address = appState.currentWallet?.address {
                Text(address)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(.tamizhiGold)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .padding(.horizontal, 8)

                Button {
                    UIPasteboard.general.string = address
                    withAnimation { copied = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation { copied = false }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: copied ? "checkmark.circle.fill" : "doc.on.doc")
                        Text(copied ? "நகலெடுக்கப்பட்டது!" : "முகவரியை நகலெடு")
                    }
                    .font(.subheadline)
                    .foregroundColor(copied ? .tamizhiGreen : .tamizhiSaffron)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.tamizhiSurface)
                    .cornerRadius(20)
                }
            }
        }
    }

    // MARK: - Share

    private var shareButton: some View {
        Button {
            guard let address = appState.currentWallet?.address else { return }
            let message = "எனது Tamizhi முகவரி: \(address)"
            let av = UIActivityViewController(
                activityItems: [message],
                applicationActivities: nil
            )
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows
                .first?.rootViewController?
                .present(av, animated: true)
        } label: {
            Label("பகிர் · Share Address", systemImage: "square.and.arrow.up")
        }
        .buttonStyle(.tamizhiSecondary)
    }

    // MARK: - QR Generation

    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter  = CIFilter.qrCodeGenerator()
        filter.message    = Data(string.utf8)
        filter.correctionLevel = "M"

        guard let outputImage = filter.outputImage else { return nil }

        let scale: CGFloat = 10
        let transformed = outputImage.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

        guard let cgImage = context.createCGImage(transformed, from: transformed.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

#Preview {
    ReceiveView().environmentObject(AppState())
}
