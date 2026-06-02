import React, { useEffect, useState } from "react";
import { ScrollView, Text, StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Api } from "../api";
import { Card } from "../components/Card";
import { theme } from "../theme";

export function HomeScreen({ navigation }: any) {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    Api.ensureAuth().then(() => Api.getDashboard()).then(setD).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <LinearGradient colors={[...theme.gradient]} style={styles.hero}>
        <Text style={styles.heroSub}>VIT Chennai</Text>
        <Text style={styles.heroTitle}>{d?.greeting || "Campus AI"}</Text>
        <View style={styles.row}>
          <Stat label="Attendance" value={`${d?.student?.attendance ?? "--"}%`} color={theme.success} />
          <Stat label="CGPA" value={`${d?.student?.cgpa ?? "--"}`} color={theme.warn} />
          <Stat label="Due" value={`${d?.stats?.assignments_due_today ?? 0}`} color={theme.text} />
        </View>
      </LinearGradient>
      <Card>
        <Text style={styles.tipLabel}>AI insight</Text>
        <Text style={styles.tip}>{d?.ai_tip || "Loading insights from your Mac server…"}</Text>
      </Card>
      <Text style={styles.section}>Quick access</Text>
      {[
        ["Chat", "chat"],
        ["Attendance", "attendance"],
        ["Jobs", "jobs"],
        ["Finance", "finance"],
      ].map(([label, route]) => (
        <Pressable key={route} style={styles.link} onPress={() => navigation.navigate(route)}>
          <Text style={styles.linkText}>{label}</Text>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  pad: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#2a4aaa" },
  heroSub: { color: "#93c5fd", fontSize: 12 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 4, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statVal: { fontSize: 18, fontWeight: "700" },
  statLbl: { color: "#93c5fd", fontSize: 10, marginTop: 2 },
  tipLabel: { color: theme.primary, fontSize: 12, fontWeight: "600" },
  tip: { color: theme.soft, fontSize: 13, marginTop: 6, lineHeight: 20 },
  section: { color: theme.muted, fontSize: 11, fontWeight: "600", marginBottom: 8, letterSpacing: 1 },
  link: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 8,
  },
  linkText: { color: theme.text, fontSize: 15, fontWeight: "600" },
  chev: { color: theme.muted, fontSize: 22 },
});
