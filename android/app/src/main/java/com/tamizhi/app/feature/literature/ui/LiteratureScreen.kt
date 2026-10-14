package com.tamizhi.app.feature.literature.ui

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tamizhi.app.common.ui.components.StatusBadge
import com.tamizhi.app.common.ui.components.TamizhiCard
import com.tamizhi.app.common.ui.theme.TamizhiBackground
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface
import com.tamizhi.app.core.domain.model.LiteraryCategory
import com.tamizhi.app.core.domain.model.LiteraryWork
import com.tamizhi.app.feature.literature.viewmodel.LiteratureViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiteratureScreen(
    onWorkClick: (String) -> Unit,
    viewModel: LiteratureViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "இலக்கியம்",
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = TamizhiOnSurface
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TamizhiBackground)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* Upload literature */ },
                containerColor = TamizhiSaffron,
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Upload work")
            }
        },
        containerColor = TamizhiBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Search bar
            TextField(
                value = uiState.searchQuery,
                onValueChange = { viewModel.searchWorks(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = {
                    Text(
                        "தேடுங்கள்... Search Tamil literature",
                        color = TamizhiOnSurface.copy(alpha = 0.4f)
                    )
                },
                leadingIcon = {
                    Icon(
                        Icons.Filled.Search,
                        contentDescription = "Search",
                        tint = TamizhiSaffron
                    )
                },
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedTextColor = TamizhiOnSurface,
                    unfocusedTextColor = TamizhiOnSurface,
                    focusedContainerColor = TamizhiSurface,
                    unfocusedContainerColor = TamizhiSurface,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    cursorColor = TamizhiSaffron
                )
            )

            // Category filter chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 4.dp)
            ) {
                // "All" chip
                item {
                    FilterChip(
                        selected = uiState.selectedCategory == null,
                        onClick = { viewModel.filterByCategory(null) },
                        label = { Text("அனைத்தும்") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TamizhiSaffron,
                            selectedLabelColor = Color.White,
                            containerColor = TamizhiSurface,
                            labelColor = TamizhiOnSurface
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = uiState.selectedCategory == null,
                            borderColor = TamizhiSaffron.copy(alpha = 0.4f),
                            selectedBorderColor = TamizhiSaffron
                        )
                    )
                }

                items(LiteraryCategory.values()) { category ->
                    FilterChip(
                        selected = uiState.selectedCategory == category,
                        onClick = { viewModel.filterByCategory(category) },
                        label = { Text(category.displayNameTa) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TamizhiSaffron,
                            selectedLabelColor = Color.White,
                            containerColor = TamizhiSurface,
                            labelColor = TamizhiOnSurface
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = uiState.selectedCategory == category,
                            borderColor = TamizhiSaffron.copy(alpha = 0.4f),
                            selectedBorderColor = TamizhiSaffron
                        )
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            // Content
            when {
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = TamizhiSaffron)
                    }
                }
                uiState.error != null -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "பிழை ஏற்பட்டது",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.error
                            )
                            Text(
                                text = uiState.error!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = TamizhiOnSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
                uiState.filteredWorks.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Filled.AutoStories,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = TamizhiSaffron.copy(alpha = 0.4f)
                            )
                            Spacer(Modifier.height(12.dp))
                            Text(
                                text = "நூல்கள் எதுவும் இல்லை",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TamizhiOnSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
                else -> {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(uiState.filteredWorks) { work ->
                            WorkCard(work = work, onClick = { onWorkClick(work.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkCard(
    work: LiteraryWork,
    onClick: () -> Unit
) {
    TamizhiCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Category icon placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(TamizhiNavy),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = work.titleTa.take(2),
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = TamizhiGold
                    )
                )
            }

            Spacer(Modifier.height(8.dp))

            // Title
            Text(
                text = work.titleTa,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                color = TamizhiOnSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(Modifier.height(2.dp))

            // Author
            Text(
                text = work.authorTa,
                style = MaterialTheme.typography.bodySmall,
                color = TamizhiOnSurface.copy(alpha = 0.6f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(Modifier.height(6.dp))

            // Badges row
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                EraChip(era = work.era)
                Spacer(Modifier.weight(1f))
                Icon(
                    imageVector = Icons.Filled.Verified,
                    contentDescription = "Verified on chain",
                    modifier = Modifier.size(14.dp),
                    tint = TamizhiGold
                )
            }

            Spacer(Modifier.height(4.dp))

            // Category badge
            Surface(
                shape = RoundedCornerShape(4.dp),
                color = TamizhiSaffron.copy(alpha = 0.15f)
            ) {
                Text(
                    text = work.category.displayNameTa,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = TamizhiSaffron
                )
            }
        }
    }
}

@Composable
private fun EraChip(era: String) {
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = TamizhiNavy
    ) {
        Text(
            text = era,
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = TamizhiOnSurface.copy(alpha = 0.7f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
