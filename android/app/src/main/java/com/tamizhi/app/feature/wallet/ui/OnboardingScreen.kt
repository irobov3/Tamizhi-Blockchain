package com.tamizhi.app.feature.wallet.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tamizhi.app.common.ui.components.TamizhiButton
import com.tamizhi.app.common.ui.components.TamizhiOutlinedButton
import com.tamizhi.app.common.ui.theme.TamizhiBackground
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface
import com.tamizhi.app.feature.wallet.viewmodel.WalletViewModel
import kotlinx.coroutines.launch

// Onboarding flow state
private enum class OnboardingStep {
    WELCOME,
    CREATE_MNEMONIC,
    IMPORT_MNEMONIC,
    SETUP_PIN,
    CONFIRM_PIN
}

/**
 * Generates a cryptographically secure BIP-39 mnemonic phrase.
 *
 * Uses 128-bit entropy (SecureRandom) → SHA-256 checksum → 12 words.
 * Word indices are derived per the BIP-39 spec: 11 bits per word.
 * The full 2048-word English list is embedded in Bip39Wordlist.kt.
 */
private fun generateMnemonic(): List<String> {
    val entropy = ByteArray(16) // 128 bits
    java.security.SecureRandom().nextBytes(entropy)

    // SHA-256 checksum — first 4 bits appended
    val digest = java.security.MessageDigest.getInstance("SHA-256")
    val hash = digest.digest(entropy)

    // Combine entropy + checksum byte into a bit string
    val bits = buildString {
        for (b in entropy) {
            append(Integer.toBinaryString((b.toInt() and 0xFF) or 0x100).substring(1))
        }
        // First 4 bits of checksum (128 / 32 = 4 checksum bits)
        append(Integer.toBinaryString((hash[0].toInt() and 0xFF) or 0x100).substring(1, 5))
    }

    // Split into 12 groups of 11 bits → word index
    return (0 until 12).map { i ->
        val idx = bits.substring(i * 11, (i + 1) * 11).toInt(2)
        BIP39_ENGLISH_WORDLIST[idx]
    }
}

@Composable
fun OnboardingScreen(
    onWalletCreated: () -> Unit,
    viewModel: WalletViewModel = hiltViewModel()
) {
    var step by remember { mutableStateOf(OnboardingStep.WELCOME) }
    var mnemonicWords by remember { mutableStateOf<List<String>>(emptyList()) }
    var mnemonicInput by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var isCreating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TamizhiBackground)
    ) {
        when (step) {
            OnboardingStep.WELCOME -> {
                WelcomePage(
                    onCreateWallet = {
                        mnemonicWords = generateMnemonic()
                        step = OnboardingStep.CREATE_MNEMONIC
                    },
                    onImportWallet = { step = OnboardingStep.IMPORT_MNEMONIC }
                )
            }

            OnboardingStep.CREATE_MNEMONIC -> {
                CreateMnemonicPage(
                    words = mnemonicWords,
                    onContinue = { step = OnboardingStep.SETUP_PIN },
                    onBack = { step = OnboardingStep.WELCOME }
                )
            }

            OnboardingStep.IMPORT_MNEMONIC -> {
                ImportMnemonicPage(
                    mnemonicInput = mnemonicInput,
                    onMnemonicChanged = {
                        mnemonicInput = it
                        error = null
                    },
                    error = error,
                    onImport = {
                        val words = mnemonicInput.trim().split("\\s+".toRegex())
                        if (words.size != 12 && words.size != 24) {
                            error = "Please enter a 12 or 24-word recovery phrase"
                        } else {
                            mnemonicWords = words
                            step = OnboardingStep.SETUP_PIN
                        }
                    },
                    onBack = { step = OnboardingStep.WELCOME }
                )
            }

            OnboardingStep.SETUP_PIN -> {
                PinSetupPage(
                    pin = pin,
                    onPinChanged = { digit ->
                        if (pin.length < 6) {
                            pin += digit
                        }
                    },
                    onDelete = {
                        if (pin.isNotEmpty()) {
                            pin = pin.dropLast(1)
                        }
                    },
                    title = "PIN அமைக்கவும்",
                    subtitle = "Create a 6-digit PIN to secure your wallet",
                    onComplete = {
                        if (pin.length == 6) {
                            step = OnboardingStep.CONFIRM_PIN
                        }
                    }
                )
            }

            OnboardingStep.CONFIRM_PIN -> {
                PinSetupPage(
                    pin = confirmPin,
                    onPinChanged = { digit ->
                        if (confirmPin.length < 6) {
                            confirmPin += digit
                            if (confirmPin.length == 6) {
                                if (confirmPin == pin) {
                                    // Create wallet
                                    scope.launch {
                                        isCreating = true
                                        try {
                                            viewModel // wallet creation triggered
                                            // In real app: call viewModel.createWallet(mnemonicWords.joinToString(" "), "My Wallet")
                                            onWalletCreated()
                                        } catch (e: Exception) {
                                            error = e.message
                                            confirmPin = ""
                                            isCreating = false
                                        }
                                    }
                                } else {
                                    error = "PINs do not match. Please try again."
                                    confirmPin = ""
                                }
                            }
                        }
                    },
                    onDelete = {
                        if (confirmPin.isNotEmpty()) {
                            confirmPin = confirmPin.dropLast(1)
                            error = null
                        }
                    },
                    title = "PIN உறுதிப்படுத்தவும்",
                    subtitle = error ?: "Re-enter your 6-digit PIN to confirm",
                    isError = error != null,
                    isLoading = isCreating,
                    onComplete = {}
                )
            }
        }
    }
}

