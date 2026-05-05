package com.tamizhi.app.feature.ai.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tamizhi.app.core.data.remote.api.BackendApi
import com.tamizhi.app.core.data.remote.dto.AiChatRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class AiMessage(
    val id: String,
    val content: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)

data class AiUiState(
    val messages: List<AiMessage> = emptyList(),
    val inputText: String = "",
    val isLoading: Boolean = false,
    val language: String = "ta",
    val error: String? = null
)

@HiltViewModel
class AIViewModel @Inject constructor(
    private val backendApi: BackendApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiUiState())
    val uiState: StateFlow<AiUiState> = _uiState.asStateFlow()

    fun onInputChanged(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun toggleLanguage() {
        _uiState.update { state ->
            val newLang = if (state.language == "ta") "en" else "ta"
            state.copy(language = newLang)
        }
    }

    fun sendMessage(content: String = _uiState.value.inputText.trim()) {
        if (content.isBlank() || _uiState.value.isLoading) return

        val userMessage = AiMessage(
            id = UUID.randomUUID().toString(),
            content = content,
            isUser = true
        )

        _uiState.update {
            it.copy(
                messages = it.messages + userMessage,
                inputText = "",
                isLoading = true,
                error = null
            )
        }

        viewModelScope.launch {
            try {
                val currentLang = _uiState.value.language
                val response = backendApi.sendAiChat(
                    AiChatRequest(
                        message = content,
                        language = currentLang
                    )
                )
                val reply = if (currentLang == "ta" && !response.replyTa.isNullOrBlank()) {
                    response.replyTa
                } else {
                    response.reply
                }
                val aiMessage = AiMessage(
                    id = UUID.randomUUID().toString(),
                    content = reply,
                    isUser = false
                )
                _uiState.update {
                    it.copy(messages = it.messages + aiMessage, isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to get response"
                    )
                }
            }
        }
    }
}
