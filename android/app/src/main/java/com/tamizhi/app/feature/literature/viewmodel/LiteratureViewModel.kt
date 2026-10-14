package com.tamizhi.app.feature.literature.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tamizhi.app.core.data.remote.api.BackendApi
import com.tamizhi.app.core.data.remote.dto.LiteratureDetailDto
import com.tamizhi.app.core.domain.model.LiteraryCategory
import com.tamizhi.app.core.domain.model.LiteraryWork
import com.tamizhi.app.core.domain.model.LiteraryWorkDetail
import com.tamizhi.app.core.domain.model.Verse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── UI State ───────────────────────────────────────────────────────────────────

data class LiteratureUiState(
    val works: List<LiteraryWork> = emptyList(),
    val filteredWorks: List<LiteraryWork> = emptyList(),
    val searchQuery: String = "",
    val selectedCategory: LiteraryCategory? = null,
    val selectedWork: LiteraryWorkDetail? = null,
    val isLoading: Boolean = false,
    val isLoadingDetail: Boolean = false,
    val error: String? = null,
    val detailError: String? = null
)

// ── ViewModel ──────────────────────────────────────────────────────────────────

@HiltViewModel
class LiteratureViewModel @Inject constructor(
    private val backendApi: BackendApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(LiteratureUiState())
    val uiState: StateFlow<LiteratureUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        loadWorks()
    }

    fun loadWorks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val response = backendApi.getLiteratureList(page = 1, limit = 50)
                val works = response.items.map { dto ->
                    LiteraryWork(
                        id = dto.id,
                        title = dto.title,
                        titleTa = dto.titleTa,
                        author = dto.author,
                        authorTa = dto.authorTa,
                        category = LiteraryCategory.fromString(dto.category),
                        era = dto.era,
                        verseCount = dto.verseCount,
                        thumbnailUrl = dto.thumbnailUrl,
                        summary = dto.summary,
                        summaryTa = dto.summaryTa
                    )
                }
                _uiState.update {
                    it.copy(
                        works = works,
                        filteredWorks = applyFilters(works, it.searchQuery, it.selectedCategory),
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load literature"
                    )
                }
            }
        }
    }

    fun searchWorks(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // debounce
            val currentState = _uiState.value
            if (query.length >= 2) {
                // Search via API
                try {
                    val response = backendApi.getLiteratureList(query = query, limit = 50)
                    val works = response.items.map { dto ->
                        LiteraryWork(
                            id = dto.id,
                            title = dto.title,
                            titleTa = dto.titleTa,
                            author = dto.author,
                            authorTa = dto.authorTa,
                            category = LiteraryCategory.fromString(dto.category),
                            era = dto.era,
                            verseCount = dto.verseCount,
                            thumbnailUrl = dto.thumbnailUrl,
                            summary = dto.summary,
                            summaryTa = dto.summaryTa
                        )
                    }
                    _uiState.update {
                        it.copy(
                            filteredWorks = applyFilters(works, query, it.selectedCategory)
                        )
                    }
                } catch (e: Exception) {
                    // Fall back to local filter
                    _uiState.update {
                        it.copy(
                            filteredWorks = applyFilters(it.works, query, it.selectedCategory)
                        )
                    }
                }
            } else {
                _uiState.update {
                    it.copy(
                        filteredWorks = applyFilters(it.works, query, it.selectedCategory)
                    )
                }
            }
        }
    }

    fun filterByCategory(category: LiteraryCategory?) {
        _uiState.update { state ->
            val newCategory = if (state.selectedCategory == category) null else category
            state.copy(
                selectedCategory = newCategory,
                filteredWorks = applyFilters(state.works, state.searchQuery, newCategory)
            )
        }
    }

    fun loadWorkDetail(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingDetail = true, detailError = null, selectedWork = null) }
            try {
                val dto = backendApi.getLiteratureDetail(id)
                val detail = dto.toDomain()
                _uiState.update { it.copy(selectedWork = detail, isLoadingDetail = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingDetail = false,
                        detailError = e.message ?: "Failed to load work details"
                    )
                }
            }
        }
    }

    fun clearSelectedWork() {
        _uiState.update { it.copy(selectedWork = null, detailError = null) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun applyFilters(
        works: List<LiteraryWork>,
        query: String,
        category: LiteraryCategory?
    ): List<LiteraryWork> {
        return works.filter { work ->
            val matchesQuery = query.isBlank() ||
                work.title.contains(query, ignoreCase = true) ||
                work.titleTa.contains(query) ||
                work.author.contains(query, ignoreCase = true) ||
                work.authorTa.contains(query)
            val matchesCategory = category == null || work.category == category
            matchesQuery && matchesCategory
        }
    }

    private fun LiteratureDetailDto.toDomain(): LiteraryWorkDetail = LiteraryWorkDetail(
        id = id,
        title = title,
        titleTa = titleTa,
        author = author,
        authorTa = authorTa,
        category = LiteraryCategory.fromString(category),
        era = era,
        verses = verses.map { v ->
            Verse(
                number = v.number,
                textTa = v.textTa,
                transliteration = v.transliteration,
                translationEn = v.translationEn,
                chapter = v.chapter,
                chapterTa = v.chapterTa
            )
        },
        commentary = commentary,
        commentaryTa = commentaryTa
    )
}
