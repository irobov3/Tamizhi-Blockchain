import Foundation

extension String {
    // MARK: - Tamil Script Detection

    /// Returns true if the string contains Tamil Unicode characters (U+0B80–U+0BFF)
    var isTamilScript: Bool {
        unicodeScalars.contains { scalar in
            (0x0B80...0x0BFF).contains(scalar.value)
        }
    }

    /// Returns true if ALL non-whitespace characters are Tamil script
    var isAllTamil: Bool {
        let nonSpace = filter { !$0.isWhitespace }
        guard !nonSpace.isEmpty else { return false }
        return nonSpace.unicodeScalars.allSatisfy { (0x0B80...0x0BFF).contains($0.value) }
    }

    // MARK: - Address Utilities

    /// Truncate a blockchain address: "tamizhi1abc…xyz9"
    func truncateAddress(chars: Int = 6) -> String {
        guard count > (chars * 2 + 3) else { return self }
        return "\(prefix(chars))…\(suffix(chars))"
    }

    /// Validates a Tamizhi bech32 address (starts with "tamizhi1")
    var isValidTamizhiAddress: Bool {
        hasPrefix("tamizhi1") && count >= 39 && count <= 59
    }

    // MARK: - TMZ Amount Formatting

    /// Formats a utmz string as a human-readable TMZ amount
    func formatTMZAmount(fromUTMZ: Bool = false) -> String {
        let raw = Double(self) ?? 0
        let tmz = fromUTMZ ? raw / 1_000_000 : raw
        let formatter = NumberFormatter()
        formatter.numberStyle           = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 6
        formatter.groupingSeparator     = ","
        return "\(formatter.string(from: NSNumber(value: tmz)) ?? "0") TMZ"
    }

    // MARK: - Basic Latin Transliteration of Tamil

    /// Very basic Tamil → Latin phonetic mapping for accessibility / search
    func transliterateToLatin() -> String {
        var result = self
        let map: [(String, String)] = [
            ("அ","a"), ("ஆ","aa"), ("இ","i"), ("ஈ","ii"), ("உ","u"), ("ஊ","uu"),
            ("எ","e"), ("ஏ","ee"), ("ஐ","ai"), ("ஒ","o"), ("ஓ","oo"), ("ஔ","au"),
            ("க","ka"), ("ங","nga"), ("ச","cha"), ("ஞ","nya"), ("ட","ta"), ("ண","na"),
            ("த","tha"), ("ந","na"), ("ப","pa"), ("ம","ma"), ("ய","ya"), ("ர","ra"),
            ("ல","la"), ("வ","va"), ("ழ","zha"), ("ள","la"), ("ற","ra"), ("ன","na"),
            ("ஜ","ja"), ("ஷ","sha"), ("ஸ","sa"), ("ஹ","ha"), ("க்ஷ","ksha"),
            ("ா","aa"), ("ி","i"), ("ீ","ii"), ("ு","u"), ("ூ","uu"), ("ெ","e"),
            ("ே","ee"), ("ை","ai"), ("ொ","o"), ("ோ","oo"), ("ௌ","au"),
            ("்",""), ("ஃ","ah")
        ]
        for (tamil, latin) in map {
            result = result.replacingOccurrences(of: tamil, with: latin)
        }
        return result
    }

    // MARK: - Utilities

    /// Returns true if the string could be a BIP-39 mnemonic (12 or 24 words)
    var isMnemonic: Bool {
        let words = split(separator: " ").count
        return words == 12 || words == 24
    }

    /// Capitalise each word
    var titleCased: String {
        split(separator: " ")
            .map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }
            .joined(separator: " ")
    }

    /// Safe subscript
    subscript(safe index: Int) -> Character? {
        guard index >= 0, index < count else { return nil }
        return self[self.index(startIndex, offsetBy: index)]
    }
}
