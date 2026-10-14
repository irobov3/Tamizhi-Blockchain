import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadHistory, HistoryEntry } from '../../lib/history';

const COLORS = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
  urlBar: '#120d30',
};

const QUICK_DIAL = [
  { title: 'Tamizhi Explorer', url: 'https://explorer.tamizhi.ai', icon: 'compass' as const },
  { title: 'Tamizhi Wallet', url: 'tamizhi://wallet', icon: 'wallet' as const },
  { title: 'Tamil Wikipedia', url: 'https://ta.wikipedia.org', icon: 'wikipedia' as const },
  { title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: 'duck' as const },
  { title: 'IPFS Gateway', url: 'https://ipfs.io', icon: 'ip-network' as const },
  { title: 'Literature', url: 'https://literature.tamizhi.ai', icon: 'book-open-variant' as const },
];

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);

  async function fetchHistory() {
    const entries = await loadHistory();
    setRecentHistory(entries.slice(0, 5));
  }

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  function go(url: string) {
    router.push({ pathname: '/browser', params: { url } });
  }

  function submitSearch() {
    const q = search.trim();
    if (!q) return;
    const url =
      q.includes('.') || q.startsWith('http')
        ? q.startsWith('http')
          ? q
          : `https://${q}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    go(url);
    setSearch('');
  }

  function formatTime(ms: number): string {
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.tamil}>தமிழி</Text>
        <Text style={s.brand}>Browser</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={22} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search or enter URL"
          placeholderTextColor="#5a5a72"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submitSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
        />
      </View>

      {/* Quick dial */}
      <Text style={s.sectionTitle}>Quick Access</Text>
      <View style={s.grid}>
        {QUICK_DIAL.map((item) => (
          <TouchableOpacity key={item.url} style={s.tile} onPress={() => go(item.url)}>
            <MaterialCommunityIcons name={item.icon} size={28} color={COLORS.cyan} />
            <Text style={s.tileLabel} numberOfLines={2}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent history */}
      {recentHistory.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Recent</Text>
          {recentHistory.map((entry) => (
            <TouchableOpacity key={entry.id} style={s.historyRow} onPress={() => go(entry.url)}>
              <MaterialCommunityIcons name="history" size={16} color={COLORS.muted} />
              <View style={s.historyText}>
                <Text style={s.historyTitle} numberOfLines={1}>
                  {entry.title || entry.url}
                </Text>
                <Text style={s.historyUrl} numberOfLines={1}>{entry.url}</Text>
              </View>
              <Text style={s.historyTime}>{formatTime(entry.visitedAt)}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <TouchableOpacity style={s.actionRow} onPress={() => router.push('/(tabs)/bookmarks')}>
        <MaterialCommunityIcons name="bookmark-multiple" size={20} color={COLORS.cyan} />
        <Text style={s.actionText}>View all bookmarks</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.muted} />
      </TouchableOpacity>
      <TouchableOpacity style={[s.actionRow, { marginTop: 8 }]} onPress={() => router.push('/(tabs)/history')}>
        <MaterialCommunityIcons name="history" size={20} color={COLORS.cyan} />
        <Text style={s.actionText}>Browsing history</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.muted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  tamil: { fontSize: 22, color: COLORS.cyan, fontWeight: '700' },
  brand: { fontSize: 32, color: COLORS.text, fontWeight: '800', marginTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, padding: 14, fontSize: 15 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 28,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
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
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  historyText: { flex: 1 },
  historyTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  historyUrl: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  historyTime: { color: COLORS.muted, fontSize: 11 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 24,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  actionText: { color: COLORS.text, fontWeight: '600', flex: 1 },
});
