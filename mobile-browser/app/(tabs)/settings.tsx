import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from "react-native";

export default function Settings() {
  const [searchEngine, setSearchEngine] = useState<"DuckDuckGo" | "Google" | "Brave">("DuckDuckGo");
  const [blockTrackers, setBlockTrackers] = useState(true);
  const [enableWeb3, setEnableWeb3] = useState(true);

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={s.title}>Settings</Text>

      <Section title="Search">
        <Row label="Default search engine" value={searchEngine} onPress={() => {
          const order = ["DuckDuckGo", "Google", "Brave"] as const;
          setSearchEngine(order[(order.indexOf(searchEngine) + 1) % order.length]);
        }} />
      </Section>

      <Section title="Privacy">
        <ToggleRow label="Block third-party trackers" value={blockTrackers} onChange={setBlockTrackers} />
      </Section>

      <Section title="Web3">
        <ToggleRow label="Inject window.tamizhi provider" value={enableWeb3} onChange={setEnableWeb3} />
        <Row label="IPFS Gateway" value="https://ipfs.io" />
      </Section>

      <Section title="Wallet">
        <Row label="Built-in wallet" value="Manage" onPress={() => Alert.alert("Wallet", "Open the dedicated Tamizhi Wallet app for full features")} />
      </Section>

      <Section title="Data">
        <Row label="Clear browsing history" value="" onPress={() => Alert.alert("Cleared", "History deleted")} />
        <Row label="Clear bookmarks" value="" onPress={() => Alert.alert("Bookmarks", "Are you sure?")} />
      </Section>

      <Section title="About">
        <Row label="Version" value="0.1.0" />
        <Row label="Engine" value="WebView" />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBox}>{children}</View>
    </View>
  );
}

function Row({ label, value, onPress }: any) {
  const Comp: any = onPress ? TouchableOpacity : View;
  return (
    <Comp style={s.row} onPress={onPress}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </Comp>
  );
}

function ToggleRow({ label, value, onChange }: any) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: "#00d4ff", false: "#2a1f5c" }} thumbColor="#fdf6e3" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  title: { fontSize: 28, fontWeight: "800", color: "#fdf6e3", marginBottom: 24 },
  sectionTitle: { color: "#8a8aa0", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  sectionBox: { backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, borderColor: "#2a1f5c" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#2a1f5c" },
  rowLabel: { color: "#fdf6e3", fontSize: 14, flex: 1 },
  rowValue: { color: "#00d4ff", fontSize: 14, fontWeight: "600" },
});
