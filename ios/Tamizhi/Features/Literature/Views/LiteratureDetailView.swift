import SwiftUI

struct LiteratureDetailView: View {
    let work: LiteraryWork

    @State private var isContentExpanded = false
    @State private var showFullContent = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                headerSection

                Divider().background(Color.white.opacity(0.12))

                // Metadata badges
                metadataSection

                Divider().background(Color.white.opacity(0.12))

                // Description
                if !work.description.isEmpty {
                    descriptionSection
                    Divider().background(Color.white.opacity(0.12))
                }

                // Content (expandable)
                if !work.descriptionTamil.isEmpty {
                    contentSection
                    Divider().background(Color.white.opacity(0.12))
                }

                // IPFS Link
                ipfsSection

                // Chain proof card
                if work.isVerifiedOnChain {
                    chainProofCard
                }

                Spacer(minLength: 40)
            }
            .padding(20)
        }
        .background(Color.tamizhiNavyDark.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(work.titleTamil)
                        .font(.headline)
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                if work.isVerifiedOnChain {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(Color.tamizhiGold)
                }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(work.titleTamil)
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(.white)

            Text(work.title)
                .font(.title3)
                .foregroundColor(.white.opacity(0.6))

            Spacer(minLength: 4)

            HStack(spacing: 8) {
                Text(work.authorTamil)
                    .font(.headline)
                    .foregroundColor(Color.tamizhiGold)

                Text("·")
                    .foregroundColor(.white.opacity(0.3))

                Text(work.author)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.55))

                if let year = work.yearEstimate {
                    Text("·")
                        .foregroundColor(.white.opacity(0.3))
                    Text(year)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.55))
                }
            }
        }
    }

    // MARK: - Metadata

    private var metadataSection: some View {
        HStack(spacing: 10) {
            MetadataBadge(
                label: work.period.displayName,
                color: periodColor
            )

            MetadataBadge(
                label: work.genre.displayName,
                color: Color.tamizhiGold.opacity(0.85)
            )

            MetadataBadge(
                label: work.language == "ta" ? "தமிழ்" : "English",
                color: Color.blue.opacity(0.75)
            )

            if work.isVerifiedOnChain {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 11))
                    Text("Verified")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundColor(Color.tamizhiNavy)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.green.opacity(0.85))
                .cornerRadius(8)
            }

            Spacer()
        }
    }

    // MARK: - Description

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("About / பற்றி", systemImage: "info.circle")
                .font(.subheadline.bold())
                .foregroundColor(Color.tamizhiGold)

            Text(work.description)
                .font(.body)
                .foregroundColor(.white.opacity(0.8))
                .lineSpacing(5)
        }
    }

    // MARK: - Content (expandable)

    private var contentSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Content / உள்ளடக்கம்", systemImage: "doc.text")
                .font(.subheadline.bold())
                .foregroundColor(Color.tamizhiGold)

            let preview = String(work.descriptionTamil.prefix(300))
            let isTruncated = work.descriptionTamil.count > 300

            VStack(alignment: .leading, spacing: 8) {
                Text(isContentExpanded ? work.descriptionTamil : preview + (isTruncated ? "…" : ""))
                    .font(.body)
                    .foregroundColor(.white.opacity(0.85))
                    .lineSpacing(6)

                if isTruncated {
                    Button {
                        withAnimation(.easeInOut) {
                            isContentExpanded.toggle()
                        }
                    } label: {
                        Text(isContentExpanded ? "Show less ▲" : "Read more ▼")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(Color.tamizhiSaffron)
                    }
                }
            }
            .padding(14)
            .background(Color.white.opacity(0.04))
            .cornerRadius(12)
        }
    }

    // MARK: - IPFS Section

    private var ipfsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Decentralized Storage / IPFS", systemImage: "network")
                .font(.subheadline.bold())
                .foregroundColor(Color.tamizhiGold)

            HStack {
                Text(work.ipfsCid)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)
                    .truncationMode(.middle)

                Spacer()

                if let url = work.ipfsURL {
                    Link(destination: url) {
                        HStack(spacing: 5) {
                            Image(systemName: "arrow.up.right.square")
                            Text("Open")
                        }
                        .font(.caption.bold())
                        .foregroundColor(Color.tamizhiNavy)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.tamizhiGold)
                        .cornerRadius(8)
                    }
                }
            }
            .padding(12)
            .background(Color.white.opacity(0.05))
            .cornerRadius(10)
        }
    }

    // MARK: - Chain Proof Card

    private var chainProofCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Blockchain Proof / சங்கிலி சான்று", systemImage: "lock.shield")
                    .font(.subheadline.bold())
                    .foregroundColor(.white)

                Spacer()

                // Verified stamp
                ZStack {
                    Circle()
                        .stroke(Color.green, lineWidth: 2)
                        .frame(width: 44, height: 44)
                    VStack(spacing: 1) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 16))
                            .foregroundColor(Color.green)
                        Text("✓")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color.green)
                    }
                }
                .rotationEffect(.degrees(-15))
            }

            Divider().background(Color.white.opacity(0.15))

            VStack(spacing: 10) {
                if let hash = work.chainTxHash {
                    ProofRow(label: "TX Hash", value: hash.truncateAddress(chars: 12), monospaced: true)
                }

                ProofRow(
                    label: "Status",
                    value: work.isVerifiedOnChain ? "✓ Verified on Tamizhi Chain" : "Pending",
                    monospaced: false
                )

                ProofRow(label: "Chain", value: AppConfig.chainID, monospaced: true)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color.tamizhiNavy, Color.tamizhiNavy.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.green.opacity(0.35), lineWidth: 1)
        )
    }

    private var periodColor: Color {
        Color(hex: work.period.color).opacity(0.85)
    }
}

// MARK: - Helpers

private struct MetadataBadge: View {
    let label: String
    let color: Color

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(Color.tamizhiNavy)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color)
            .cornerRadius(8)
    }
}

private struct ProofRow: View {
    let label: String
    let value: String
    let monospaced: Bool

    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
                .frame(width: 70, alignment: .leading)

            Text(value)
                .font(monospaced ? .system(.caption, design: .monospaced) : .caption)
                .foregroundColor(.white.opacity(0.85))
                .lineLimit(1)
                .truncationMode(.middle)

            Spacer()
        }
    }
}

private extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

#Preview {
    NavigationStack {
        LiteratureDetailView(
            work: LiteraryWork(
                id: "1",
                title: "Tirukkural",
                titleTamil: "திருக்குறள்",
                author: "Thiruvalluvar",
                authorTamil: "திருவள்ளுவர்",
                period: .sangam,
                genre: .poetry,
                ipfsCid: "Qm1234567890abcdef",
                description: "A classic of Cankam literature...",
                descriptionTamil: "அகர முதல எழுத்தெல்லாம்...",
                isVerifiedOnChain: true,
                chainTxHash: "ABC123XYZ789",
                yearEstimate: "~300 BCE"
            )
        )
    }
    .preferredColorScheme(.dark)
}
