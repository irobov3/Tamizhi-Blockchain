package com.tamizhi.app.feature.messenger.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DismissDirection
import androidx.compose.material3.DismissValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismiss
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDismissState
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tamizhi.app.common.ui.components.LoadingSpinner
import com.tamizhi.app.common.ui.components.TamizhiButton
import com.tamizhi.app.common.ui.components.TamizhiTextField
import com.tamizhi.app.common.ui.theme.TamizhiBackground
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface
import com.tamizhi.app.core.domain.model.Conversation
import com.tamizhi.app.feature.messenger.viewmodel.MessengerEvent
import com.tamizhi.app.feature.messenger.viewmodel.MessengerViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationListScreen(
    onConversationClick: (String) -> Unit,
    onNewConversation: () -> Unit,
    viewModel: MessengerViewModel = hiltViewModel()
) {
    val listState by viewModel.listState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showNewConversationSheet by remember { mutableStateOf(false) }
    var newConversationAddress by remember { mutableStateOf("") }
    var addressError by remember { mutableStateOf<String?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Collect one-shot events
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is MessengerEvent.ShowSnackbar -> {
                    snackbarHostState.showSnackbar(event.message)
                }
                is MessengerEvent.NavigateToChat -> {
                    onConversationClick(event.conversationId)
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "செய்திகள்",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TamizhiOnSurface
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = TamizhiBackground
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showNewConversationSheet = true },
                containerColor = TamizhiSaffron,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Filled.Add, contentDescription = "New conversation")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = TamizhiBackground
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                listState.isLoading && listState.conversations.isEmpty() -> {
                    LoadingSpinner(modifier = Modifier.align(Alignment.Center))
                }
                listState.conversations.isEmpty() -> {
                    EmptyConversationsState(modifier = Modifier.align(Alignment.Center))
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(
                            items = listState.conversations,
                            key = { it.id }
                        ) { conversation ->
                            SwipeableConversationItem(
                                conversation = conversation,
                                onClick = { onConversationClick(conversation.id) },
                                onDelete = { viewModel.deleteConversation(conversation.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    // New Conversation Bottom Sheet
    if (showNewConversationSheet) {
        ModalBottomSheet(
            onDismissRequest = {
                showNewConversationSheet = false
                newConversationAddress = ""
                addressError = null
            },
            sheetState = sheetState,
            containerColor = TamizhiSurface,
            modifier = Modifier.imePadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "புதிய உரையாடல்",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = TamizhiOnSurface
                )
                Text(
                    text = "Start a new encrypted conversation",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TamizhiOnSurface.copy(alpha = 0.7f)
                )
                TamizhiTextField(
                    value = newConversationAddress,
                    onValueChange = {
                        newConversationAddress = it
                        addressError = null
                    },
                    label = "Recipient address",
                    placeholder = "tamizhi1...",
                    isError = addressError != null,
                    errorText = addressError,
                    modifier = Modifier.fillMaxWidth()
                )
                TamizhiButton(
                    text = "தொடங்குங்கள்",
                    onClick = {
                        val addr = newConversationAddress.trim()
                        if (addr.isBlank()) {
                            addressError = "Address cannot be empty"
                        } else if (!addr.startsWith("tamizhi1") || addr.length < 20) {
                            addressError = "Invalid Tamizhi address format"
                        } else {
                            scope.launch {
                                showNewConversationSheet = false
                                viewModel.startNewConversation(addr)
                                newConversationAddress = ""
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = newConversationAddress.isNotBlank()
                )
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeableConversationItem(
    conversation: Conversation,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    var isDeleted by remember { mutableStateOf(false) }
    val dismissState = rememberDismissState(
        confirmValueChange = { dismissValue ->
            if (dismissValue == DismissValue.DismissedToStart) {
                isDeleted = true
                onDelete()
                true
            } else false
        }
    )

    AnimatedVisibility(
        visible = !isDeleted,
        exit = shrinkVertically(animationSpec = tween(300)) + fadeOut(animationSpec = tween(300))
    ) {
        SwipeToDismiss(
            state = dismissState,
            directions = setOf(DismissDirection.EndToStart),
            background = {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.errorContainer)
                        .padding(end = 20.dp),
                    contentAlignment = Alignment.CenterEnd
                ) {
                    Icon(
                        imageVector = Icons.Filled.Delete,
                        contentDescription = "Delete conversation",
                        tint = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            },
            dismissContent = {
                ConversationItem(conversation = conversation, onClick = onClick)
            }
        )
    }
}

@Composable
private fun ConversationItem(
    conversation: Conversation,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .background(TamizhiBackground),
        onClick = onClick,
        color = TamizhiBackground
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(TamizhiGold),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = conversation.avatarInitials,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TamizhiNavy
                    )
                )
            }

            // Content
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = conversation.shortAddress,
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = TamizhiOnSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = conversation.lastMessagePreview.ifBlank { "No messages yet" },
                    style = MaterialTheme.typography.bodySmall,
                    color = TamizhiOnSurface.copy(alpha = 0.6f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Right side: time + unread badge
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = formatConversationTime(conversation.lastMessageTimestamp),
                    style = MaterialTheme.typography.labelSmall,
                    color = TamizhiOnSurface.copy(alpha = 0.5f)
                )
                if (conversation.unreadCount > 0) {
                    Badge(
                        containerColor = TamizhiSaffron,
                        contentColor = Color.White
                    ) {
                        Text(
                            text = if (conversation.unreadCount > 99) "99+" else conversation.unreadCount.toString(),
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyConversationsState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = Icons.Filled.Chat,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = TamizhiSaffron.copy(alpha = 0.4f)
        )
        Text(
            text = "நேரடி உரையாடல் தொடங்குங்கள்",
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = TamizhiOnSurface
        )
        Text(
            text = "Start a secure, end-to-end encrypted conversation\nwith any Tamizhi wallet address.",
            style = MaterialTheme.typography.bodyMedium,
            color = TamizhiOnSurface.copy(alpha = 0.6f)
        )
    }
}

private fun formatConversationTime(timestamp: Long): String {
    if (timestamp == 0L) return ""
    val now = System.currentTimeMillis()
    val diff = now - timestamp
    return when {
        diff < 60_000L -> "now"
        diff < 3_600_000L -> "${diff / 60_000}m"
        diff < 86_400_000L -> "${diff / 3_600_000}h"
        diff < 604_800_000L -> SimpleDateFormat("EEE", Locale.getDefault()).format(Date(timestamp))
        else -> SimpleDateFormat("dd/MM", Locale.getDefault()).format(Date(timestamp))
    }
}
