import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const REST = "http://localhost:1317";
const UTMZ_FACTOR = 1_000_000;

function formatTMZ(amountUtmz: string | number): string {
  const n = typeof amountUtmz === "string" ? parseInt(amountUtmz, 10) : amountUtmz;
  if (isNaN(n)) return "0";
  return (n / UTMZ_FACTOR).toFixed(6).replace(/\.?0+$/, "");
}

function truncate(addr: string, n = 6): string {
  if (!addr || addr.length <= 2 * n + 3) return addr || "—";
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export default function Dashboard() {
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [refreshing, setRefreshing] = useState(false);
  const [txs, setTxs] = useState<any[]>([]);

  async function load() {
    try {
      // TODO: get address from secure-store keystore unlock flow
      const addr = address || "tamizhi1...";
      if (addr === "tamizhi1...") return;
      const res = await fetch(`${REST}/cosmos/bank/v1beta1/balances/${addr}`);
      const data = await res.json();
      const utmz = data.balances?.find((b: any) => b.denom === "utmz");
      setBalance(utmz?.amount ?? "0");
    } catch (e) {
      console.warn("balance fetch failed", e);
    }
  }

  useEffect(() => {
    load();
  }, [address]);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#d4a017" />}
    >
      <View style={s.header}>
        <Text style={s.tamil}>தமிழி</Text>
        <Text style={s.brand}>Wallet</Text>
      </View>

      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Total Balance</Text>
        <View style={s.balanceRow}>
          <Text style={s.balanceAmount}>{formatTMZ(balance)}</Text>
          <Text style={s.balanceDenom}>TMZ</Text>
        </View>
        <Text style={s.balanceUSD}>≈ $0.00 USD</Text>
        <Text style={s.address}>{truncate(address) || "Tap to unlock wallet"}</Text>
      </View>

      <View style={s.actions}>
        {[
          { name: "Send", icon: "arrow-up-bold-circle" as const, route: "/(tabs)/send" },
          { name: "Receive", icon: "arrow-down-bold-circle" as const, route: "/(tabs)/receive" },
          { name: "Stake", icon: "finance" as const, route: "/(tabs)/stake" },
          { name: "History", icon: "history" as const, route: "/(tabs)/settings" },
        ].map((a) => (
          <TouchableOpacity key={a.name} style={s.actionTile} onPress={() => router.push(a.route as any)}>
            <MaterialCommunityIcons name={a.icon} size={28} color="#d4a017" />
            <Text style={s.actionLabel}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Recent Transactions</Text>
        {txs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No transactions yet</Text>
            <Text style={s.emptySub}>Receive TMZ to get started</Text>
          </View>
        ) : (
          txs.map((t, i) => (
            <View key={i} style={s.txRow}>
              <Text style={s.txType}>{t.type}</Text>
              <Text style={s.txAmount}>{t.amount}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 },
  tamil: { fontSize: 22, color: "#d4a017", fontWeight: "700" },
  brand: { fontSize: 32, color: "#fdf6e3", fontWeight: "800", marginTop: 4 },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: "#1a1040",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2a1f5c",
  },
  balanceLabel: { color: "#8a8aa0", fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  balanceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  balanceAmount: { fontSize: 42, fontWeight: "800", color: "#fdf6e3" },
  balanceDenom: { fontSize: 18, color: "#d4a017", fontWeight: "700", marginLeft: 8 },
  balanceUSD: { color: "#8a8aa0", marginTop: 4 },
  address: { color: "#d4a017", marginTop: 12, fontSize: 12, fontFamily: "monospace" },
  actions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, marginTop: 16 },
  actionTile: {
    width: "23%",
    aspectRatio: 1,
    margin: "1%",
    backgroundColor: "#1a1040",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a1f5c",
  },
  actionLabel: { color: "#fdf6e3", fontSize: 11, marginTop: 6, fontWeight: "600" },
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: { color: "#fdf6e3", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { color: "#8a8aa0", fontSize: 14 },
  emptySub: { color: "#5a5a72", fontSize: 12, marginTop: 4 },
  txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1a1040" },
  txType: { color: "#fdf6e3" },
  txAmount: { color: "#d4a017", fontWeight: "700" },
});