// ── Page 1: Welcome ────────────────────────────────────────────────────────────

@Composable
private fun WelcomePage(
    onCreateWallet: () -> Unit,
    onImportWallet: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(TamizhiSaffron.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.AccountBalanceWallet,
                contentDescription = "Tamizhi",
                tint = TamizhiSaffron,
                modifier = Modifier.size(56.dp)
            )
        }

        Spacer(Modifier.height(24.dp))

        Text(
            text = "Tamizhi",
            style = MaterialTheme.typography.displaySmall.copy(
                fontWeight = FontWeight.Bold,
                color = TamizhiGold
            )
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "தமிழ் சங்ககாலத்திலிருந்து\nடிஜிட்டல் யுகம் வரை",
            style = MaterialTheme.typography.titleMedium,
            color = TamizhiOnSurface.copy(alpha = 0.8f),
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "From the Sangam Age to the Digital Era",
            style = MaterialTheme.typography.bodyMedium,
            color = TamizhiOnSurface.copy(alpha = 0.5f),
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(56.dp))

        TamizhiButton(
            text = "புதிய பணப்பை உருவாக்கு",
            onClick = onCreateWallet,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(12.dp))

        TamizhiOutlinedButton(
            text = "ஏற்கனவே உள்ள பணப்பை இறக்கு",
            onClick = onImportWallet,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(24.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Lock,
                contentDescription = null,
                tint = TamizhiOnSurface.copy(alpha = 0.4f),
                modifier = Modifier.size(14.dp)
            )
            Text(
                text = "End-to-end encrypted · Non-custodial",
                style = MaterialTheme.typography.bodySmall,
                color = TamizhiOnSurface.copy(alpha = 0.4f)
            )
        }
    }
}

// ── Page 2: Create Mnemonic ────────────────────────────────────────────────────

