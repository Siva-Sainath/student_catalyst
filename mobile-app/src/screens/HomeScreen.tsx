import React, { useState, useCallback, useEffect } from "react";
import {
  ScrollView, View, Text, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Platform
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { getDashboard, getSchedule, getAssignments, getFinance } from "../api";
import { theme } from "../theme";

export function HomeScreen({ navigation }: any) {
  const [dashboard, setDashboard]   = useState<any>(null);
  const [schedule, setSchedule]     = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [finance, setFinance]         = useState<any>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const [d, s, a, f] = await Promise.all([
        getDashboard(),
        getSchedule().catch(() => null),
        getAssignments().catch(() => ({ assignments: [] })),
        getFinance().catch(() => null)
      ]);
      setDashboard(d);
      setSchedule(s);
      setAssignments(a.assignments ?? []);
      setFinance(f);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );

  const student = dashboard?.student ?? {};
  const stats = dashboard?.stats ?? {};
  
  // Find today's classes
  const todayDateStr = schedule?.today;
  const todayWeekDay = schedule?.week?.find((w: any) => w.date === todayDateStr);
  const classesToday = todayWeekDay?.classes ?? [];

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  
  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pad}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
    >
      {/* Hero Header */}
      <LinearGradient colors={[...theme.gradient]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <Text style={styles.heroSub}>{student.department} · {student.semester} · BMSCE Bengaluru</Text>
          <Text style={styles.liveClockText}>{formattedTime}</Text>
        </View>
        <Text style={styles.heroTitle}>{dashboard?.greeting ?? "Good evening"} 👋</Text>
        <Text style={styles.liveDateText}>{formattedDate}</Text>
        <View style={styles.statRow}>
          <StatChip label="Attendance" value={`${student.attendance ?? "--"}%`} color={theme.success} />
          <StatChip label="CGPA" value={`${student.cgpa ?? "--"}`} color={theme.primary} />
          <StatChip label="Due Today" value={`${stats.assignments_due_today ?? 0}`} color={theme.warn} />
        </View>
      </LinearGradient>
      
      {/* Dynamic Alert Banner */}
      {dashboard?.alert && (
        <View style={[
          styles.alertBanner,
          dashboard.alert.type === "danger" && styles.alertDanger,
          dashboard.alert.type === "warning" && styles.alertWarning,
          dashboard.alert.type === "success" && styles.alertSuccess,
          dashboard.alert.type === "info" && styles.alertInfo,
        ]}>
          <Text style={[
            styles.alertTitle,
            dashboard.alert.type === "danger" && { color: theme.danger },
            dashboard.alert.type === "warning" && { color: theme.warn },
            dashboard.alert.type === "success" && { color: theme.success },
            dashboard.alert.type === "info" && { color: theme.primary },
          ]}>{dashboard.alert.title}</Text>
          <Text style={styles.alertMessage}>{dashboard.alert.message}</Text>
        </View>
      )}

      {/* AI Assistant Insight */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.cardLabel, { color: theme.primary }]}>Hermes AI Recommendation</Text>
        </View>
        <Text style={styles.cardBody}>{dashboard?.ai_tip ?? "Loading recommendations…"}</Text>
      </View>

      {/* Dynamic Schedule / Next Class */}
      <Text style={styles.section}>TODAY'S CLASSES</Text>
      <View style={styles.card}>
        {classesToday.length === 0 ? (
          <Text style={styles.muted}>No classes scheduled for today. Rest up!</Text>
        ) : (
          classesToday.slice(0, 2).map((c: any, index: number) => (
            <View key={index} style={[styles.classRow, index > 0 && styles.classBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.classSubject}>{c.subject}</Text>
                <Text style={styles.classMeta}>{c.faculty} · Room {c.room}</Text>
              </View>
              <Text style={styles.classTime}>{c.start_time} - {c.end_time}</Text>
            </View>
          ))
        )}
      </View>

      {/* Pending Deliverables */}
      <Text style={styles.section}>UPCOMING ASSIGNMENTS</Text>
      <View style={styles.card}>
        {assignments.length === 0 ? (
          <Text style={styles.muted}>No assignments pending. Nice job!</Text>
        ) : (
          assignments.slice(0, 2).map((a: any, index: number) => {
            const urgencyColor = a.urgency === "urgent" ? theme.danger : a.urgency === "soon" ? theme.warn : theme.muted;
            return (
              <View key={a.id} style={[styles.classRow, index > 0 && styles.classBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.classSubject}>{a.title}</Text>
                  <Text style={styles.classMeta}>{a.subject}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: urgencyColor + "20" }]}>
                  <Text style={{ color: urgencyColor, fontSize: 10, fontWeight: "700" }}>{a.due_label}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Finance Overview */}
      {finance && (
        <>
          <Text style={styles.section}>FINANCE STATUS</Text>
          <View style={styles.card}>
            <View style={styles.financeHeader}>
              <Text style={styles.financeLabel}>Spent: ₹{finance.total_spent.toLocaleString("en-IN")}</Text>
              <Text style={styles.financeLabel}>Budget: ₹{finance.budget.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[
                styles.barFill,
                {
                  width: `${Math.min((finance.total_spent / finance.budget) * 100, 100)}%`,
                  backgroundColor: (finance.total_spent / finance.budget) > 0.9 ? theme.danger : theme.primary
                }
              ]} />
            </View>
            <Text style={styles.financeSub}>₹{finance.budget_remaining.toLocaleString("en-IN")} remaining for {finance.month}</Text>
          </View>
        </>
      )}

      {/* Exam Countdown */}
      {stats.exam_in_days && (
        <View style={[styles.card, { marginTop: 8 }]}>
          <Text style={styles.cardLabel}>Upcoming Semester Exams</Text>
          <Text style={styles.bigNum}>{stats.exam_in_days} days</Text>
          <Text style={styles.muted}>Exam countdown is active. Keep grinding!</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipVal, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page:      { flex: 1, backgroundColor: theme.bg },
  pad:       { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  hero:      { borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
  heroSub:   { color: theme.muted, fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  heroTitle: { color: theme.text, fontSize: 22, fontWeight: "700", marginBottom: 20 },
  liveClockText: { color: "#fff", opacity: 0.85, fontSize: 12, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "CourierNewPS-BoldMT" : "monospace" },
  liveDateText:  { color: "#fff", opacity: 0.7, fontSize: 13, marginTop: -14, marginBottom: 18 },
  statRow:   { flexDirection: "row", justifyContent: "space-around" },
  chip:      { alignItems: "center", flex: 1 },
  chipVal:   { fontSize: 20, fontWeight: "700" },
  chipLabel: { color: theme.muted, fontSize: 10, marginTop: 3 },
  card:      { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardHeader:{ flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginRight: 8 },
  cardLabel: { color: theme.primary, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  cardBody:  { color: theme.soft, fontSize: 14, lineHeight: 21 },
  section:   { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12, marginTop: 8 },
  bigNum:    { color: theme.text, fontSize: 36, fontWeight: "700", marginVertical: 4 },
  muted:     { color: theme.muted, fontSize: 12 },
  
  // Custom Dynamic Card layout
  classRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  classBorder:   { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 6, paddingTop: 10 },
  classSubject:  { color: theme.text, fontSize: 14, fontWeight: "600" },
  classMeta:     { color: theme.muted, fontSize: 11, marginTop: 3 },
  classTime:     { color: theme.primary, fontSize: 12, fontWeight: "600" },
  badge:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  
  financeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  financeLabel:  { color: theme.text, fontSize: 13, fontWeight: "600" },
  barBg:         { height: 6, backgroundColor: theme.surface3, borderRadius: 3, marginBottom: 8 },
  barFill:       { height: 6, borderRadius: 3 },
  financeSub:    { color: theme.muted, fontSize: 11 },
  
  alertBanner:   { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  alertTitle:    { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  alertMessage:  { color: theme.soft, fontSize: 13, lineHeight: 18 },
  alertDanger:   { backgroundColor: theme.danger + "12", borderColor: theme.danger + "30" },
  alertWarning:  { backgroundColor: theme.warn + "12", borderColor: theme.warn + "30" },
  alertSuccess:  { backgroundColor: theme.success + "12", borderColor: theme.success + "30" },
  alertInfo:     { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" },
});
