import React, { useRef, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
// eslint-disable-next-line import/no-unresolved
import { WebView } from 'react-native-webview';
import { CONFIG } from '../../src/config';
import { useTabsStore } from '../../src/store/tabs';
import { useBookmarksStore } from '../../src/store/bookmarks';
import { useHistoryStore } from '../../src/store/history';
import { URLBar } from '../../src/components/URLBar';
import { NavBar } from '../../src/components/NavBar';
import { Web3PermissionModal } from '../../src/components/Web3PermissionModal';
import { INJECTED_JS } from '../../src/web3/inject';
import { onWebViewMessage } from '../../src/web3/messageHandler';
import { getDomain, resolveIpfs, parseTamizhiURL } from '../../src/utils/url';

const T = CONFIG.THEME;
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

export default function BrowserScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);

  const activeTab = useTabsStore((s) =>
    s.activeTabId ? s.tabs.find((t) => t.id === s.activeTabId) ?? null : null
  );
  const newTab = useTabsStore((s) => s.newTab);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const navigate = useTabsStore((s) => s.navigate);
  const setTitle = useTabsStore((s) => s.setTitle);
  const setLoading = useTabsStore((s) => s.setLoading);
  const goBack = useTabsStore((s) => s.goBack);
  const goForward = useTabsStore((s) => s.goForward);

  const addHistory = useHistoryStore((s) => s.add);
  const addBookmark = useBookmarksStore((s) => s.add);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);

  const [stoppedLoading, setStoppedLoading] = useState(false);

  // Make sure there is always a tab to render
  const tabId = useMemo(() => {
    if (activeTab) return activeTab.id;
    const id = newTab();
    setActiveTab(id);
    return id;
  }, []);

  const tab =
    activeTab ??
    useTabsStore.getState().tabs.find((t) => t.id === tabId) ??
    null;

  if (!tab) {
    return (
      <View style={[styles.flex, { justifyContent: 'center' }]}>
        <Text style={{ color: T.text, textAlign: 'center' }}>Loading…</Text>
      </View>
    );
  }

  // Resolve display + load URL
  const tamizhiInternal = parseTamizhiURL(tab.url);
  if (tamizhiInternal) {
    if (tamizhiInternal.route === 'wallet') {
      // For now, show a friendly placeholder. Wallet UI lives in tabs/settings.
      // Could router.push('/(tabs)/settings') if desired.
    }
  }
  const loadUrl = tab.url.startsWith('ipfs://')
    ? resolveIpfs(tab.url, IPFS_GATEWAY)
    : tab.url;

  const domain = getDomain(loadUrl);
  const isInternal =
    tab.url === 'tamizhi://home' || tab.url.startsWith('tamizhi://');

  const onSubmitURL = (url: string) => {
    setStoppedLoading(false);
    navigate(tab.id, url);
  };

  const onReload = () => {
    setStoppedLoading(false);
    webRef.current?.reload();
  };

  const onStop = () => {
    setStoppedLoading(true);
    webRef.current?.stopLoading();
    setLoading(tab.id, false);
  };

  const onBookmark = () => {
    addBookmark({
      url: tab.url,
      title: tab.title || tab.url,
      favicon: tab.favicon,
      folderId: 'other',
    });
    Alert.alert('Bookmarked', tab.title || tab.url);
  };

  const onShare = async () => {
    try {
      await Share.share({ message: tab.url, url: tab.url });
    } catch {}
  };

  const isBookmarked = bookmarks.some((b) => b.url === tab.url);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      {/* URL bar row */}
      <View style={styles.urlRow}>
        <TouchableOpacity
          style={styles.urlIconBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={T.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <URLBar
            url={tab.url}
            loading={tab.loading && !stoppedLoading}
            onSubmit={onSubmitURL}
            onReload={onReload}
            onStop={onStop}
          />
        </View>
        <TouchableOpacity style={styles.urlIconBtn} onPress={onBookmark}>
          <Ionicons
            name={isBookmarked ? 'star' : 'star-outline'}
            size={20}
            color={isBookmarked ? T.accent : T.text}
          />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.flex}>
        {isInternal ? (
          <View style={[styles.flex, styles.internal]}>
            <Ionicons name="home" size={48} color={T.primary} />
            <Text style={styles.internalTitle}>Tamizhi Home</Text>
            <Text style={styles.internalSub}>
              Type a URL or search above to start browsing
            </Text>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: loadUrl }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            sharedCookiesEnabled
            injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
            injectedJavaScript={INJECTED_JS}
            onLoadStart={() => setLoading(tab.id, true)}
            onLoadEnd={() => setLoading(tab.id, false)}
            onNavigationStateChange={(navState) => {
              if (navState.title) setTitle(tab.id, navState.title);
              if (
                navState.url &&
                navState.url !== loadUrl &&
                !navState.loading
              ) {
                addHistory(navState.url, navState.title || navState.url);
              }
            }}
            onMessage={(event) => {
              onWebViewMessage(webRef, domain, event.nativeEvent.data);
            }}
            startInLoadingState
          />
        )}
      </View>

      {/* Bottom nav */}
      <NavBar
        canGoBack={tab.historyIndex > 0}
        canGoForward={tab.historyIndex < tab.history.length - 1}
        onBack={() => {
          if (webRef.current) webRef.current.goBack();
          else goBack(tab.id);
        }}
        onForward={() => {
          if (webRef.current) webRef.current.goForward();
          else goForward(tab.id);
        }}
        onHome={() => navigate(tab.id, 'tamizhi://home')}
        onTabs={() => router.push('/(tabs)/tabs')}
        onMenu={onShare}
      />

      <Web3PermissionModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: T.background },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 4,
  },
  urlIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  internal: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  internalTitle: {
    color: T.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  internalSub: { color: T.subtext, fontSize: 13, textAlign: 'center' },
});
