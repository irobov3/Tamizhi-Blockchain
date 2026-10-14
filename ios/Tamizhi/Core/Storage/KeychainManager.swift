import Foundation
import Security

enum KeychainError: LocalizedError {
    case itemNotFound
    case duplicateItem
    case unexpectedData
    case unhandledError(status: OSStatus)

    var errorDescription: String? {
        switch self {
        case .itemNotFound:            return "Keychain item not found"
        case .duplicateItem:           return "Keychain item already exists"
        case .unexpectedData:          return "Unexpected data format in Keychain"
        case .unhandledError(let s):   return "Keychain error: \(s)"
        }
    }
}

final class KeychainManager {
    static let shared = KeychainManager()
    private let service = "com.tamizhi.app"

    private init() {}

    // MARK: - Core CRUD

    func save(key: String, data: Data) throws {
        let query: [CFString: Any] = [
            kSecClass:            kSecClassGenericPassword,
            kSecAttrService:      service,
            kSecAttrAccount:      key,
            kSecValueData:        data,
            kSecAttrAccessible:   kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        // Delete existing first
        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unhandledError(status: status)
        }
    }

    func load(key: String) throws -> Data {
        let query: [CFString: Any] = [
            kSecClass:            kSecClassGenericPassword,
            kSecAttrService:      service,
            kSecAttrAccount:      key,
            kSecReturnData:       true,
            kSecMatchLimit:       kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        switch status {
        case errSecSuccess:
            guard let data = item as? Data else {
                throw KeychainError.unexpectedData
            }
            return data
        case errSecItemNotFound:
            throw KeychainError.itemNotFound
        default:
            throw KeychainError.unhandledError(status: status)
        }
    }

    func delete(key: String) throws {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandledError(status: status)
        }
    }

    // MARK: - Mnemonic

    func saveMnemonic(_ mnemonic: String, for address: String) throws {
        guard let data = mnemonic.data(using: .utf8) else {
            throw KeychainError.unexpectedData
        }
        try save(key: "mnemonic_\(address)", data: data)
    }

    func loadMnemonic(for address: String) throws -> String {
        let data = try load(key: "mnemonic_\(address)")
        guard let mnemonic = String(data: data, encoding: .utf8) else {
            throw KeychainError.unexpectedData
        }
        return mnemonic
    }

    // MARK: - X25519 Secret Key

    func saveX25519SecretKey(_ key: Data, for address: String) throws {
        try save(key: "x25519_\(address)", data: key)
    }

    func loadX25519SecretKey(for address: String) throws -> Data {
        try load(key: "x25519_\(address)")
    }

    // MARK: - Auth Token

    func saveAuthToken(_ token: String) throws {
        guard let data = token.data(using: .utf8) else { throw KeychainError.unexpectedData }
        try save(key: "auth_token", data: data)
    }

    func loadAuthToken() throws -> String {
        let data = try load(key: "auth_token")
        guard let token = String(data: data, encoding: .utf8) else {
            throw KeychainError.unexpectedData
        }
        return token
    }

    func deleteAuthToken() throws {
        try delete(key: "auth_token")
    }

    // MARK: - Wallet Private Key

    func savePrivateKey(_ key: Data, for address: String) throws {
        try save(key: "privkey_\(address)", data: key)
    }

    func loadPrivateKey(for address: String) throws -> Data {
        try load(key: "privkey_\(address)")
    }
}
