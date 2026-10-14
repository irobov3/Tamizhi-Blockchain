import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBrowserStore } from '../../lib/tabs';
import { addHistory } from '../../lib/history';
import { addBookmark, removeBookmark, isBookmarked } from '../../lib/bookmarks';
import { getProviderScript } from '../../lib/web3provider';

const COLORS = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
  urlBar: '#120d30',
};

const PLACEHOLDER_ADDRESS = 'tamizhi1qypqxpq9qcrsszgszyfpx9q4zct3sxfq0fzduj';

function resolveUrl(raw: string): string {
  if (!raw) return 'tamizhi://newtab';
  if (raw.startsWith('ipfs://')) {
    return 'https://ipfs.io/ipfs/' + raw.slice(7);
  }
  return raw;
}

function isInternal(url: string): boolean {
  return url.startsWith('tamizhi://');
}

export default function BrowserScreen() {
  const params = useLocalSearchParams<{ url?: string }>();

  const store = useBrowserStore();
  const webRef = useRef<WebView>(null);

  // Resolve or create tab
  const tabIdRef = useRef<string | null>(null);
  const [tabId, setTabId] = useState<string | null>(null);

  useEffect(() => {
    let id = store.activeTabId;
    if (!id) {
      id = store.addTab(params.url ?? 'tamizhi://newtab');
    } else if (params.url) {
      store.updateTab(id, { url: params.url });
    }
    tabIdRef.current = id;
    setTabId(id);
  }, []);

  const tab = store.tabs.find((t) => t.id === tabId) ?? null;

  const [urlInput, setUrlInput] = useState(tab?.url ?? '');
  const [editingUrl, setEditingUrl] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Sync url input when tab url changes
  useEffect(() => {
    if (tab && !editingUrl) {
      setUrlInput(tab.url);
    }
  }, [tab?.url, editingUrl]);

  // Check bookmark status
  useEffect(() => {
    if (tab?.url) {
      isBookmarked(tab.url).then(setBookmarked);
    }
  }, [tab?.url]);

  // Progress bar animation
  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 1800,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const finishProgress = useCallback(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => progressAnim.setValue(0), 300);
    });
  }, [progressAnim]);

  function navigate(url: string) {
    if (!tabId) return;
    let resolved = url.trim();
    if (!resolved) return;

    // Handle search queries
    if (
      !resolved.startsWith('http') &&
      !resolved.startsWith('tamizhi://') &&
      !resolved.startsWith('ipfs://') &&
      !resolved.includes('.')
    ) {
      resolved = `https://duckduckgo.com/?q=${encodeURIComponent(resolved)}`;
    } else if (!resolved.startsWith('http') && !resolved.startsWith('tamizhi://') && !resolved.startsWith('ipfs://')) {
      resolved = `https://${resolved}`;
    }

    store.updateTab(tabId, { url: resolved, isLoading: true });
    setUrlInput(resolved);
    setEditingUrl(false);
  }

  function handleSubmitUrl() {
    navigate(urlInput);
  }

  function handleNavState(state: WebViewNavigation) {
    if (!tabId) return;
    store.updateTab(tabId, {
      title: state.title || state.url,
      url: state.url,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
    });
    if (!editingUrl) setUrlInput(state.url);
  }

  function handleLoadStart() {
    if (!tabId) return;
    store.updateTab(tabId, { isLoading: true });
    startProgress();
  }

  function handleLoadEnd() {
    if (!tabId) return;
    store.updateTab(tabId, { isLoading: false });
    finishProgress();
    // Record history
    if (tab?.url && !isInternal(tab.url)) {
      addHistory(tab.url, tab.title || tab.url);
    }
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (!msg?.type) return;

      if (msg.type === 'SIGN_AMINO' || msg.type === 'SIGN_DIRECT') {
        Alert.alert(
          'Signing Request',
          `${msg.type === 'SIGN_AMINO' ? 'Amino' : 'Direct'} sign from ${msg.signerAddress ?? 'unknown'}`,
          [
            {
              text: 'Reject',
              style: 'destructive',
              onPress: () => {
                webRef.current?.injectJavaScript(
                  `if (window._tamizhiSignReject) window._tamizhiSignReject(new Error('User rejected')); true;`
                );
              },
            },
            {
              text: 'Approve',
              onPress: () => {
                // In a real wallet, sign here and return result
                webRef.current?.injectJavaScript(
                  `if (window._tamizhiSignResolve) window._tamizhiSignResolve({ signed: true }); true;`
                );
              },
            },
          ]
        );
      } else if (msg.type === 'SEND_TX') {
        Alert.alert(
          'Transaction Request',
          'A dApp wants to send a transaction on your behalf.',
          [
            {
              text: 'Reject',
              style: 'destructive',
              onPress: () => {
                webRef.current?.injectJavaScript(
                  `if (window._tamizhiTxReject) window._tamizhiTxReject(new Error('User rejected')); true;`
                );
              },
            },
            {
              text: 'Approve',
              onPress: () => {
                webRef.current?.injectJavaScript(
                  `if (window._tamizhiTxResolve) window._tamizhiTxResolve({ txHash: 'pending' }); true;`
                );
              },
            },
          ]
        );
      }
    } catch {
      // not JSON — ignore
    }
  }

  async function handleBookmarkToggle() {
    if (!tab) return;
    if (bookmarked) {
      await removeBookmark(tab.url);
      setBookmarked(false);
    } else {
      await addBookmark(tab.url, tab.title || tab.url);
      setBookmarked(true);
    }
  }

  async function handleShare() {
    if (!tab?.url) return;
    try {
      await Share.share({ message: tab.url, url: tab.url });
    } catch {}
  }

  const loadUrl = tab ? resolveUrl(tab.url) : 'tamizhi://newtab';
  const internal = isInternal(loadUrl);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!tab) {
    return (
      <View style={[s.flex, s.center]}>
        <Text style={{ color: COLORS.text }}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.flex} edges={['top']}>
      {/* URL bar */}
      <View style={s.urlRow}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/(tabs)/')}>
          <MaterialCommunityIcons name="home" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.urlBarWrap}
          onPress={() => {
            setEditingUrl(true);
            setUrlInput(tab.url);
          }}
          activeOpacity={1}
        >
          {editingUrl ? (
            <TextInput
              style={s.urlInput}
              value={urlInput}
              onChangeText={setUrlInput}
              onSubmitEditing={handleSubmitUrl}
              onBlur={() => setEditingUrl(false)}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
              placeholderTextColor={COLORS.muted}
            />
          ) : (
            <Text style={s.urlText} numberOfLines={1}>
              {tab.url === 'tamizhi://newtab' ? 'New Tab' : tab.url}
            </Text>
          )}
        </TouchableOpacity>
        {tab.isLoading ? (
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => {
              webRef.current?.stopLoading();
              store.updateTab(tab.id, { isLoading: false });
              finishProgress();
            }}
          >
            <MaterialCommunityIcons name="close" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.iconBtn} onPress={() => webRef.current?.reload()}>
            <MaterialCommunityIcons name="refresh" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {tab.isLoading && (
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressBar, { width: progressWidth }]} />
        </View>
      )}

      {/* Content area */}
      <View style={s.flex}>
        {internal ? (
          <NewTabPage onNavigate={navigate} />
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: loadUrl }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            sharedCookiesEnabled
            injectedJavaScriptBeforeContentLoaded={getProviderScript(PLACEHOLDER_ADDRESS)}
            injectedJavaScript={getProviderScript(PLACEHOLDER_ADDRESS)}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onNavigationStateChange={handleNavState}
            onMessage={handleMessage}
            startInLoadingState
          />
        )}
      </View>

      {/* Bottom toolbar */}
      <View style={s.toolbar}>
        <TouchableOpacity
          style={[s.toolBtn, !tab.canGoBack && s.toolBtnDisabled]}
          onPress={() => webRef.current?.goBack()}
          disabled={!tab.canGoBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={tab.canGoBack ? COLORS.text : COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toolBtn, !tab.canGoForward && s.toolBtnDisabled]}
          onPress={() => webRef.current?.goForward()}
          disabled={!tab.canGoForward}
        >
          <MaterialCommunityIcons name="arrow-right" size={22} color={tab.canGoForward ? COLORS.text : COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={() => webRef.current?.reload()}>
          <MaterialCommunityIcons name="refresh" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={handleBookmarkToggle}>
          <MaterialCommunityIcons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? COLORS.cyan : COLORS.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={handleShare}>
          <MaterialCommunityIcons name="share-variant" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Inline new-tab/home page shown when URL is tamizhi://newtab
function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [search, setSearch] = useState('');

  function submitSearch() {
    const q = search.trim();
    if (!q) return;
    const url = q.includes('.') || q.startsWith('http')
      ? (q.startsWith('http') ? q : `https://${q}`)
      : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    onNavigate(url);
    setSearch('');
  }

  const TILES = [
    { title: 'Tamizhi Explorer', url: 'https://explorer.tamizhi.ai', icon: 'compass' as const },
    { title: 'Tamizhi Wallet', url: 'tamizhi://wallet', icon: 'wallet' as const },
    { title: 'Tamil Wikipedia', url: 'https://ta.wikipedia.org', icon: 'wikipedia' as const },
    { title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: 'duck' as const },
    { title: 'IPFS Gateway', url: 'https://ipfs.io', icon: 'ip-network' as const },
    { title: 'Literature', url: 'https://literature.tamizhi.ai', icon: 'book-open-variant' as const },
  ];

  return (
    <View style={nt.root}>
      <Text style={nt.header}>தமிழி Browser</Text>
      <View style={nt.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.muted} />
        <TextInput
          style={nt.searchInput}
          placeholder="Search or enter URL"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submitSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
        />
      </View>
      <View style={nt.grid}>
        {TILES.map((tile) => (
          <TouchableOpacity key={tile.url} style={nt.tile} onPress={() => onNavigate(tile.url)}>
            <MaterialCommunityIcons name={tile.icon} size={26} color={COLORS.cyan} />
            <Text style={nt.tileLabel} numberOfLines={2}>{tile.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  urlBarWrap: {
    flex: 1,
    backgroundColor: COLORS.urlBar,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    minHeight: 36,
  },
  urlText: { color: COLORS.text, fontSize: 13 },
  urlInput: { color: COLORS.text, fontSize: 13, padding: 0 },
  progressTrack: { height: 2, backgroundColor: COLORS.border },
  progressBar: { height: 2, backgroundColor: COLORS.cyan },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  toolBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toolBtnDisabled: { opacity: 0.3 },
});

const nt = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.cyan,
    marginBottom: 20,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    padding: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    width: '31%',
    aspectRatio: 1,
    margin: '1%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileLabel: {
    color: COLORS.text,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
});
