package com.tamizhi.app.feature.wallet.ui

import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.launch
import java.util.concurrent.Executor

private val Saffron = Color(0xFFE8500A)
private val Navy = Color(0xFF1A1A2E)

enum class AmountUnit { TMZ, UTMZ }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SendScreen(
    onNavigateBack: () -> Unit,
    onNavigateScan: () -> Unit,
    prefilledAddress: String = ""
) {
    var toAddress by remember { mutableStateOf(prefilledAddress) }
    var amount by remember { mutableStateOf("") }
    var amountUnit by remember { mutableStateOf(AmountUnit.TMZ) }
    var memo by remember { mutableStateOf("") }
    var showConfirmSheet by remember { mutableStateOf(false) }
    var isSending by remember { mutableStateOf(false) }
    var addressError by remember { mutableStateOf<String?>(null) }
    var amountError by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current

    val gasEstimate = remember(amount, amountUnit) {
        val utmz = when (amountUnit) {
            AmountUnit.TMZ -> (amount.toDoubleOrNull() ?: 0.0) * 1_000_000.0
            AmountUnit.UTMZ -> amount.toLongOrNull()?.toDouble() ?: 0.0
        }
        if (utmz > 0) "~5,000 utmz (≈0.005 TMZ)" else "--"
    }

    fun validate(): Boolean {
        var valid = true
        if (toAddress.isBlank()) {
            addressError = "Address is required"
            valid = false
        } else if (!toAddress.startsWith("tmz1") || toAddress.length < 20) {
            addressError = "Invalid Tamizhi address"
            valid = false
        } else {
            addressError = null
        }
        val amtDouble = amount.toDoubleOrNull()
        if (amtDouble == null || amtDouble <= 0.0) {
            amountError = "Enter a valid amount"
            valid = false
        } else {
            amountError = null
        }
        return valid
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Send TMZ", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Navy,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // To address
            OutlinedTextField(
                value = toAddress,
                onValueChange = { toAddress = it; addressError = null },
                label = { Text("Recipient Address") },
                placeholder = { Text("tmz1...") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = addressError != null,
                supportingText = { addressError?.let { Text(it, color = MaterialTheme.colorScheme.error) } },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                trailingIcon = {
                    IconButton(onClick = onNavigateScan) {
                        Icon(Icons.Default.QrCodeScanner, "Scan QR", tint = Saffron)
                    }
                }
            )

            // Amount + unit toggle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it; amountError = null },
                    label = { Text("Amount") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    isError = amountError != null,
                    supportingText = {
                        amountError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Decimal,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )
                IconButton(
                    onClick = {
                        // Convert amount when toggling units
                        val d = amount.toDoubleOrNull()
                        if (d != null) {
                            amount = when (amountUnit) {
                                AmountUnit.TMZ -> (d * 1_000_000).toLong().toString()
                                AmountUnit.UTMZ -> (d / 1_000_000).toString()
                            }
                        }
                        amountUnit = if (amountUnit == AmountUnit.TMZ) AmountUnit.UTMZ else AmountUnit.TMZ
                    },
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.SwapHoriz, "Toggle unit", tint = Saffron)
                        Text(
                            text = amountUnit.name,
                            style = MaterialTheme.typography.labelSmall,
                            color = Saffron
                        )
                    }
                }
            }

            // Memo
            OutlinedTextField(
                value = memo,
                onValueChange = { memo = it },
                label = { Text("Memo (optional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 2,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
            )

            // Gas estimate
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Estimated Fee", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        text = gasEstimate,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Saffron
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = { if (validate()) showConfirmSheet = true },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Saffron),
                shape = MaterialTheme.shapes.medium
            ) {
                Text("Review & Send", fontWeight = FontWeight.Bold)
            }
        }
    }

    // ── Confirm bottom sheet ──────────────────────────────────────────────────
    if (showConfirmSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showConfirmSheet = false },
            sheetState = sheetState,
            dragHandle = { BottomSheetDefaults.DragHandle() }
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    "Confirm Transaction",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Divider()
                ConfirmRow("To", toAddress)
                ConfirmRow("Amount", "$amount ${amountUnit.name}")
                ConfirmRow("Fee", gasEstimate)
                if (memo.isNotBlank()) ConfirmRow("Memo", memo)
                Divider()
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        showConfirmSheet = false
                        // Trigger biometric auth then broadcast
                        authenticateAndSend(
                            context = context,
                            onSuccess = {
                                isSending = true
                                scope.launch {
                                    // ViewModel.sendTokens() call goes here
                                    snackbarHostState.showSnackbar("Transaction submitted!")
                                    isSending = false
                                    onNavigateBack()
                                }
                            },
                            onError = { msg ->
                                scope.launch {
                                    snackbarHostState.showSnackbar(msg)
                                }
                            }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Saffron)
                ) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = Color.White
                        )
                    } else {
                        Icon(Icons.Default.Fingerprint, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.size(8.dp))
                        Text("Confirm with Biometric", fontWeight = FontWeight.Bold)
                    }
                }
                TextButton(
                    onClick = { showConfirmSheet = false },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel")
                }
            }
        }
    }
}

@Composable
private fun ConfirmRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f, fill = false)
        )
    }
}

private fun authenticateAndSend(
    context: android.content.Context,
    onSuccess: () -> Unit,
    onError: (String) -> Unit
) {
    val executor = Executor { it.run() }
    val activity = context as? FragmentActivity ?: run {
        onSuccess() // Fallback for preview/testing
        return
    }
    val callback = object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            onSuccess()
        }
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            onError("Authentication cancelled: $errString")
        }
        override fun onAuthenticationFailed() {
            onError("Authentication failed")
        }
    }
    val prompt = BiometricPrompt(activity, executor, callback)
    val info = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Confirm Transaction")
        .setSubtitle("Authenticate to send TMZ tokens")
        .setNegativeButtonText("Cancel")
        .build()
    prompt.authenticate(info)
}
