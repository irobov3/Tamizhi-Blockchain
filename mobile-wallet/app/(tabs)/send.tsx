import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { router } from "expo-router";

export default function Send() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  const validAddress = recipient.startsWith("tamizhi1") && recipient.length >= 39;
  const validAmount = parseFloat(amount) > 0;
  const canSend = validAddress && validAmount && !loading;

  async function send() {
    if (!canSend) return;
    Alert.alert(
      "Confirm Send",
      `Send ${amount} TMZ to ${recipient.slice(0, 12)}…${recipient.slice(-6)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send", style: "default", onPress: async () => {
          setLoading(true);
          // TODO: import signing client from src/wallet/signing.ts and call sendTokens
          setTimeout(() => {
            setLoading(false);
            Alert.alert("Sent", "Transaction broadcast (simulated). Wire up keystore unlock to make it real.");
            router.replace("/(tabs)/");
          }, 1500);
        }},
      ]
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={s.title}>Send TMZ</Text>

      <Text style={s.label}>Recipient address</Text>
      <TextInput
        style={[s.input, !validAddress && recipient ? s.invalid : null]}
        placeholder="tamizhi1..."
        placeholderTextColor="#5a5a72"
        value={recipient}
        onChangeText={setRecipient}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {recipient && !validAddress && (
        <Text style={s.errorText}>Must start with `tamizhi1` and be 39+ chars</Text>
      )}

      <Text style={s.label}>Amount (TMZ)</Text>
      <TextInput
        style={s.input}
        placeholder="0.00"
        placeholderTextColor="#5a5a72"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text style={s.label}>Memo (optional)</Text>
      <TextInput
        style={s.input}
        placeholder="Note to recipient"
        placeholderTextColor="#5a5a72"
        value={memo}
        onChangeText={setMemo}
        maxLength={256}
      />

      <View style={s.feeRow}>
        <Text style={s.feeLabel}>Network fee (estimate)</Text>
        <Text style={s.feeAmount}>~ 0.001 TMZ</Text>
      </View>

      <TouchableOpacity
        style={[s.sendButton, !canSend && s.sendButtonDisabled]}
        onPress={send}
        disabled={!canSend}
      >
        <Text style={s.sendButtonText}>{loading ? "Broadcasting..." : "Send"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  title: { fontSize: 28, fontWeight: "800", color: "#fdf6e3", marginBottom: 24 },
  label: { color: "#8a8aa0", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 16 },
  input: {
    backgroundColor: "#1a1040",
    color: "#fdf6e3",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#2a1f5c",
  },
  invalid: { borderColor: "#c0392b" },
  errorText: { color: "#c0392b", fontSize: 12, marginTop: 4 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24, padding: 16, backgroundColor: "#1a1040", borderRadius: 12 },
  feeLabel: { color: "#8a8aa0" },
  feeAmount: { color: "#d4a017", fontWeight: "700" },
  sendButton: { backgroundColor: "#d4a017", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 32 },
  sendButtonDisabled: { backgroundColor: "#3a2a08" },
  sendButtonText: { color: "#1a1040", fontWeight: "800", fontSize: 16 },
});
