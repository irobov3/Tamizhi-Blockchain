import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const SUGGESTED = [
  { title: "Tamizhi Explorer", url: "https://explorer.tamizhi.ai", icon: "compass" as const },
  { title: "Tamizhi Wallet", url: "tamizhi://wallet", icon: "wallet" as const },
  { title: "Literature Browser", url: "https://literature.tamizhi.ai", icon: "book-open-variant" as const },
  { title: "Tamil Wikipedia", url: "https://ta.wikipedia.org", icon: "wikipedia" as const },
  { title: "IPFS Gateway", url: "ipfs://", icon: "ip-network" as const },
  { title: "DuckDuckGo", url: "https://duckduckgo.com", icon: "duck" as const },
];

export default function Home() {
  const [search, setSearch] = useState("");

  function go(url: string) {
    router.push({ pathname: "/browser", params: { url } });
  }

  function submitSearch() {
    if (!search.trim()) return;
    const url = search.includes(".") || search.startsWith("http")
      ? (search.startsWith("http") ? search : `https://${search}`)
      : `https://duckduckgo.com/?q=${encodeURIComponent(search)}`;
    go(url);
    setSearch("");
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <Text style={s.tamil}>தமிழி</Text>
        <Text style={s.brand}>Browser</Text>
      </View>

      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={22} color="#8a8aa0" />
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

      <Text style={s.sectionTitle}>Suggested dApps</Text>
      <View style={s.grid}>
        {SUGGESTED.map((item) => (
          <TouchableOpacity key={item.url} style={s.tile} onPress={() => go(item.url)}>
            <MaterialCommunityIcons name={item.icon} size={28} color="#00d4ff" />
            <Text style={s.tileLabel} numberOfLines={1}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionTitle}>Quick actions</Text>
      <TouchableOpacity style={s.actionRow} onPress={() => router.push("/(tabs)/bookmarks")}>
        <MaterialCommunityIcons name="bookmark-multiple" size={20} color="#00d4ff" />
        <Text style={s.actionText}>View all bookmarks</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.actionRow} onPress={() => router.push("/(tabs)/history")}>
        <MaterialCommunityIcons name="history" size={20} color="#00d4ff" />
        <Text style={s.actionText}>Browsing history</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.actionRow} onPress={() => go("tamizhi://wallet")}>
        <MaterialCommunityIcons name="wallet" size={20} color="#d4a017" />
        <Text style={s.actionText}>Built-in wallet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 8 },
  tamil: { fontSize: 22, color: "#00d4ff", fontWeight: "700" },
  brand: { fontSize: 32, color: "#fdf6e3", fontWeight: "800", marginTop: 4 },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 24, marginTop: 16, paddingHorizontal: 16, backgroundColor: "#1a1040", borderRadius: 14, borderWidth: 1, borderColor: "#2a1f5c" },
  searchInput: { flex: 1, color: "#fdf6e3", padding: 14, fontSize: 15 },
  sectionTitle: { color: "#8a8aa0", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 28, marginHorizontal: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  tile: { width: "31%", aspectRatio: 1, margin: "1%", backgroundColor: "#1a1040", borderRadius: 14, alignItems: "center", justifyContent: "center", padding: 8, borderWidth: 1, borderColor: "#2a1f5c" },
  tileLabel: { color: "#fdf6e3", fontSize: 11, marginTop: 8, textAlign: "center", fontWeight: "600" },
  actionRow: { flexDirection: "row", alignItems: "center", padding: 16, marginHorizontal: 24, marginTop: 8, backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, borderColor: "#2a1f5c" },
  actionText: { color: "#fdf6e3", marginLeft: 12, fontWeight: "600" },
});
