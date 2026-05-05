import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";

export default function Receive() {
  // TODO: pull from wallet store after unlock
  const address = "tamizhi1abc...placeholder...xyz";

  async function copy() {
    await Clipboard.setStringAsync(address);
    Alert.alert("Copied", "Address copied to clipboard");
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 24, paddingTop: 60, alignItems: "center" }}>
      <Text style={s.title}>Receive TMZ</Text>
      <Text style={s.subtitle}>Share this address to receive Tamizhi tokens</Text>

      <View style={s.qrContainer}>
        <QRCode
          value={address}
          size={240}
          backgroundColor="#fdf6e3"
          color="#1a1040"
        />
      </View>

      <View style={s.addressBox}>
        <Text style={s.addressText} selectable>{address}</Text>
      </View>

      <TouchableOpacity style={s.copyButton} onPress={copy}>
        <Text style={s.copyButtonText}>📋 Copy address</Text>
      </TouchableOpacity>

      <View style={s.notice}>
        <Text style={s.noticeText}>
          ⚠ Only send TMZ to this address. Other tokens will be lost.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  title: { fontSize: 28, fontWeight: "800", color: "#fdf6e3", marginBottom: 8 },
  subtitle: { color: "#8a8aa0", marginBottom: 32, textAlign: "center" },
  qrContainer: { padding: 16, backgroundColor: "#fdf6e3", borderRadius: 16 },
  addressBox: { marginTop: 24, padding: 16, backgroundColor: "#1a1040", borderRadius: 12, borderWidth: 1, borderColor: "#2a1f5c", width: "100%" },
  addressText: { color: "#d4a017", fontFamily: "monospace", textAlign: "center", fontSize: 13 },
  copyButton: { backgroundColor: "#d4a017", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginTop: 16 },
  copyButtonText: { color: "#1a1040", fontWeight: "800", fontSize: 14 },
  notice: { marginTop: 32, padding: 16, backgroundColor: "rgba(192, 57, 43, 0.1)", borderRadius: 12, borderWidth: 1, borderColor: "#c0392b" },
  noticeText: { color: "#c0392b", fontSize: 13 },
});
