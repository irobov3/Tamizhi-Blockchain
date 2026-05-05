import SwiftUI

struct LiteratureView: View {
    @StateObject private var viewModel = LiteratureViewModel()
    @State private var showUploadSheet = false
    @State private var selectedWork: LiteraryWork?

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                // Period filter chips
                periodFilterChips

                Divider().background(Color.white.opacity(0.08))

                // Works grid
                if viewModel.isLoading && viewModel.filteredWorks.isEmpty {
                    loadingView
                } else if viewModel.filteredWorks.isEmpty {
                    emptyState
                } else {
                    worksGrid
                }
            }
            .background(Color.tamizhiNavyDark.ignoresSafeArea())
            .navigationTitle("Literature / இலக்கியம்")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showUploadSheet = true
                    } label: {
                        Image(systemName: "icloud.and.arrow.up")
                            .foregroundColor(Color.tamizhiGold)
                    }
                }
            }
            .task {
                await viewModel.loadWorks(reset: true)
            }
            .refreshable {
                await viewModel.loadWorks(reset: true)
            }
            .sheet(isPresented: $showUploadSheet) {
                UploadLiteratureSheet()
            }
            .navigationDestination(item: $selectedWork) { work in
                LiteratureDetailView(work: work)
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.white.opacity(0.45))

            TextField("Search / தேடு…", text: $viewModel.searchText)
                .foregroundColor(.white)
                .tint(Color.tamizhiGold)
                .autocorrectionDisabled()

            if !viewModel.searchText.isEmpty {
                Button {
                    viewModel.searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.4))
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.07))
        .cornerRadius(12)
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    // MARK: - Period Filter Chips

    private var periodFilterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                FilterChip(
                    title: "All / அனைத்தும்",
                    isSelected: viewModel.selectedPeriod == nil
                ) {
                    viewModel.filterByPeriod(nil)
                }

                ForEach(LiteraryPeriod.allCases, id: \.self) { period in
                    FilterChip(
                        title: period.displayName,
                        isSelected: viewModel.selectedPeriod == period
                    ) {
                        viewModel.filterByPeriod(
                            viewModel.selectedPeriod == period ? nil : period
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
    }

    // MARK: - Works Grid

    private var worksGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(viewModel.filteredWorks) { work in
                    WorkCard(work: work)
                        .onTapGesture {
                            selectedWork = work
                        }
                        .task {
                            await viewModel.loadMoreIfNeeded(currentWork: work)
                        }
                }
            }
            .padding(16)

            if viewModel.isLoading {
                ProgressView()
                    .tint(Color.tamizhiGold)
                    .padding()
            }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView()
                .tint(Color.tamizhiGold)
                .scaleEffect(1.5)
            Text("Loading works…")
                .foregroundColor(.white.opacity(0.5))
            Spacer()
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "books.vertical")
                .font(.system(size: 60))
                .foregroundColor(Color.tamizhiGold.opacity(0.5))
            Text("No works found")
                .font(.title3)
                .foregroundColor(.white)
            Text("Try adjusting your search or filters")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.5))
            Spacer()
        }
    }
}

// MARK: - Work Card

private struct WorkCard: View {
    let work: LiteraryWork

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Period badge strip
            HStack {
                periodBadge
                Spacer()
                if work.isVerifiedOnChain {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.caption)
                        .foregroundColor(Color.tamizhiGold)
                }
            }

            // Tamil title
            Text(work.titleTamil)
                .font(.headline)
                .foregroundColor(.white)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            // Author
            Text(work.authorTamil)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
                .lineLimit(1)

            Spacer()

            // Genre badge
            Text(work.genre.displayName)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color.tamizhiNavy)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.tamizhiGold.opacity(0.85))
                .cornerRadius(6)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
        .background(Color.tamizhiNavy)
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.07), lineWidth: 1)
        )
    }

    private var periodBadge: some View {
        Text(work.period.displayName)
            .font(.system(size: 9, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(
                Color(hex: work.period.color).opacity(0.75)
            )
            .cornerRadius(5)
    }
}

// MARK: - Filter Chip

private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? Color.tamizhiNavy : .white.opacity(0.75))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? Color.tamizhiGold : Color.white.opacity(0.1))
                .clipShape(Capsule())
        }
    }
}

// MARK: - Upload Sheet

private struct UploadLiteratureSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var titleTamil = ""
    @State private var author = ""
    @State private var selectedPeriod: LiteraryPeriod = .sangam
    @State private var selectedGenre: LiteraryGenre = .poetry
    @State private var content = ""
    @State private var isUploading = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Title / தலைப்பு") {
                    TextField("English title", text: $title)
                    TextField("தமிழ் தலைப்பு", text: $titleTamil)
                }
                Section("Author / ஆசிரியர்") {
                    TextField("Author name", text: $author)
                }
                Section("Classification") {
                    Picker("Period", selection: $selectedPeriod) {
                        ForEach(LiteraryPeriod.allCases, id: \.self) { p in
                            Text(p.displayName).tag(p)
                        }
                    }
                    Picker("Genre", selection: $selectedGenre) {
                        ForEach(LiteraryGenre.allCases, id: \.self) { g in
                            Text(g.displayName).tag(g)
                        }
                    }
                }
                Section("Content / உள்ளடக்கம்") {
                    TextEditor(text: $content)
                        .frame(minHeight: 120)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.tamizhiNavyDark)
            .navigationTitle("Upload Work")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        upload()
                    } label: {
                        if isUploading {
                            ProgressView().tint(Color.tamizhiGold)
                        } else {
                            Text("Upload").foregroundColor(Color.tamizhiGold)
                        }
                    }
                    .disabled(title.isEmpty || content.isEmpty || isUploading)
                }
            }
        }
    }

    private func upload() {
        isUploading = true
        Task {
            // Upload would go through APIClient
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            isUploading = false
            dismiss()
        }
    }
}

// MARK: - Color Hex Extension

private extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        r = Double((int >> 16) & 0xFF) / 255
        g = Double((int >> 8) & 0xFF) / 255
        b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

#Preview {
    LiteratureView()
        .preferredColorScheme(.dark)
}
