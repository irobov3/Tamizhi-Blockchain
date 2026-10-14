import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SectionList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadHistory, clearHistory, HistoryEntry } from '../../lib/history';

const COLORS = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
};

interface Section {
  title: string;
  data: HistoryEntry[];
}

function getDateGroup(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = nowMidnight.getTime() - dMidnight.getTime();
  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(entries: HistoryEntry[]): Section[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const key = getDateGroup(e.visitedAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const [sections, setSections] = useState<Section[]>([]);

  async function fetchHistory() {
    const entries = await loadHistory();
    setSections(groupByDate(entries));
  }

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  function openUrl(url: string) {
    router.push({ pathname: '/browser', params: { url } });
  }

  function handleClear() {
    Alert.alert(
      'Clear History',
      'Delete all browsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setSections([]);
          },
        },
      ]
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>History</Text>
        <TouchableOpacity onPress={handleClear} style={s.clearBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.muted} />
          <Text style={s.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="history" size={64} color={COLORS.border} />
          <Text style={s.emptyTitle}>No history yet</Text>
          <Text style={s.emptyText}>Sites you visit will appear here</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => openUrl(item.url)}>
              <MaterialCommunityIcons name="web" size={18} color={COLORS.muted} />
              <View style={s.rowContent}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {item.title || item.url}
                </Text>
                <Text style={s.rowUrl} numberOfLines={1}>{item.url}</Text>
              </View>
              <Text style={s.rowTime}>{formatTime(item.visitedAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearText: { color: COLORS.muted, fontSize: 13 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginTop: 8 },
  emptyText: { color: COLORS.muted, fontSize: 13 },
  sectionHeader: {
    backgroundColor: COLORS.bg,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  rowContent: { flex: 1 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  rowUrl: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  rowTime: { color: COLORS.muted, fontSize: 11 },
});
