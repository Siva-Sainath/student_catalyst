import React, { useState, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet,
  Pressable, Linking, ActivityIndicator, RefreshControl
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getJobs } from "../api";
import { theme } from "../theme";

export function JobsScreen() {
  const [jobs, setJobs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState<"all" | "internshala" | "fallback">("all");

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const d = await getJobs();
      setJobs(d.jobs ?? []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.source === filter);

  if (loading) return <Center />;

  const liveCount = jobs.filter(j => j.source === "internshala").length;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
    >
      {/* Header card */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{jobs.length} Internships</Text>
        <Text style={styles.headerSub}>
          {liveCount > 0 ? `${liveCount} live from Internshala · ` : ""}Curated listings
        </Text>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(["all", "internshala", "fallback"] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === "all" ? "All" : f === "internshala" ? "Live" : "Curated"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filtered.map((job, i) => (
        <JobCard key={i} job={job} />
      ))}
    </ScrollView>
  );
}

function JobCard({ job: j }: { job: any }) {
  const isLive = j.source === "internshala";
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.role} numberOfLines={1}>{j.role}</Text>
            {isLive && <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>}
          </View>
          <Text style={styles.company}>{j.company}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaTag icon="📍" text={j.location} />
        <MetaTag icon="💰" text={j.stipend} />
        <MetaTag icon="⏰" text={j.deadline} />
      </View>

      {j.skills?.length > 0 && (
        <View style={styles.skillRow}>
          {j.skills.slice(0, 4).map((s: string, i: number) => (
            <View key={i} style={styles.skill}>
              <Text style={styles.skillText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={styles.applyBtn}
        onPress={() => j.apply_link && Linking.openURL(j.apply_link)}
      >
        <Text style={styles.applyText}>Apply →</Text>
      </Pressable>
    </View>
  );
}

function MetaTag({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.metaTag}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function Center() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  page:          { flex: 1, backgroundColor: theme.bg },
  pad:           { padding: 16, paddingBottom: 40 },
  header:        { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
  headerTitle:   { color: theme.text, fontSize: 20, fontWeight: "700" },
  headerSub:     { color: theme.muted, fontSize: 12, marginTop: 2 },
  filterRow:     { marginBottom: 14 },
  pill:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, marginRight: 8 },
  pillActive:    { backgroundColor: theme.primary, borderColor: theme.primary },
  pillText:      { color: theme.muted, fontSize: 12, fontWeight: "600" },
  pillTextActive:{ color: "#fff" },
  card:          { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardTop:       { flexDirection: "row", marginBottom: 10 },
  titleRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  role:          { color: theme.text, fontSize: 15, fontWeight: "600", flex: 1 },
  company:       { color: theme.muted, fontSize: 12 },
  liveBadge:     { backgroundColor: theme.success + "22", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  liveText:      { color: theme.success, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  metaRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metaTag:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaIcon:      { fontSize: 10 },
  metaText:      { color: theme.muted, fontSize: 11 },
  skillRow:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  skill:         { backgroundColor: theme.primaryBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: theme.primary + "40" },
  skillText:     { color: theme.primary, fontSize: 10 },
  applyBtn:      { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  applyText:     { color: "#fff", fontSize: 13, fontWeight: "700" },
});
