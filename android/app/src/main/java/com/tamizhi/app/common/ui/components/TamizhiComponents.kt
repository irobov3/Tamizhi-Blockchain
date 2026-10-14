package com.tamizhi.app.common.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface

// ── Primary Button ─────────────────────────────────────────────────────────────

@Composable
fun TamizhiButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(52.dp),
        enabled = enabled && !loading,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = TamizhiSaffron,
            contentColor = Color.White,
            disabledContainerColor = TamizhiSaffron.copy(alpha = 0.38f),
            disabledContentColor = Color.White.copy(alpha = 0.38f)
        )
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = Color.White,
                strokeWidth = 2.dp
            )
            Spacer(Modifier.width(8.dp))
        }
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
        )
    }
}

// ── Outlined Button ────────────────────────────────────────────────────────────

@Composable
fun TamizhiOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(52.dp),
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.5.dp, TamizhiSaffron),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = TamizhiSaffron,
            disabledContentColor = TamizhiSaffron.copy(alpha = 0.38f)
        )
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp
            )
        )
    }
}

// ── Text Field ─────────────────────────────────────────────────────────────────

@Composable
fun TamizhiTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    isError: Boolean = false,
    errorText: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    trailingIcon: @Composable (() -> Unit)? = null,
    singleLine: Boolean = true,
    maxLines: Int = 1,
    placeholder: String? = null,
    enabled: Boolean = true,
    onImeAction: (() -> Unit)? = null
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            modifier = Modifier.fillMaxWidth(),
            isError = isError,
            singleLine = singleLine,
            maxLines = maxLines,
            enabled = enabled,
            placeholder = if (placeholder != null) {
                { Text(placeholder, color = TamizhiOnSurface.copy(alpha = 0.4f)) }
            } else null,
            trailingIcon = trailingIcon,
            keyboardOptions = KeyboardOptions(
                keyboardType = keyboardType,
                imeAction = imeAction
            ),
            keyboardActions = KeyboardActions(
                onDone = { onImeAction?.invoke() },
                onNext = { onImeAction?.invoke() },
                onGo = { onImeAction?.invoke() },
                onSearch = { onImeAction?.invoke() },
                onSend = { onImeAction?.invoke() }
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
        if (isError && !errorText.isNullOrBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = errorText,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

// ── Card ───────────────────────────────────────────────────────────────────────

@Composable
fun TamizhiCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit
) {
    Card(
        modifier = if (onClick != null) modifier.clickable(onClick = onClick) else modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = TamizhiSurface),
        border = BorderStroke(1.dp, TamizhiSaffron.copy(alpha = 0.3f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        content()
    }
}

// ── Address Badge ──────────────────────────────────────────────────────────────

@Composable
fun AddressBadge(
    address: String,
    modifier: Modifier = Modifier
) {
    val truncated = if (address.length > 20) {
        "${address.take(8)}...${address.takeLast(6)}"
    } else address

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = TamizhiNavy,
        border = BorderStroke(1.dp, TamizhiSaffron.copy(alpha = 0.4f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = truncated,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.Medium
                ),
                color = TamizhiGold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Icon(
                imageVector = Icons.Filled.ContentCopy,
                contentDescription = "Copy address",
                modifier = Modifier.size(12.dp),
                tint = TamizhiGold.copy(alpha = 0.7f)
            )
        }
    }
}

// ── Status Badge ───────────────────────────────────────────────────────────────

private val StatusConfirmed = Color(0xFF4CAF50)
private val StatusPending = Color(0xFFFFB300)
private val StatusFailed = Color(0xFFE53935)

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val (bgColor, label) = when (status.uppercase()) {
        "CONFIRMED", "SUCCESS", "SENT", "DELIVERED", "READ" ->
            StatusConfirmed.copy(alpha = 0.15f) to status.uppercase()
        "PENDING", "SENDING" ->
            StatusPending.copy(alpha = 0.15f) to status.uppercase()
        else ->
            StatusFailed.copy(alpha = 0.15f) to status.uppercase()
    }
    val textColor = when (status.uppercase()) {
        "CONFIRMED", "SUCCESS", "SENT", "DELIVERED", "READ" -> StatusConfirmed
        "PENDING", "SENDING" -> StatusPending
        else -> StatusFailed
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(6.dp),
        color = bgColor
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = textColor
        )
    }
}

// ── Loading Spinner ────────────────────────────────────────────────────────────

@Composable
fun LoadingSpinner(modifier: Modifier = Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            color = TamizhiSaffron,
            strokeWidth = 3.dp
        )
    }
}

// ── Error Snackbar ─────────────────────────────────────────────────────────────

@Composable
fun ErrorSnackbar(
    message: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Snackbar(
        modifier = modifier,
        action = {
            TextButton(onClick = onDismiss) {
                Text(
                    text = "Dismiss",
                    color = TamizhiGold
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.errorContainer,
        contentColor = MaterialTheme.colorScheme.onErrorContainer,
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

// ── Section Header ─────────────────────────────────────────────────────────────

@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier
) {
    Text(
        text = title,
        modifier = modifier,
        style = MaterialTheme.typography.titleSmall.copy(
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.8.sp
        ),
        color = TamizhiGold
    )
}

// ── Tamizhi Divider ────────────────────────────────────────────────────────────

@Composable
fun TamizhiDivider(modifier: Modifier = Modifier) {
    Divider(
        modifier = modifier,
        thickness = 0.5.dp,
        color = TamizhiOnSurface.copy(alpha = 0.12f)
    )
}
