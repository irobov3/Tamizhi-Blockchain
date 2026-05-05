import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function History() {
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>History</Text>
      </View>
      <View style={s.empty}>
        <MaterialCommunityIcons name="history" size={64} color="#2a1f5c" />
        <Text style={s.emptyTitle}>No history yet</Text>
        <Text style={s.emptyText}>Sites you visit will appear here</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#fdf6e3" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#fdf6e3", fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptyText: { color: "#8a8aa0", marginTop: 4 },
});
