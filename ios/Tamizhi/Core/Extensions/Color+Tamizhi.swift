import SwiftUI

extension Color {
    // MARK: - Tamizhi Brand Colors

    /// Primary action color — Tamizhi Saffron
    static let tamizhiSaffron    = Color(hex: "#E8500A")

    /// Dark navy background for cards and surfaces
    static let tamizhiNavy       = Color(hex: "#1A1A2E")

    /// Gold accent for highlights and badges
    static let tamizhiGold       = Color(hex: "#F5C518")

    /// App primary background
    static let tamizhiBackground = Color(hex: "#0D0D1A")

    /// Elevated surface color
    static let tamizhiSurface    = Color(hex: "#16213E")

    /// Subtle border / divider
    static let tamizhiBorder     = Color(hex: "#2A2A4A")

    /// Success green
    static let tamizhiGreen      = Color(hex: "#27AE60")

    /// Error red
    static let tamizhiRed        = Color(hex: "#E74C3C")

    /// Text secondary
    static let tamizhiSecondary  = Color(hex: "#8899AA")

    // MARK: - Gradients

    static var walletGradient: LinearGradient {
        LinearGradient(
            colors: [.tamizhiSaffron, .tamizhiGold],
            startPoint: .topLeading,
            endPoint:   .bottomTrailing
        )
    }

    static var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [.tamizhiBackground, .tamizhiNavy],
            startPoint: .top,
            endPoint:   .bottom
        )
    }

    // MARK: - Hex Initializer

    init(hex: String) {
        let sanitized = hex
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&rgb)

        let length = sanitized.count
        let r, g, b, a: Double

        switch length {
        case 6:
            r = Double((rgb & 0xFF0000) >> 16) / 255
            g = Double((rgb & 0x00FF00) >> 8)  / 255
            b = Double( rgb & 0x0000FF)         / 255
            a = 1.0
        case 8:
            r = Double((rgb & 0xFF000000) >> 24) / 255
            g = Double((rgb & 0x00FF0000) >> 16) / 255
            b = Double((rgb & 0x0000FF00) >> 8)  / 255
            a = Double( rgb & 0x000000FF)         / 255
        default:
            r = 1; g = 1; b = 1; a = 1
        }

        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}
