package com.tamizhi.app

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.Chat
import androidx.compose.material.icons.outlined.SmartToy
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.tamizhi.app.common.ui.theme.TamizhiGold
import com.tamizhi.app.common.ui.theme.TamizhiNavy
import com.tamizhi.app.common.ui.theme.TamizhiOnSurface
import com.tamizhi.app.common.ui.theme.TamizhiSaffron
import com.tamizhi.app.common.ui.theme.TamizhiSurface
import com.tamizhi.app.feature.ai.ui.AIScreen
import com.tamizhi.app.feature.literature.ui.LiteratureDetailScreen
import com.tamizhi.app.feature.literature.ui.LiteratureScreen
import com.tamizhi.app.feature.messenger.ui.ChatScreen
import com.tamizhi.app.feature.messenger.ui.ConversationListScreen
import com.tamizhi.app.feature.wallet.ui.OnboardingScreen
import com.tamizhi.app.feature.wallet.ui.ReceiveScreen
import com.tamizhi.app.feature.wallet.ui.SendScreen
import com.tamizhi.app.feature.wallet.ui.WalletScreen
import com.tamizhi.app.feature.wallet.viewmodel.WalletViewModel
import kotlinx.coroutines.launch


// ── Route constants ────────────────────────────────────────────────────────────

object Routes {
    // Top-level
    const val ONBOARDING = "onboarding"

    // Wallet tab
    const val WALLET = "wallet"
    const val SEND = "wallet/send"
    const val RECEIVE = "wallet/receive"

    // Messenger tab
    const val CONVERSATION_LIST = "messenger"
    const val CHAT = "messenger/chat/{conversationId}"
    fun chat(conversationId: String) = "messenger/chat/$conversationId"

    // Literature tab
    const val LITERATURE = "literature"
    const val LITERATURE_DETAIL = "literature/{workId}"
    fun literatureDetail(workId: String) = "literature/$workId"

    // AI tab
    const val AI = "ai"
}

// ── Bottom nav tab model ───────────────────────────────────────────────────────

private data class TopLevelRoute(
    val titleRes: Int,
    val route: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

private val topLevelRoutes = listOf(
    TopLevelRoute(
        titleRes = R.string.tab_wallet,
        route = Routes.WALLET,
        selectedIcon = Icons.Filled.AccountBalanceWallet,
        unselectedIcon = Icons.Outlined.AccountBalanceWallet
    ),
    TopLevelRoute(
        titleRes = R.string.tab_messenger,
        route = Routes.CONVERSATION_LIST,
        selectedIcon = Icons.Filled.Chat,
        unselectedIcon = Icons.Outlined.Chat
    ),
    TopLevelRoute(
        titleRes = R.string.tab_literature,
        route = Routes.LITERATURE,
        selectedIcon = Icons.Filled.AutoStories,
        unselectedIcon = Icons.Outlined.AutoStories
    ),
    TopLevelRoute(
        titleRes = R.string.tab_ai,
        route = Routes.AI,
        selectedIcon = Icons.Filled.SmartToy,
        unselectedIcon = Icons.Outlined.SmartToy
    )
)

// ── Root navigation composable ─────────────────────────────────────────────────

@Composable
fun TamizhiNavigation() {
    val navController = rememberNavController()

    // Auth guard: check if wallet exists and redirect to onboarding if not
    var startDestination by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            // We start on WALLET; OnboardingScreen is pushed if no wallet found
            startDestination = Routes.WALLET
        }
    }

    val bottomNavRoutes = setOf(
        Routes.WALLET,
        Routes.CONVERSATION_LIST,
        Routes.LITERATURE,
        Routes.AI
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val currentRoute = currentDestination?.route

    val showBottomBar = currentRoute in bottomNavRoutes

    if (startDestination == null) return

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = TamizhiSurface,
                    contentColor = TamizhiOnSurface
                ) {
                    topLevelRoutes.forEach { tab ->
                        val selected = currentDestination?.hierarchy?.any { it.route == tab.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                    contentDescription = stringResource(tab.titleRes)
                                )
                            },
                            label = { Text(stringResource(tab.titleRes)) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = TamizhiSaffron,
                                selectedTextColor = TamizhiSaffron,
                                indicatorColor = TamizhiNavy,
                                unselectedIconColor = TamizhiOnSurface.copy(alpha = 0.6f),
                                unselectedTextColor = TamizhiOnSurface.copy(alpha = 0.6f)
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination!!,
            modifier = Modifier.padding(innerPadding)
        ) {
            // ── Onboarding ──────────────────────────────────────────────────
            composable(Routes.ONBOARDING) {
                OnboardingScreen(
                    onWalletCreated = {
                        navController.navigate(Routes.WALLET) {
                            popUpTo(Routes.ONBOARDING) { inclusive = true }
                        }
                    }
                )
            }

            // ── Wallet tab ──────────────────────────────────────────────────
            composable(Routes.WALLET) {
                WalletScreen(
                    onNavigateToSend = { navController.navigate(Routes.SEND) },
                    onNavigateToReceive = { navController.navigate(Routes.RECEIVE) },
                    onNavigateScan = { /* QR scan not yet routed */ }
                )
            }

            composable(Routes.SEND) {
                SendScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateScan = { /* QR scan not yet routed */ }
                )
            }

            composable(Routes.RECEIVE) {
                val walletVm: WalletViewModel = hiltViewModel()
                val walletState by walletVm.uiState.collectAsState()
                ReceiveScreen(
                    walletAddress = walletState.wallet?.address ?: "",
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // ── Messenger tab ───────────────────────────────────────────────
            composable(Routes.CONVERSATION_LIST) {
                ConversationListScreen(
                    onConversationClick = { conversationId ->
                        navController.navigate(Routes.chat(conversationId))
                    },
                    onNewConversation = { /* handled internally via sheet */ }
                )
            }

            composable(
                route = Routes.CHAT,
                arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
            ) { backStackEntry ->
                val conversationId = backStackEntry.arguments?.getString("conversationId") ?: return@composable
                ChatScreen(
                    conversationId = conversationId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // ── Literature tab ──────────────────────────────────────────────
            composable(Routes.LITERATURE) {
                LiteratureScreen(
                    onWorkClick = { workId ->
                        navController.navigate(Routes.literatureDetail(workId))
                    }
                )
            }

            composable(
                route = Routes.LITERATURE_DETAIL,
                arguments = listOf(navArgument("workId") { type = NavType.StringType })
            ) { backStackEntry ->
                val workId = backStackEntry.arguments?.getString("workId") ?: return@composable
                LiteratureDetailScreen(
                    workId = workId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // ── AI tab ──────────────────────────────────────────────────────
            composable(Routes.AI) {
                AIScreen()
            }
        }
    }
}
