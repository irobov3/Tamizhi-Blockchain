import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";

const REST = "http://localhost:1317";

interface Validator {
  operator_address: string;
  description: { moniker: string };
  commission: { commission_rates: { rate: string } };
  tokens: string;
  jailed: boolean;
}

export default function Stake() {
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`${REST}/cosmos/staking/v1beta1/validators?pagination.limit=50`);
      const data = await res.json();
      setValidators(data.validators ?? []);
    } catch (e) {
      console.warn("validators fetch failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: 24, paddingTop: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#d4a017" />}
    >
      <Text style={s.title}>Staking</Text>
      <Text style={s.subtitle}>Earn TMZ rewards by delegating to validators</Text>

      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>Your Stake</Text>
        <Text style={s.summaryAmount}>0.000000 TMZ</Text>
        <Text style={s.summaryRewards}>Pending rewards: 0 TMZ</Text>
      </View>

      <Text style={s.sectionTitle}>Active Validators ({validators.length})</Text>

      {validators.length === 0 ? (
        <Text style={s.empty}>{loading ? "Loading…" : "No validators found"}</Text>
      ) : (
        validators.map((v) => {
          const commission = (parseFloat(v.commission?.commission_rates?.rate ?? "0") * 100).toFixed(1);
          const power = parseInt(v.tokens ?? "0", 10) / 1_000_000;
          return (
            <View key={v.operator_address} style={s.validatorRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.validatorName}>{v.description?.moniker ?? "Unknown"}</Text>
                <Text style={s.validatorMeta}>
                  Commission {commission}% · {power.toFixed(0)} TMZ
                </Text>
              </View>
              <TouchableOpacity style={s.delegateButton}>
                <Text style={s.delegateText}>Delegate</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0e0824" },
  title: { fontSize: 28, fontWeight: "800", color: "#fdf6e3", marginBottom: 8 },
  subtitle: { color: "#8a8aa0", marginBottom: 24 },
  summaryCard: { padding: 20, backgroundColor: "#1a1040", borderRadius: 16, borderWidth: 1, borderColor: "#2a1f5c" },
  summaryLabel: { color: "#8a8aa0", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  summaryAmount: { color: "#fdf6e3", fontSize: 28, fontWeight: "800", marginTop: 8 },
  summaryRewards: { color: "#d4a017", marginTop: 4 },
  sectionTitle: { color: "#fdf6e3", fontSize: 16, fontWeight: "700", marginTop: 24, marginBottom: 12 },
  empty: { color: "#5a5a72", textAlign: "center", paddingVertical: 32 },
  validatorRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#1a1040", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#2a1f5c" },
  validatorName: { color: "#fdf6e3", fontWeight: "600" },
  validatorMeta: { color: "#8a8aa0", fontSize: 12, marginTop: 2 },
  delegateButton: { backgroundColor: "#d4a017", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  delegateText: { color: "#1a1040", fontWeight: "700", fontSize: 13 },
});
