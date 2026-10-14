package com.tamizhi.app.feature.messenger.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tamizhi.app.core.domain.model.Conversation
import com.tamizhi.app.core.domain.model.Message
import com.tamizhi.app.core.domain.repository.MessageRepository
import com.tamizhi.app.core.domain.repository.WalletRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── Conversation list state ────────────────────────────────────────────────────

data class ConversationListUiState(
    val conversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

// ── Chat state ────────────────────────────────────────────────────────────────

data class ChatUiState(
    val conversation: Conversation? = null,
    val messages: List<Message> = emptyList(),
    val inputText: String = "",
    val isSending: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val myAddress: String = ""
)

sealed interface MessengerEvent {
    data class ShowSnackbar(val message: String) : MessengerEvent
    data class NavigateToChat(val conversationId: String) : MessengerEvent
}

// ── ViewModel ─────────────────────────────────────────────────────────────────

@HiltViewModel
class MessengerViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val walletRepository: WalletRepository,
    private val savedStateHandle: SavedStateHandle
) : ViewModel() {

    // Conversation list
    private val _listState = MutableStateFlow(ConversationListUiState())
    val listState: StateFlow<ConversationListUiState> = _listState.asStateFlow()

    // Active chat
    private val _chatState = MutableStateFlow(ChatUiState())
    val chatState: StateFlow<ChatUiState> = _chatState.asStateFlow()

    private val _events = MutableSharedFlow<MessengerEvent>()
    val events: SharedFlow<MessengerEvent> = _events.asSharedFlow()

    init {
        observeConversations()
        observeActiveWalletAddress()
    }

    private fun observeConversations() {
        _listState.update { it.copy(isLoading = true) }
        messageRepository.getConversations()
            .onEach { conversations ->
                _listState.update {
                    it.copy(conversations = conversations, isLoading = false)
                }
            }
            .launchIn(viewModelScope)
    }

    private fun observeActiveWalletAddress() {
        walletRepository.getActiveWallet()
            .onEach { wallet ->
                _chatState.update { it.copy(myAddress = wallet?.address ?: "") }
            }
            .launchIn(viewModelScope)
    }

    // ── Conversation list actions ─────────────────────────────────────────────

    fun openConversation(conversationId: String) {
        viewModelScope.launch {
            _events.emit(MessengerEvent.NavigateToChat(conversationId))
        }
    }

    fun startNewConversation(remoteAddress: String) {
        viewModelScope.launch {
            val myAddress = _chatState.value.myAddress
            if (myAddress.isBlank()) {
                _events.emit(MessengerEvent.ShowSnackbar("No active wallet"))
                return@launch
            }
            val conversation = messageRepository.getOrCreateConversation(myAddress, remoteAddress)
            _events.emit(MessengerEvent.NavigateToChat(conversation.id))
        }
    }

    fun deleteConversation(conversationId: String) {
        viewModelScope.launch {
            messageRepository.deleteConversation(conversationId)
        }
    }

    // ── Chat actions ──────────────────────────────────────────────────────────

    fun loadChat(conversationId: String) {
        _chatState.update { it.copy(isLoading = true) }
        messageRepository.getMessages(conversationId)
            .onEach { messages ->
                _chatState.update { it.copy(messages = messages, isLoading = false) }
            }
            .launchIn(viewModelScope)

        // Mark conversation as read when opened
        viewModelScope.launch {
            messageRepository.markConversationRead(conversationId)
        }

        // Sync messages from server
        viewModelScope.launch {
            messageRepository.syncMessages(conversationId, sinceTimestamp = 0L)
        }
    }

    fun onInputChanged(text: String) {
        _chatState.update { it.copy(inputText = text) }
    }

    fun sendMessage(conversationId: String) {
        val state = _chatState.value
        val text = state.inputText.trim()
        if (text.isBlank() || state.isSending) return

        _chatState.update { it.copy(isSending = true, inputText = "") }
        viewModelScope.launch {
            val toAddress = state.conversation?.remoteAddress ?: return@launch
            messageRepository.sendMessage(
                conversationId = conversationId,
                fromAddress = state.myAddress,
                toAddress = toAddress,
                content = text
            ).onSuccess {
                _chatState.update { it.copy(isSending = false) }
            }.onFailure { e ->
                _chatState.update { it.copy(isSending = false, inputText = text) }
                _events.emit(MessengerEvent.ShowSnackbar("Send failed: ${e.message}"))
            }
        }
    }

    fun deleteMessage(messageId: String) {
        viewModelScope.launch {
            messageRepository.deleteMessage(messageId)
        }
    }
}
