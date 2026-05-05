import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

interface Bookmark {
  id: string;
  url: string;
  title: string;
  folder?: string;
}

const KEY = "tamizhi.browser.bookmarks";
const DEFAULTS: Bookmark[] = [
  { id: "1", url: "https://explorer.tamizhi.ai", title: "Tamizhi Explorer", folder: "Tamizhi" },
  { id: "2", url: "https://literature.tamizhi.ai", title: "Literary Works", folder: "Tamizhi" },
  { id: "3", url: "tamizhi://wallet", title: "My Wallet", folder: "Tamizhi" },
  { id: "4", url: "https://ta.wikipedia.org", title: "Tamil Wikipedia", folder: "Reference" },
];

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        setBookmarks(raw ? JSON.parse(raw) : DEFAULTS);
      } catch {
        setBookmarks(DEFAULTS);
      }
    })();
  }, []);

  function open(url: string) {
    router.push({ pathname: "/browser", params: { url } });
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Bookmarks</Text>
      </View>
      <FlatList
        data={bookmarks}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => open(item.url)}>
            <MaterialCommunityIcons name="bookmark" size={20} color="#00d4ff" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.rowTitle}>{item.title}</Text>
              <Text style={s.rowUrl} numberOfLines={1}>{item.url}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>No bookmarks yet</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#fdf6e3" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#1a1040", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#2a1f5c" },
  rowTitle: { color: "#fdf6e3", fontWeight: "600" },
  rowUrl: { color: "#8a8aa0", fontSize: 12, marginTop: 2 },
  empty: { color: "#5a5a72", textAlign: "center", marginTop: 32 },
});
