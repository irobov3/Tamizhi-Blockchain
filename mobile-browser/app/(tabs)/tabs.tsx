import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBrowserStore, BrowserTab } from '../../lib/tabs';

const COLORS = {
  bg: '#0e0824',
  card: '#1a1040',
  border: '#2a1f5c',
  cyan: '#00d4ff',
  text: '#fdf6e3',
  muted: '#8a8aa0',
  gold: '#d4a017',
};

export default function TabsScreen() {
  const tabs = useBrowserStore((s) => s.tabs);
  const activeTabId = useBrowserStore((s) => s.activeTabId);
  const addTab = useBrowserStore((s) => s.addTab);
  const closeTab = useBrowserStore((s) => s.closeTab);
  const setActiveTab = useBrowserStore((s) => s.setActiveTab);

  function openTab(tab: BrowserTab) {
    setActiveTab(tab.id);
    router.push({ pathname: '/browser', params: { url: tab.url } });
  }

  function handleClose(id: string) {
    closeTab(id);
  }

  function handleNewTab() {
    const id = addTab('tamizhi://newtab');
    setActiveTab(id);
    router.push({ pathname: '/browser', params: { url: 'tamizhi://newtab' } });
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Tabs</Text>
        <TouchableOpacity style={s.newBtn} onPress={handleNewTab}>
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.bg} />
          <Text style={s.newBtnText}>New Tab</Text>
        </TouchableOpacity>
      </View>

      {tabs.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="tab" size={64} color={COLORS.border} />
          <Text style={s.emptyTitle}>No open tabs</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={handleNewTab}>
            <Text style={s.emptyBtnText}>+ Open New Tab</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tabs}
          keyExtractor={(t) => t.id}
          numColumns={2}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.row}
          renderItem={({ item }) => {
            const active = item.id === activeTabId;
            return (
              <TouchableOpacity
                style={[s.card, active && s.cardActive]}
                onPress={() => openTab(item)}
                activeOpacity={0.8}
              >
                {/* Close button */}
                <TouchableOpacity
                  style={s.closeBtn}
                  onPress={() => handleClose(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={14} color={COLORS.muted} />
                </TouchableOpacity>

                {/* Tab icon */}
                <MaterialCommunityIcons
                  name={item.isLoading ? 'loading' : 'web'}
                  size={28}
                  color={active ? COLORS.cyan : COLORS.muted}
                  style={s.tabIcon}
                />

                {/* Title */}
                <Text style={[s.tabTitle, active && s.tabTitleActive]} numberOfLines={2}>
                  {item.title || 'New Tab'}
                </Text>

                {/* URL */}
                <Text style={s.tabUrl} numberOfLines={1}>
                  {item.url === 'tamizhi://newtab' ? 'New Tab' : item.url}
                </Text>

                {active && <View style={s.activeDot} />}
              </TouchableOpacity>
            );
          }}
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cyan,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  newBtnText: { color: COLORS.bg, fontWeight: '700', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.cyan,
    borderRadius: 12,
  },
  emptyBtnText: { color: COLORS.bg, fontWeight: '700' },
  grid: { paddingHorizontal: 12, paddingBottom: 32 },
  row: { justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 12,
    minHeight: 140,
    position: 'relative',
  },
  cardActive: {
    borderColor: COLORS.gold,
    borderWidth: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a1f5c',
    borderRadius: 12,
    zIndex: 1,
  },
  tabIcon: { marginBottom: 8, marginTop: 4 },
  tabTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  tabTitleActive: { color: COLORS.cyan },
  tabUrl: { color: COLORS.muted, fontSize: 10 },
  activeDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },
});
