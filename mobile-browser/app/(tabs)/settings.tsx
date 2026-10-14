import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHistory } from '../../lib/history';

const COLORS = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
};

const KEYS = {
  searchEngine: 'tamizhi.settings.searchEngine',
  blockTrackers: 'tamizhi.settings.blockTrackers',
  enableWeb3: 'tamizhi.settings.enableWeb3',
  ipfsGateway: 'tamizhi.settings.ipfsGateway',
};

const SEARCH_ENGINES = ['DuckDuckGo', 'Google', 'Brave'] as const;
type SearchEngine = (typeof SEARCH_ENGINES)[number];

export default function SettingsScreen() {
  const [searchEngine, setSearchEngine] = useState<SearchEngine>('DuckDuckGo');
  const [blockTrackers, setBlockTrackers] = useState(true);
  const [enableWeb3, setEnableWeb3] = useState(true);
  const [ipfsGateway, setIpfsGateway] = useState('https://ipfs.io');
  const [editingIpfs, setEditingIpfs] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [eng, trackers, web3, ipfs] = await Promise.all([
          AsyncStorage.getItem(KEYS.searchEngine),
          AsyncStorage.getItem(KEYS.blockTrackers),
          AsyncStorage.getItem(KEYS.enableWeb3),
          AsyncStorage.getItem(KEYS.ipfsGateway),
        ]);
        if (eng && SEARCH_ENGINES.includes(eng as SearchEngine)) setSearchEngine(eng as SearchEngine);
        if (trackers !== null) setBlockTrackers(trackers === 'true');
        if (web3 !== null) setEnableWeb3(web3 === 'true');
        if (ipfs) setIpfsGateway(ipfs);
      } catch (e) {
        console.warn('settings load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function cycleSearchEngine() {
    const idx = SEARCH_ENGINES.indexOf(searchEngine);
    const next = SEARCH_ENGINES[(idx + 1) % SEARCH_ENGINES.length];
    setSearchEngine(next);
    await AsyncStorage.setItem(KEYS.searchEngine, next);
  }

  async function toggleBlockTrackers(v: boolean) {
    setBlockTrackers(v);
    await AsyncStorage.setItem(KEYS.blockTrackers, String(v));
  }

  async function toggleEnableWeb3(v: boolean) {
    setEnableWeb3(v);
    await AsyncStorage.setItem(KEYS.enableWeb3, String(v));
  }

  async function saveIpfsGateway() {
    const trimmed = ipfsGateway.trim();
    if (!trimmed) return;
    setIpfsGateway(trimmed);
    setEditingIpfs(false);
    await AsyncStorage.setItem(KEYS.ipfsGateway, trimmed);
  }

  function handleClearHistory() {
    Alert.alert(
      'Clear History',
      'Delete all browsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            Alert.alert('Done', 'Browsing history cleared.');
          },
        },
      ]
    );
  }

  function handleClearBookmarks() {
    Alert.alert(
      'Clear Bookmarks',
      'This will delete all saved bookmarks. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('tamizhi.browser.bookmarks.lib.v1');
            Alert.alert('Done', 'All bookmarks cleared.');
          },
        },
      ]
    );
  }

  if (!loaded) return <View style={s.root} />;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 48 }}>
      <Text style={s.title}>Settings</Text>

      {/* Search */}
      <Section title="Search">
        <Row
          label="Default search engine"
          value={searchEngine}
          onPress={cycleSearchEngine}
        />
      </Section>

      {/* Privacy */}
      <Section title="Privacy">
        <ToggleRow
          label="Block third-party trackers"
          value={blockTrackers}
          onChange={toggleBlockTrackers}
        />
      </Section>

      {/* Web3 */}
      <Section title="Web3">
        <ToggleRow
          label="Inject window.tamizhi provider"
          value={enableWeb3}
          onChange={toggleEnableWeb3}
        />
        <View style={s.row}>
          <Text style={s.rowLabel}>IPFS Gateway</Text>
          {editingIpfs ? (
            <View style={s.ipfsEdit}>
              <TextInput
                style={s.ipfsInput}
                value={ipfsGateway}
                onChangeText={setIpfsGateway}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onSubmitEditing={saveIpfsGateway}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={saveIpfsGateway}>
                <Text style={s.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingIpfs(true)}>
              <Text style={s.rowValue}>{ipfsGateway}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Section>

      {/* Wallet */}
      <Section title="Wallet">
        <Row
          label="Built-in wallet"
          value="Manage"
          onPress={() =>
            Alert.alert('Wallet', 'Open the dedicated Tamizhi Wallet app for full features.')
          }
        />
      </Section>

      {/* Data */}
      <Section title="Data">
        <Row label="Clear browsing history" value="" onPress={handleClearHistory} danger />
        <Row label="Clear bookmarks" value="" onPress={handleClearBookmarks} danger />
      </Section>

      {/* About */}
      <Section title="About">
        <Row label="App version" value="1.0.0" />
        <Row label="Chain" value="tamizhi-testnet-1" />
        <Row label="Web3 API" value="v0.1.0" />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBox}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const Comp: any = onPress ? TouchableOpacity : View;
  return (
    <Comp style={s.row} onPress={onPress}>
      <Text style={[s.rowLabel, danger && { color: '#ff6b6b' }]}>{label}</Text>
      {value ? <Text style={s.rowValue}>{value}</Text> : null}
    </Comp>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: COLORS.cyan, false: COLORS.border }}
        thumbColor={COLORS.text}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 24 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { color: COLORS.text, fontSize: 14, flex: 1 },
  rowValue: { color: COLORS.cyan, fontSize: 14, fontWeight: '600' },
  ipfsEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ipfsInput: {
    color: COLORS.text,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cyan,
    minWidth: 160,
    paddingVertical: 2,
  },
  saveText: { color: COLORS.cyan, fontWeight: '700', fontSize: 13 },
});
