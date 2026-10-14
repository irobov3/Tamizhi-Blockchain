package com.tamizhi.app.feature.ai.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tamizhi.app.common.ui.theme.TamizhiBackground
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface

private val examplePrompts = listOf(
    "திருக்குறளின் முதல் அதிகாரம் என்ன?",
    "சங்க இலக்கியம் பற்றி சொல்லுங்கள்",
    "தமிழ் மொழியின் வரலாறு",
    "What is Thirukural?",
    "Explain Sangam literature",
    "Famous Tamil poets"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AIScreen(viewModel: AIViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(uiState.messages.size, uiState.isLoading) {
        if (uiState.messages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.SmartToy,
                            contentDescription = null,
                            tint = TamizhiSaffron,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Tamizhi AI",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = TamizhiOnSurface
                            )
                            Text(
                                text = if (uiState.language == "ta") "தமிழ் முறை" else "English mode",
                                style = MaterialTheme.typography.labelSmall,
                                color = TamizhiOnSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(
                        onClick = { viewModel.toggleLanguage() },
                        colors = IconButtonDefaults.iconButtonColors(containerColor = TamizhiSurface)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Language,
                                contentDescription = "Toggle language",
                                tint = TamizhiGold,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(2.dp))
                            Text(
                                text = if (uiState.language == "ta") "TA" else "EN",
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = TamizhiGold,
                                fontSize = 10.sp
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TamizhiBackground)
            )
        },
        containerColor = TamizhiBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .imePadding()
        ) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                state = listState,
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                if (uiState.messages.isEmpty()) {
                    item {
                        WelcomeSection(
                            language = uiState.language,
                            onPromptClick = { viewModel.sendMessage(it) }
                        )
                    }
                } else {
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(bottom = 8.dp)
                        ) {
                            items(examplePrompts) { prompt ->
                                AssistChip(
                                    onClick = { viewModel.sendMessage(prompt) },
                                    label = {
                                        Text(
                                            text = prompt,
                                            maxLines = 1,
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                    },
                                    colors = AssistChipDefaults.assistChipColors(
                                        containerColor = TamizhiSurface,
                                        labelColor = TamizhiOnSurface
                                    ),
                                    border = AssistChipDefaults.assistChipBorder(
                                        borderColor = TamizhiSaffron.copy(alpha = 0.4f)
                                    )
                                )
                            }
                        }
                    }
                }

                items(uiState.messages, key = { it.id }) { message ->
                    AiMessageBubble(message = message)
                }

                if (uiState.isLoading) {
                    item { AiLoadingBubble() }
                }

                if (uiState.error != null) {
                    item {
                        Text(
                            text = "பிழை: ${uiState.error}",
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            AiInputBar(
                text = uiState.inputText,
                onTextChange = { viewModel.onInputChanged(it) },
                onSend = { viewModel.sendMessage() },
                isLoading = uiState.isLoading,
                language = uiState.language
            )
        }
    }
}

@Composable
private fun WelcomeSection(language: String, onPromptClick: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(TamizhiSaffron.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.SmartToy,
                contentDescription = null,
                tint = TamizhiSaffron,
                modifier = Modifier.size(48.dp)
            )
        }

        Text(
            text = if (language == "ta") "வணக்கம்! நான் Tamizhi AI" else "Hello! I'm Tamizhi AI",
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            color = TamizhiOnSurface
        )
        Text(
            text = if (language == "ta") {
                "தமிழ் இலக்கியம், கலாச்சாரம் மற்றும் வரலாறு பற்றி கேட்கலாம்"
            } else {
                "Ask me about Tamil literature, culture, and history"
            },
            style = MaterialTheme.typography.bodyMedium,
            color = TamizhiOnSurface.copy(alpha = 0.7f)
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = if (language == "ta") "உதாரண கேள்விகள்" else "Example questions",
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
            color = TamizhiGold
        )

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            examplePrompts.take(3).forEach { prompt ->
                Surface(
                    onClick = { onPromptClick(prompt) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = TamizhiSurface,
                    border = BorderStroke(1.dp, TamizhiSaffron.copy(alpha = 0.3f))
                ) {
                    Text(
                        text = prompt,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = TamizhiOnSurface
                    )
                }
            }
        }
    }
}

@Composable
private fun AiMessageBubble(message: AiMessage) {
    val isUser = message.isUser
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        contentAlignment = if (isUser) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        if (!isUser) {
            Row(
                modifier = Modifier.widthIn(max = 300.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(TamizhiSaffron.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.SmartToy,
                        contentDescription = "AI",
                        tint = TamizhiSaffron,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Column {
                    Text(
                        text = "Tamizhi AI",
                        style = MaterialTheme.typography.labelSmall,
                        color = TamizhiSaffron,
                        modifier = Modifier.padding(bottom = 2.dp)
                    )
                    Surface(
                        shape = RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp),
                        color = TamizhiSurface
                    ) {
                        Text(
                            text = message.content,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TamizhiOnSurface
                        )
                    }
                }
            }
        } else {
            Surface(
                shape = RoundedCornerShape(16.dp, 16.dp, 4.dp, 16.dp),
                color = TamizhiSaffron,
                modifier = Modifier.widthIn(max = 280.dp)
            ) {
                Text(
                    text = message.content,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
private fun AiLoadingBubble() {
    val infiniteTransition = rememberInfiniteTransition(label = "ai_loading")
    Row(
        modifier = Modifier
            .padding(start = 52.dp, end = 40.dp, top = 4.dp, bottom = 4.dp)
            .background(TamizhiSurface, RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(3) { index ->
            val scale by infiniteTransition.animateFloat(
                initialValue = 0.6f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(500, delayMillis = index * 166, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "ai_dot_$index"
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .scale(scale)
                    .background(TamizhiSaffron.copy(alpha = 0.6f), CircleShape)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AiInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    isLoading: Boolean,
    language: String
) {
    Surface(color = TamizhiSurface, tonalElevation = 4.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier.weight(1f),
                placeholder = {
                    Text(
                        text = if (language == "ta") "கேள்வி கேளுங்கள்..." else "Ask a question...",
                        color = TamizhiOnSurface.copy(alpha = 0.4f)
                    )
                },
                maxLines = 4,
                singleLine = false,
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Sentences,
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Default
                ),
                shape = RoundedCornerShape(24.dp),
                colors = TextFieldDefaults.colors(
                    focusedTextColor = TamizhiOnSurface,
                    unfocusedTextColor = TamizhiOnSurface,
                    focusedContainerColor = TamizhiNavy,
                    unfocusedContainerColor = TamizhiNavy,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    cursorColor = TamizhiSaffron
                )
            )
            IconButton(
                onClick = onSend,
                enabled = text.isNotBlank() && !isLoading,
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = if (text.isNotBlank() && !isLoading) TamizhiSaffron
                        else TamizhiSaffron.copy(alpha = 0.3f),
                        shape = CircleShape
                    )
            ) {
                Icon(
                    imageVector = Icons.Filled.Send,
                    contentDescription = "Send",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
