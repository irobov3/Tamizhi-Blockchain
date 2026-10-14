import SwiftUI

// MARK: - ViewModifiers

/// Card style with rounded corners and surface background
struct TamizhiCardModifier: ViewModifier {
    var cornerRadius: CGFloat
    var padding: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.tamizhiSurface)
            .cornerRadius(cornerRadius)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.tamizhiBorder, lineWidth: 1)
            )
    }
}

/// Primary button style
struct TamizhiButtonModifier: ViewModifier {
    var isEnabled: Bool

    func body(content: Content) -> some View {
        content
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isEnabled ? Color.tamizhiSaffron : Color.tamizhiSecondary)
            .cornerRadius(14)
            .animation(.easeInOut(duration: 0.2), value: isEnabled)
    }
}

/// Glow effect using shadow
struct GlowModifier: ViewModifier {
    let color: Color
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(0.6), radius: radius / 2)
            .shadow(color: color.opacity(0.3), radius: radius)
    }
}

/// Conditionally apply a modifier
struct ConditionalModifier<M: ViewModifier>: ViewModifier {
    let condition: Bool
    let modifier: M

    func body(content: Content) -> some View {
        Group {
            if condition {
                content.modifier(modifier)
            } else {
                content
            }
        }
    }
}

// MARK: - View Extensions

extension View {
    /// Apply the Tamizhi card style
    func tamizhiCard(cornerRadius: CGFloat = 16, padding: CGFloat = 16) -> some View {
        modifier(TamizhiCardModifier(cornerRadius: cornerRadius, padding: padding))
    }

    /// Apply the Tamizhi primary button style
    func tamizhiButton(isEnabled: Bool = true) -> some View {
        modifier(TamizhiButtonModifier(isEnabled: isEnabled))
    }

    /// Add a coloured glow shadow
    func glowEffect(color: Color = .tamizhiSaffron, radius: CGFloat = 12) -> some View {
        modifier(GlowModifier(color: color, radius: radius))
    }

    /// Conditionally apply any ViewModifier
    func conditionalModifier<M: ViewModifier>(_ condition: Bool, _ modifier: M) -> some View {
        self.modifier(ConditionalModifier(condition: condition, modifier: modifier))
    }

    /// Hide the view without removing it from the layout
    func hidden(_ shouldHide: Bool) -> some View {
        opacity(shouldHide ? 0 : 1)
    }

    /// Rounded corner on specific corners
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }

    /// Show a loading overlay
    func loadingOverlay(_ isLoading: Bool) -> some View {
        overlay {
            if isLoading {
                ZStack {
                    Color.tamizhiBackground.opacity(0.6)
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .tamizhiSaffron))
                        .scaleEffect(1.5)
                }
            }
        }
    }
}

// MARK: - Custom Shapes

struct RoundedCorner: Shape {
    var radius: CGFloat = 0
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Button Styles

struct TamizhiPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                isEnabled
                    ? Color.tamizhiSaffron.opacity(configuration.isPressed ? 0.8 : 1.0)
                    : Color.tamizhiSecondary
            )
            .cornerRadius(14)
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2), value: configuration.isPressed)
    }
}

struct TamizhiSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundColor(.tamizhiSaffron)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.tamizhiSurface)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.tamizhiSaffron, lineWidth: 1.5)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == TamizhiPrimaryButtonStyle {
    static var tamizhiPrimary: TamizhiPrimaryButtonStyle { .init() }
}

extension ButtonStyle where Self == TamizhiSecondaryButtonStyle {
    static var tamizhiSecondary: TamizhiSecondaryButtonStyle { .init() }
}