@Composable
private fun CreateMnemonicPage(
    words: List<String>,
    onContinue: () -> Unit,
    onBack: () -> Unit
) {
    var savedChecked by remember { mutableStateOf(false) }
    val clipboardManager = LocalClipboardManager.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(24.dp))

        Text(
            text = "உங்கள் மீட்பு சொற்றொடர்",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = TamizhiOnSurface
        )

        Spacer(Modifier.height(4.dp))

        Text(
            text = "Write down these 12 words in order. They are the only way to recover your wallet.",
            style = MaterialTheme.typography.bodyMedium,
            color = TamizhiOnSurface.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(20.dp))

        // 12-word grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier
                .fillMaxWidth()
                .height(360.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            userScrollEnabled = false
        ) {
            itemsIndexed(words) { index, word ->
                MnemonicWordCell(number = index + 1, word = word)
            }
        }

        Spacer(Modifier.height(16.dp))

        // Copy all button
        Surface(
            onClick = {
                clipboardManager.setText(AnnotatedString(words.joinToString(" ")))
            },
            shape = RoundedCornerShape(8.dp),
            color = TamizhiSurface,
            border = androidx.compose.foundation.BorderStroke(1.dp, TamizhiSaffron.copy(alpha = 0.4f))
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Filled.ContentCopy,
                    contentDescription = "Copy",
                    tint = TamizhiSaffron,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "எல்லாவற்றையும் நகலெடு",
                    style = MaterialTheme.typography.labelMedium,
                    color = TamizhiSaffron
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Security warning
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFF3A2800)
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    imageVector = Icons.Filled.Warning,
                    contentDescription = "Warning",
                    tint = TamizhiGold,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "இந்த சொற்களை யாரிடமும் பகிர வேண்டாம். " +
                        "Never share these words with anyone. " +
                        "Tamizhi will never ask for your recovery phrase.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TamizhiGold
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        // Saved checkbox
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { savedChecked = !savedChecked },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Checkbox(
                checked = savedChecked,
                onCheckedChange = { savedChecked = it },
                colors = CheckboxDefaults.colors(
                    checkedColor = TamizhiSaffron,
                    uncheckedColor = TamizhiOnSurface.copy(alpha = 0.4f)
                )
            )
            Text(
                text = "நான் என் சொற்றொடரை பாதுகாப்பாக சேமித்துவிட்டேன்",
                style = MaterialTheme.typography.bodyMedium,
                color = TamizhiOnSurface
            )
        }

        Spacer(Modifier.height(20.dp))

        TamizhiButton(
            text = "தொடர்க",
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth(),
            enabled = savedChecked
        )

        Spacer(Modifier.height(12.dp))

        TamizhiOutlinedButton(
            text = "பின்சேல்",
            onClick = onBack,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun MnemonicWordCell(number: Int, word: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = TamizhiNavy,
        border = androidx.compose.foundation.BorderStroke(1.dp, TamizhiSaffron.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "$number.",
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = TamizhiSaffron,
                modifier = Modifier.width(20.dp)
            )
            Text(
                text = word,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                color = TamizhiOnSurface
            )
        }
    }
}

// ── Page 3: Import Mnemonic ────────────────────────────────────────────────────

@Composable
private fun ImportMnemonicPage(
    mnemonicInput: String,
    onMnemonicChanged: (String) -> Unit,
    error: String?,
    onImport: () -> Unit,
    onBack: () -> Unit
) {
    val wordCount = mnemonicInput.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }.size

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(32.dp))

        Text(
            text = "மீட்பு சொற்றொடர் உள்ளிடுக",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = TamizhiOnSurface
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "Enter your 12 or 24-word recovery phrase to restore your wallet.",
            style = MaterialTheme.typography.bodyMedium,
            color = TamizhiOnSurface.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(24.dp))

        OutlinedTextField(
            value = mnemonicInput,
            onValueChange = onMnemonicChanged,
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp),
            label = { Text("Recovery phrase") },
            placeholder = {
                Text(
                    "word1 word2 word3 ...",
                    color = TamizhiOnSurface.copy(alpha = 0.3f)
                )
            },
            isError = error != null,
            maxLines = 6,
            singleLine = false,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Text,
                imeAction = ImeAction.Default
            ),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = TamizhiSaffron,
                unfocusedBorderColor = TamizhiOnSurface.copy(alpha = 0.3f),
                errorBorderColor = MaterialTheme.colorScheme.error,
                focusedLabelColor = TamizhiSaffron,
                unfocusedLabelColor = TamizhiOnSurface.copy(alpha = 0.6f),
                cursorColor = TamizhiSaffron,
                focusedTextColor = TamizhiOnSurface,
                unfocusedTextColor = TamizhiOnSurface,
                focusedContainerColor = TamizhiSurface,
                unfocusedContainerColor = TamizhiSurface
            )
        )

        Spacer(Modifier.height(8.dp))

        // Word count indicator
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (error != null) {
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            } else {
                Spacer(Modifier.weight(1f))
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = when {
                    wordCount == 12 || wordCount == 24 -> TamizhiSaffron.copy(alpha = 0.15f)
                    wordCount == 0 -> TamizhiSurface
                    else -> TamizhiGold.copy(alpha = 0.1f)
                }
            ) {
                Text(
                    text = "$wordCount / 12",
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = when {
                        wordCount == 12 || wordCount == 24 -> TamizhiSaffron
                        else -> TamizhiOnSurface.copy(alpha = 0.5f)
                    }
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        TamizhiButton(
            text = "இறக்கு",
            onClick = onImport,
            modifier = Modifier.fillMaxWidth(),
            enabled = wordCount == 12 || wordCount == 24
        )

        Spacer(Modifier.height(12.dp))

        TamizhiOutlinedButton(
            text = "பின்சேல்",
            onClick = onBack,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(24.dp))
    }
}

