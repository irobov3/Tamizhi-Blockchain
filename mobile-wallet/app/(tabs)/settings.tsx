import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";

export default function Settings() {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [biometric, setBiometric] = useState(true);
  const [tamilFirst, setTamilFirst] = useState(false);

  async function backup() {
    Alert.alert("Backup", "Authenticate to view your seed phrase. Stored securely on this device only.");
  }

  async function reset() {
    Alert.alert("Reset Wallet?", "This will delete your keys from this device. You will need your seed phrase to recover.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: async () => {
        await SecureStore.deleteItemAsync("tamizhi.wallet.encrypted");
        Alert.alert("Reset", "Wallet cleared. Restart the app.");
      }},
    ]);
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={s.title}>Settings</Text>

      <Section title="Network">
        <Row label="Active network" value={network === "testnet" ? "Tamizhi Testnet" : "Tamizhi Mainnet"} onPress={() => setNetwork(network === "testnet" ? "mainnet" : "testnet")} />
      </Section>

      <Section title="Security">
        <ToggleRow label="Require biometric on send" value={biometric} onChange={setBiometric} />
        <Row label="Backup seed phrase" value="View 24-word recovery" onPress={backup} />
      </Section>

      <Section title="Display">
        <ToggleRow label="Tamil-first labels (தமிழ்)" value={tamilFirst} onChange={setTamilFirst} />
      </Section>

      <Section title="About">
        <Row label="Version" value="0.1.0" />
        <Row label="Chain ID" value="tamizhi-1" />
      </Section>

      <TouchableOpacity style={s.dangerButton} onPress={reset}>
        <Text style={s.dangerText}>Reset Wallet</Text>
      </TouchableOpacity>
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
      <Switch value={value} onValueChange={onChange} trackColor={{ true: "#d4a017", false: "#2a1f5c" }} thumbColor="#fdf6e3" />
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
  rowValue: { color: "#d4a017", fontSize: 14, fontWeight: "600" },
  dangerButton: { marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#c0392b", alignItems: "center" },
  dangerText: { color: "#c0392b", fontWeight: "700" },
});
