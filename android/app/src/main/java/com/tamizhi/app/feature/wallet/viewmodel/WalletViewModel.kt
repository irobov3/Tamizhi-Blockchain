package com.tamizhi.app.feature.wallet.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tamizhi.app.core.domain.model.Transaction
import com.tamizhi.app.core.domain.model.Wallet
import com.tamizhi.app.core.domain.model.WalletBalance
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

// ── UiState ───────────────────────────────────────────────────────────────────

data class WalletUiState(
    val wallet: Wallet? = null,
    val balance: WalletBalance? = null,
    val transactions: List<Transaction> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null
)

sealed interface WalletEvent {
    data class ShowSnackbar(val message: String) : WalletEvent
    data object NavigateToSend : WalletEvent
    data object NavigateToReceive : WalletEvent
    data class AddressCopied(val address: String) : WalletEvent
}

// ── ViewModel ─────────────────────────────────────────────────────────────────

@HiltViewModel
class WalletViewModel @Inject constructor(
    private val walletRepository: WalletRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WalletUiState())
    val uiState: StateFlow<WalletUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<WalletEvent>()
    val events: SharedFlow<WalletEvent> = _events.asSharedFlow()

    init {
        observeActiveWallet()
    }

    private fun observeActiveWallet() {
        walletRepository.getActiveWallet()
            .onEach { wallet ->
                _uiState.update { it.copy(wallet = wallet) }
                if (wallet != null) {
                    refreshBalance(wallet.address)
                    loadTransactions(wallet.address)
                }
            }
            .launchIn(viewModelScope)
    }

    fun refresh() {
        val address = _uiState.value.wallet?.address ?: return
        _uiState.update { it.copy(isRefreshing = true) }
        viewModelScope.launch {
            refreshBalance(address)
            loadTransactions(address)
            _uiState.update { it.copy(isRefreshing = false) }
        }
    }

    private suspend fun refreshBalance(address: String) {
        walletRepository.getBalance(address)
            .onSuccess { balance ->
                _uiState.update { it.copy(balance = balance, error = null) }
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = e.message) }
                _events.emit(WalletEvent.ShowSnackbar("Failed to load balance"))
            }
    }

    private fun loadTransactions(address: String) {
        viewModelScope.launch {
            walletRepository.getTransactions(address)
                .onSuccess { txs ->
                    _uiState.update { it.copy(transactions = txs) }
                }
                .onFailure {
                    // Non-fatal — just keep existing list
                }
        }
    }

    fun onSendClick() {
        viewModelScope.launch { _events.emit(WalletEvent.NavigateToSend) }
    }

    fun onReceiveClick() {
        viewModelScope.launch { _events.emit(WalletEvent.NavigateToReceive) }
    }

    fun onAddressCopied() {
        val address = _uiState.value.wallet?.address ?: return
        viewModelScope.launch {
            _events.emit(WalletEvent.AddressCopied(address))
            _events.emit(WalletEvent.ShowSnackbar("Address copied"))
        }
    }
}
