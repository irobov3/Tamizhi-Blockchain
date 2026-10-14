import Foundation

// MARK: - Chain Models

struct ChainBalance: Decodable {
    let denom: String
    let amount: String
}

struct ChainBalanceResponse: Decodable {
    let balances: [ChainBalance]
}

struct ChainTx: Decodable {
    let txhash: String
    let height: String
    let timestamp: String
    let tx: TxBody?
    let code: Int?

    struct TxBody: Decodable {
        let body: Body?
        struct Body: Decodable {
            let messages: [AnyCodable]?
            let memo: String?
        }
    }
}

struct ChainTxResponse: Decodable {
    let txs: [ChainTx]
    let pagination: Pagination?

    struct Pagination: Decodable {
        let nextKey: String?
        let total: String?
    }
}

struct BroadcastTxRequest: Encodable {
    let txBytes: String // base64-encoded signed tx
    let mode: String    // "BROADCAST_MODE_SYNC" | "BROADCAST_MODE_ASYNC"
}

struct BroadcastTxResponse: Decodable {
    let txResponse: TxResponse

    struct TxResponse: Decodable {
        let txhash: String
        let code: Int
        let rawLog: String?
        let height: String?
    }
}

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) { self.value = value }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict
        } else if let str = try? container.decode(String.self) {
            value = str
        } else {
            value = ""
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(String(describing: value))
    }
}

// MARK: - ChainClient

enum ChainError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case httpError(Int)
    case decodingError(Error)
    case broadcastFailed(code: Int, log: String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:              return "Invalid chain URL"
        case .networkError(let e):     return "Network: \(e.localizedDescription)"
        case .httpError(let c):        return "HTTP \(c)"
        case .decodingError(let e):    return "Decode: \(e.localizedDescription)"
        case .broadcastFailed(let c, let l): return "Broadcast failed (code \(c)): \(l)"
        }
    }
}

final class ChainClient {
    static let shared = ChainClient()

    private let lcdURL: URL
    private let session: URLSession

    init(lcdURL: URL = AppConfig.chainLCDURL, session: URLSession = .shared) {
        self.lcdURL  = lcdURL
        self.session = session
    }

    // MARK: - Balance

    /// Fetch all coin balances for an address from the chain LCD.
    func getBalance(address: String) async throws -> [ChainBalance] {
        let url = lcdURL
            .appendingPathComponent("cosmos/bank/v1beta1/balances")
            .appendingPathComponent(address)

        let response: ChainBalanceResponse = try await get(url: url)
        return response.balances
    }

    /// Returns the TMZ (utmz) balance as a Double in human-readable form.
    func getTMZBalance(address: String) async throws -> Double {
        let balances = try await getBalance(address: address)
        let utmz = balances.first { $0.denom == "utmz" }?.amount ?? "0"
        return (Double(utmz) ?? 0) / 1_000_000
    }

    // MARK: - Transactions

    func getTransactions(address: String, page: UInt = 1, limit: UInt = 20) async throws -> [ChainTx] {
        var components = URLComponents(
            url: lcdURL.appendingPathComponent("cosmos/tx/v1beta1/txs"),
            resolvingAgainstBaseURL: true
        )!
        components.queryItems = [
            URLQueryItem(name: "events",         value: "transfer.recipient='\(address)'"),
            URLQueryItem(name: "pagination.limit",  value: "\(limit)"),
            URLQueryItem(name: "pagination.offset", value: "\((page - 1) * limit)"),
            URLQueryItem(name: "order_by",       value: "ORDER_BY_DESC")
        ]
        guard let url = components.url else { throw ChainError.invalidURL }
        let response: ChainTxResponse = try await get(url: url)
        return response.txs
    }

    // MARK: - Broadcast

    func broadcastTx(signedTxData: Data) async throws -> BroadcastTxResponse.TxResponse {
        let url = lcdURL.appendingPathComponent("cosmos/tx/v1beta1/txs")
        let body = BroadcastTxRequest(
            txBytes: signedTxData.base64EncodedString(),
            mode:    "BROADCAST_MODE_SYNC"
        )
        let response: BroadcastTxResponse = try await post(url: url, body: body)

        guard response.txResponse.code == 0 else {
            throw ChainError.broadcastFailed(
                code: response.txResponse.code,
                log:  response.txResponse.rawLog ?? "Unknown error"
            )
        }
        return response.txResponse
    }

    // MARK: - Private Helpers

    private func get<T: Decodable>(url: URL) async throws -> T {
        var request = URLRequest(url: url, timeoutInterval: 20)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw ChainError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ChainError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            throw ChainError.decodingError(error)
        }
    }

    private func post<T: Decodable, B: Encodable>(url: URL, body: B) async throws -> T {
        var request        = URLRequest(url: url, timeoutInterval: 30)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody   = try JSONEncoder().encode(body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw ChainError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ChainError.httpError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            return try decoder.decode(T.self, from: data)
        } catch {
            throw ChainError.decodingError(error)
        }
    }
}
