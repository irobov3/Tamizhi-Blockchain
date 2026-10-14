package com.tamizhi.app.common.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val TamizhiSaffron = Color(0xFFE8500A)
val TamizhiNavy = Color(0xFF1A1A2E)
val TamizhiGold = Color(0xFFF5C518)
val TamizhiBackground = Color(0xFF0D0D1A)
val TamizhiSurface = Color(0xFF16213E)
val TamizhiOnSurface = Color(0xFFE8E8F0)
val TamizhiError = Color(0xFFCF6679)

private val DarkColorScheme = darkColorScheme(
    primary = TamizhiSaffron,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF8B2E04),
    onPrimaryContainer = Color(0xFFFFDBCC),
    secondary = TamizhiGold,
    onSecondary = TamizhiNavy,
    secondaryContainer = Color(0xFF5C4700),
    onSecondaryContainer = Color(0xFFFFF0B0),
    tertiary = Color(0xFF4FC3F7),
    onTertiary = Color(0xFF003547),
    background = TamizhiBackground,
    onBackground = TamizhiOnSurface,
    surface = TamizhiSurface,
    onSurface = TamizhiOnSurface,
    surfaceVariant = Color(0xFF1E2A4A),
    onSurfaceVariant = Color(0xFFB0B8D0),
    outline = Color(0xFF3A4A6B),
    outlineVariant = Color(0xFF2A3A5B),
    error = TamizhiError,
    onError = Color.White,
    errorContainer = Color(0xFF7A1A2E),
    onErrorContainer = Color(0xFFFFDAE0),
    inverseSurface = TamizhiOnSurface,
    inverseOnSurface = TamizhiBackground,
    inversePrimary = Color(0xFF8B2E04),
    scrim = Color(0xFF000000)
)

@Composable
fun TamizhiTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = TamizhiTypography,
        content = content
    )
}
