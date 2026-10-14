import Foundation

// MARK: - Endpoint

enum Endpoint {
    case getNonce(address: String)
    case verify(address: String, signature: String)
    case getBalance(address: String)
    case getLiterature(page: Int, limit: Int)
    case getLiteratureDetail(id: String)
    case sendMessage(to: String, encrypted: String, nonce: String)
    case getMessages(address: String)
    case aiChat(message: String, language: String)

    var path: String {
        switch self {
        case .getNonce(let address):       return "/auth/nonce/\(address)"
        case .verify:                      return "/auth/verify"
        case .getBalance(let address):     return "/wallet/balance/\(address)"
        case .getLiterature:               return "/literature"
        case .getLiteratureDetail(let id): return "/literature/\(id)"
        case .sendMessage:                 return "/messages/send"
        case .getMessages(let address):    return "/messages/\(address)"
        case .aiChat:                      return "/ai/chat"
        }
    }

    var method: String {
        switch self {
        case .getNonce, .getBalance, .getLiterature, .getLiteratureDetail, .getMessages:
            return "GET"
        case .verify, .sendMessage, .aiChat:
            return "POST"
        }
    }

    var body: Data? {
        let encoder = JSONEncoder()
        switch self {
        case .verify(let address, let signature):
            return try? encoder.encode(["address": address, "signature": signature])
        case .sendMessage(let to, let encrypted, let nonce):
            return try? encoder.encode(["to": to, "encryptedContent": encrypted, "nonce": nonce])
        case .aiChat(let message, let language):
            return try? encoder.encode(["message": message, "language": language])
        default:
            return nil
        }
    }

    var queryItems: [URLQueryItem]? {
        switch self {
        case .getLiterature(let page, let limit):
            return [URLQueryItem(name: "page", value: "\(page)"),
                    URLQueryItem(name: "limit", value: "\(limit)")]
        default:
            return nil
        }
    }
}

// MARK: - Upload Response

struct UploadResponse: Decodable {
    let url: String
    let cid: String?
}

// MARK: - API Error

enum APIError: LocalizedError {
    case invalidURL
    case httpError(statusCode: Int, message: String?)
    case decodingError(Error)
    case noData
    case unauthorized
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:                       return "Invalid URL"
        case .httpError(let code, let msg):     return "HTTP \(code): \(msg ?? "Unknown")"
        case .decodingError(let e):             return "Decode error: \(e.localizedDescription)"
        case .noData:                           return "No data received"
        case .unauthorized:                     return "Unauthorized — please sign in again"
        case .networkError(let e):              return "Network error: \(e.localizedDescription)"
        }
    }
}

// MARK: - APIClient

final class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession
    private var authToken: String?

    init(baseURL: URL = AppConfig.apiBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    func setAuthToken(_ token: String) {
        self.authToken = token
    }

    // MARK: - Generic Request

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let urlRequest = try buildRequest(for: endpoint)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            throw APIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse else { throw APIError.noData }

        if http.statusCode == 401 { throw APIError.unauthorized }

        guard (200...299).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.message
            throw APIError.httpError(statusCode: http.statusCode, message: message)
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Upload

    func upload(data: Data, to endpoint: Endpoint) async throws -> UploadResponse {
        var request = try buildRequest(for: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        let (responseData, response): (Data, URLResponse)
        do {
            (responseData, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0, message: nil)
        }

        do {
            return try JSONDecoder().decode(UploadResponse.self, from: responseData)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Private

    private func buildRequest(for endpoint: Endpoint) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint.path), resolvingAgainstBaseURL: true)
        components?.queryItems = endpoint.queryItems

        guard let url = components?.url else { throw APIError.invalidURL }

        var request       = URLRequest(url: url, timeoutInterval: 30)
        request.httpMethod = endpoint.method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = endpoint.body {
            request.httpBody = body
        }

        return request
    }
}

private struct ErrorResponse: Decodable {
    let message: String?
}

// MARK: - Path-based convenience methods
// Used by feature-layer extensions that prefer raw paths over the Endpoint enum.

extension APIClient {

    /// GET request to an arbitrary path, decoded into T.
    func get<T: Decodable>(path: String, queryItems: [URLQueryItem]? = nil) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent(path),
                                       resolvingAgainstBaseURL: true)
        components?.queryItems = queryItems
        guard let url = components?.url else { throw APIError.invalidURL }

        var req = URLRequest(url: url, timeoutInterval: 30)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await fetchData(for: req)
        return try decodeResponse(data: data, response: response)
    }

    /// POST request to an arbitrary path with an Encodable body, decoded into T.
    func post<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
        guard let url = baseURL.appendingPathComponent(path) as URL? else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url, timeoutInterval: 30)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await fetchData(for: req)
        return try decodeResponse(data: data, response: response)
    }

    // MARK: - Private helpers

    private func fetchData(for request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            return try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func decodeResponse<T: Decodable>(data: Data, response: URLResponse) throws -> T {
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200...299).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.message
            throw APIError.httpError(statusCode: http.statusCode, message: message)
        }
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
