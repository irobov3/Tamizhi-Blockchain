import Foundation

/// Static configuration constants loaded from Info.plist with localhost fallbacks.
enum AppConfig {
    private static let plist = Bundle.main.infoDictionary

    /// Backend REST API base URL
    static let apiBaseURL: String = {
        plist?["TamizhiAPIURL"] as? String ?? "http://localhost:3000"
    }()

    /// Cosmos/Tendermint RPC endpoint
    static let chainRPCURL: String = {
        plist?["TamizhiChainRPC"] as? String ?? "http://localhost:26657"
    }()

    /// Cosmos LCD (REST) endpoint
    static let chainLCDURL: String = {
        plist?["TamizhiChainLCD"] as? String ?? "http://localhost:1317"
    }()

    /// Cosmos chain-id
    static let chainID: String = {
        plist?["TamizhiChainID"] as? String ?? "tamizhi-1"
    }()

    /// IPFS HTTP gateway
    static let ipfsGateway: String = {
        plist?["TamizhiIPFSGateway"] as? String ?? "https://ipfs.io"
    }()

    /// WebSocket endpoint for real-time events
    static let wsURL: String = {
        plist?["TamizhiWSURL"] as? String ?? "ws://localhost:3000"
    }()

    // MARK: - Derived helpers

    static var apiBaseURLComponents: URLComponents? {
        URLComponents(string: apiBaseURL)
    }

    static func apiURL(_ path: String) -> URL {
        URL(string: apiBaseURL + path)!
    }

    static func chainRPCURL(_ path: String) -> URL {
        URL(string: chainRPCURL + path)!
    }

    static func chainLCDURL(_ path: String) -> URL {
        URL(string: chainLCDURL + path)!
    }
}
