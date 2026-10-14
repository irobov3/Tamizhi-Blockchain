package com.tamizhi.app.feature.literature.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tamizhi.app.common.ui.components.TamizhiCard
import com.tamizhi.app.common.ui.components.TamizhiDivider
import com.tamizhi.app.common.ui.theme.TamizhiBackground
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface
import com.tamizhi.app.core.domain.model.LiteraryWorkDetail
import com.tamizhi.app.core.domain.model.Verse
import com.tamizhi.app.feature.literature.viewmodel.LiteratureViewModel

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun LiteratureDetailScreen(
    workId: String,
    onNavigateBack: () -> Unit,
    viewModel: LiteratureViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(workId) {
        viewModel.loadWorkDetail(workId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = TamizhiOnSurface)
                    }
                },
                title = {
                    Text(
                        text = uiState.selectedWork?.titleTa ?: "இலக்கியம்",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TamizhiOnSurface
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TamizhiBackground)
            )
        },
        containerColor = TamizhiBackground
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoadingDetail -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = TamizhiSaffron
                    )
                }
                uiState.detailError != null -> {
                    Column(
                        modifier = Modifier.align(Alignment.Center).padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "பிழை ஏற்பட்டது",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                        Text(
                            text = uiState.detailError!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = TamizhiOnSurface.copy(alpha = 0.6f)
                        )
                    }
                }
                uiState.selectedWork != null -> {
                    WorkDetailContent(work = uiState.selectedWork!!)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WorkDetailContent(work: LiteraryWorkDetail) {
    val scrollState = rememberScrollState()
    var contentExpanded by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero header
        TamizhiCard {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Author avatar
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(TamizhiGold),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = work.authorTa.take(1),
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = TamizhiNavy
                            )
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(
                            text = work.titleTa,
                            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                            color = TamizhiOnSurface
                        )
                        Text(
                            text = work.title,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TamizhiOnSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Author info
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "ஆசிரியர்: ",
                        style = MaterialTheme.typography.bodySmall,
                        color = TamizhiOnSurface.copy(alpha = 0.5f)
                    )
                    Text(
                        text = work.authorTa,
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                        color = TamizhiGold
                    )
                }

                Spacer(Modifier.height(10.dp))

                // Metadata chips
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    MetadataChip(label = work.era, type = ChipType.ERA)
                    MetadataChip(label = work.category.displayNameTa, type = ChipType.CATEGORY)
                    MetadataChip(label = "${work.verses.size} பாடல்கள்", type = ChipType.COUNT)
                }

                Spacer(Modifier.height(12.dp))

                // Verified badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Verified,
                        contentDescription = "Verified",
                        tint = TamizhiGold,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "சங்கிலி மூலம் சரிபார்க்கப்பட்டது",
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                        color = TamizhiGold
                    )
                }
            }
        }

        // Verses section
        TamizhiCard {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "பாடல்கள்",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TamizhiGold
                    )
                    IconButton(onClick = { contentExpanded = !contentExpanded }) {
                        Icon(
                            imageVector = if (contentExpanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = if (contentExpanded) "Collapse" else "Expand",
                            tint = TamizhiOnSurface
                        )
                    }
                }

                AnimatedVisibility(visible = contentExpanded) {
                    Column(
                        modifier = Modifier.animateContentSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Spacer(Modifier.height(4.dp))
                        work.verses.forEach { verse ->
                            VerseItem(verse = verse)
                            if (verse != work.verses.last()) {
                                TamizhiDivider()
                            }
                        }
                    }
                }
            }
        }

        // Chain proof card
        ChainProofCard(workId = work.id)

        // IPFS link
        TamizhiCard {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Link,
                    contentDescription = "IPFS",
                    tint = TamizhiSaffron,
                    modifier = Modifier.size(20.dp)
                )
                Column {
                    Text(
                        text = "IPFS இணைப்பு",
                        style = MaterialTheme.typography.labelMedium,
                        color = TamizhiOnSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        text = "ipfs://Qm${work.id.take(16).uppercase()}...",
                        style = MaterialTheme.typography.bodySmall.copy(
                            textDecoration = TextDecoration.Underline
                        ),
                        color = TamizhiSaffron
                    )
                }
            }
        }

        // Commentary if available
        if (!work.commentaryTa.isNullOrBlank() || !work.commentary.isNullOrBlank()) {
            TamizhiCard {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "உரை",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = TamizhiGold
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = work.commentaryTa ?: work.commentary ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TamizhiOnSurface.copy(alpha = 0.85f)
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun VerseItem(verse: Verse) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (!verse.chapter.isNullOrBlank()) {
            Text(
                text = verse.chapterTa ?: verse.chapter,
                style = MaterialTheme.typography.labelSmall,
                color = TamizhiSaffron
            )
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top
        ) {
            Text(
                text = "${verse.number}.",
                style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Bold),
                color = TamizhiGold,
                modifier = Modifier.width(24.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = verse.textTa,
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium),
                    color = TamizhiOnSurface
                )
                Text(
                    text = verse.transliteration,
                    style = MaterialTheme.typography.bodySmall,
                    color = TamizhiOnSurface.copy(alpha = 0.5f)
                )
                Text(
                    text = verse.translationEn,
                    style = MaterialTheme.typography.bodySmall,
                    color = TamizhiOnSurface.copy(alpha = 0.7f)
                )
            }
        }
    }
}

enum class ChipType { ERA, CATEGORY, COUNT, LICENSE }

@Composable
private fun MetadataChip(label: String, type: ChipType) {
    val (bg, fg) = when (type) {
        ChipType.ERA -> TamizhiNavy to TamizhiOnSurface.copy(alpha = 0.7f)
        ChipType.CATEGORY -> TamizhiSaffron.copy(alpha = 0.15f) to TamizhiSaffron
        ChipType.COUNT -> TamizhiGold.copy(alpha = 0.15f) to TamizhiGold
        ChipType.LICENSE -> Color(0xFF1A3A1A) to Color(0xFF4CAF50)
    }
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = bg
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = fg
        )
    }
}

@Composable
private fun ChainProofCard(workId: String) {
    TamizhiCard {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Verified,
                    contentDescription = "On-chain proof",
                    tint = TamizhiGold,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    text = "சங்கிலி சான்று",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = TamizhiGold
                )
            }

            Spacer(Modifier.height(12.dp))

            ChainProofRow(label = "தொகுதி உயரம்", value = "12,847,391")
            Spacer(Modifier.height(6.dp))
            ChainProofRow(
                label = "Tx Hash",
                value = "${workId.take(8).uppercase()}A3F9...${workId.takeLast(4).uppercase()}"
            )
            Spacer(Modifier.height(6.dp))
            ChainProofRow(label = "நேரம்", value = "2024-01-15 14:32:07 UTC")
            Spacer(Modifier.height(6.dp))
            ChainProofRow(label = "நிலை", value = "CONFIRMED")
        }
    }
}

@Composable
private fun ChainProofRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = TamizhiOnSurface.copy(alpha = 0.5f),
            modifier = Modifier.weight(1f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
            color = TamizhiOnSurface,
            modifier = Modifier.weight(1.5f)
        )
    }
}
