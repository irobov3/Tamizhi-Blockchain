import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabsView() {
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Open Tabs</Text>
      </View>
      <View style={s.empty}>
        <MaterialCommunityIcons name="tab" size={64} color="#2a1f5c" />
        <Text style={s.emptyTitle}>No open tabs</Text>
        <TouchableOpacity style={s.button} onPress={() => router.push("/(tabs)/")}>
          <Text style={s.buttonText}>+ New tab</Text>
        </TouchableOpacity>
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
  button: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#00d4ff", borderRadius: 12 },
  buttonText: { color: "#0e0824", fontWeight: "700" },
});
