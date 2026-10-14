import SwiftUI
import Combine

@MainActor
class LiteratureViewModel: ObservableObject {
    @Published var works: [LiteraryWork] = []
    @Published var filteredWorks: [LiteraryWork] = []
    @Published var searchText: String = ""
    @Published var selectedPeriod: LiteraryPeriod?
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var selectedWork: LiteraryWork?
    @Published var page: Int = 1
    @Published var hasMorePages: Bool = true

    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    private let pageSize = 20

    init() {
        setupSearchDebounce()
    }

    // MARK: - Setup

    private func setupSearchDebounce() {
        $searchText
            .debounce(for: .milliseconds(400), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] query in
                Task { [weak self] in
                    await self?.applyFilters(query: query)
                }
            }
            .store(in: &cancellables)

        $selectedPeriod
            .sink { [weak self] _ in
                Task { [weak self] in
                    await self?.applyFilters(query: self?.searchText ?? "")
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Load Works

    func loadWorks(reset: Bool = false) async {
        guard !isLoading else { return }
        if reset {
            page = 1
            hasMorePages = true
            works = []
        }
        guard hasMorePages else { return }

        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            var path = "/api/v1/literature?page=\(page)&limit=\(pageSize)"
            if let period = selectedPeriod {
                path += "&period=\(period.rawValue)"
            }
            let response: LiteratureListResponse = try await get(path: path)
            if reset {
                works = response.works
            } else {
                works.append(contentsOf: response.works)
            }
            hasMorePages = works.count < response.total
            page += 1
            await applyFilters(query: searchText)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Search Works

    func searchWorks(_ query: String) async {
        guard !query.isEmpty else {
            await loadWorks(reset: true)
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            let path = "/api/v1/literature/search?q=\(encoded)"
            let response: LiteratureListResponse = try await get(path: path)
            filteredWorks = response.works
        } catch {
            // Fallback to local filter
            await applyFilters(query: query)
        }
    }

    // MARK: - Filter by Period

    func filterByPeriod(_ period: LiteraryPeriod?) {
        selectedPeriod = period
    }

    // MARK: - Select Work

    func selectWork(_ work: LiteraryWork) {
        selectedWork = work
    }

    func clearSelection() {
        selectedWork = nil
    }

    // MARK: - Load More

    func loadMoreIfNeeded(currentWork: LiteraryWork) async {
        guard let index = works.firstIndex(where: { $0.id == currentWork.id }) else { return }
        let threshold = works.count - 4
        if index >= threshold {
            await loadWorks()
        }
    }

    // MARK: - Private

    private func applyFilters(query: String) async {
        var result = works

        // Filter by period
        if let period = selectedPeriod {
            result = result.filter { $0.period == period }
        }

        // Filter by search query
        if !query.isEmpty {
            let lower = query.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(lower) ||
                $0.titleTamil.contains(lower) ||
                $0.author.lowercased().contains(lower) ||
                $0.authorTamil.contains(lower) ||
                $0.description.lowercased().contains(lower)
            }
        }

        filteredWorks = result
    }

    private func get<T: Decodable>(path: String) async throws -> T {
        let url = AppConfig.apiURL(path)
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
