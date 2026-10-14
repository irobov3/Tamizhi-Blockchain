import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadBookmarks, removeBookmark, Bookmark } from '../../lib/bookmarks';

const COLORS = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
};

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [query, setQuery] = useState('');

  async function fetchBookmarks() {
    const list = await loadBookmarks();
    setBookmarks(list);
  }

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [])
  );

  const filtered = query.trim()
    ? bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.url.toLowerCase().includes(query.toLowerCase())
      )
    : bookmarks;

  function openBookmark(url: string) {
    router.push({ pathname: '/browser', params: { url } });
  }

  function confirmDelete(bookmark: Bookmark) {
    Alert.alert(
      'Delete Bookmark',
      `Remove "${bookmark.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeBookmark(bookmark.url);
            fetchBookmarks();
          },
        },
      ]
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Bookmarks</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={COLORS.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search bookmarks"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            onPress={() => openBookmark(item.url)}
            onLongPress={() => confirmDelete(item)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="bookmark" size={20} color={COLORS.cyan} />
            <View style={s.rowContent}>
              <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.rowUrl} numberOfLines={1}>{item.url}</Text>
            </View>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => confirmDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="bookmark-outline" size={56} color={COLORS.border} />
            <Text style={s.emptyTitle}>No bookmarks yet</Text>
            <Text style={s.emptyText}>
              {query ? 'No results for your search.' : 'Tap the bookmark icon while browsing to save sites.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  rowContent: { flex: 1 },
  rowTitle: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  rowUrl: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontSize: 13, paddingHorizontal: 32 },
});