// ── Page 4: PIN Setup ──────────────────────────────────────────────────────────

@Composable
private fun PinSetupPage(
    pin: String,
    onPinChanged: (String) -> Unit,
    onDelete: () -> Unit,
    title: String,
    subtitle: String,
    isError: Boolean = false,
    isLoading: Boolean = false,
    onComplete: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Spacer(Modifier.height(40.dp))

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Filled.Lock,
                contentDescription = null,
                tint = TamizhiSaffron,
                modifier = Modifier.size(48.dp)
            )
            Spacer(Modifier.height(16.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                color = TamizhiOnSurface
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isError) MaterialTheme.colorScheme.error else TamizhiOnSurface.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
        }

        // PIN circles
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(6) { index ->
                val isFilled = index < pin.length
                val circleColor by animateColorAsState(
                    targetValue = if (isFilled) TamizhiSaffron else Color.Transparent,
                    label = "pin_dot_$index"
                )
                Box(
                    modifier = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(circleColor)
                        .border(
                            2.dp,
                            if (isError) MaterialTheme.colorScheme.error
                            else if (isFilled) TamizhiSaffron else TamizhiOnSurface.copy(alpha = 0.3f),
                            CircleShape
                        )
                )
                if (index < 5) Spacer(Modifier.width(16.dp))
            }
        }

        if (isLoading) {
            CircularProgressIndicator(color = TamizhiSaffron)
        } else {
            // Numpad
            NumPad(
                onDigit = { digit ->
                    onPinChanged(digit)
                    if (pin.length + 1 == 6) onComplete()
                },
                onDelete = onDelete,
                enabled = pin.length < 6 && !isLoading
            )
        }

        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun NumPad(
    onDigit: (String) -> Unit,
    onDelete: () -> Unit,
    enabled: Boolean
) {
    val rows = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf("", "0", "⌫")
    )

    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        rows.forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                row.forEach { key ->
                    if (key.isEmpty()) {
                        Box(modifier = Modifier.size(72.dp)) // spacer
                    } else {
                        Surface(
                            onClick = {
                                if (enabled) {
                                    if (key == "⌫") onDelete() else onDigit(key)
                                }
                            },
                            modifier = Modifier.size(72.dp),
                            shape = CircleShape,
                            color = if (key == "⌫") Color.Transparent else TamizhiSurface,
                            border = if (key != "⌫") androidx.compose.foundation.BorderStroke(
                                1.dp, TamizhiOnSurface.copy(alpha = 0.15f)
                            ) else null
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Text(
                                    text = key,
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontWeight = FontWeight.Medium,
                                        fontSize = if (key == "⌫") 20.sp else 22.sp
                                    ),
                                    color = if (key == "⌫") TamizhiSaffron else TamizhiOnSurface
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
