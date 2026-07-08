import React, { useState, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput, Pressable, Alert
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAttendance, updateAttendance } from "../api";
import { theme } from "../theme";

export function AttendanceScreen() {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Attendance State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [editAttended, setEditAttended]     = useState("");
  const [editTotal, setEditTotal]           = useState("");

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setData(await getAttendance());
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const handleOpenEdit = (course: any) => {
    setSelectedCourse(course);
    setEditAttended(course.attended.toString());
    setEditTotal(course.total.toString());
    setShowEditModal(true);
  };

  const handleUpdateCourseAttendance = async () => {
    const numAttended = parseInt(editAttended);
    const numTotal = parseInt(editTotal);
    if (isNaN(numAttended) || isNaN(numTotal) || numAttended < 0 || numTotal <= 0) {
      Alert.alert("Error", "Please enter valid non-negative numbers (total must be > 0).");
      return;
    }
    if (numAttended > numTotal) {
      Alert.alert("Error", "Attended classes cannot exceed total classes.");
      return;
    }
    try {
      await updateAttendance(selectedCourse.id, numAttended, numTotal);
      setShowEditModal(false);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update attendance.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Center />;

  const overall = data?.overall ?? {};
  const courses = data?.courses ?? [];

  return (
    <View style={styles.page}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        {/* Overall badge */}
        <View style={[styles.overallCard, { borderColor: statusColor(overall.status) }]}>
          <Text style={styles.overallLabel}>Overall Attendance</Text>
          <Text style={[styles.overallPct, { color: statusColor(overall.status) }]}>
            {overall.percentage}%
          </Text>
          <Text style={styles.overallSub}>{overall.attended} / {overall.total} classes</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor(overall.status) + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor(overall.status) }]}>
              {statusLabel(overall.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>SUBJECT BREAKDOWN (TAP TO EDIT)</Text>
        {courses.map((c: any) => (
          <CourseCard key={c.code} course={c} onPress={() => handleOpenEdit(c)} />
        ))}
      </ScrollView>

      {/* Edit Attendance Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Attendance</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            {selectedCourse && (
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600", marginBottom: 12 }}>
                {selectedCourse.subject} ({selectedCourse.code})
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CLASSES ATTENDED</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Attended"
                  placeholderTextColor={theme.faint}
                  value={editAttended}
                  onChangeText={setEditAttended}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>TOTAL CLASSES</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Total"
                  placeholderTextColor={theme.faint}
                  value={editTotal}
                  onChangeText={setEditTotal}
                />
              </View>
            </View>

            <Pressable style={styles.submitBtn} onPress={handleUpdateCourseAttendance}>
              <Text style={styles.submitBtnText}>Save Attendance</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CourseCard({ course: c, onPress }: { course: any; onPress: () => void }) {
  const color = statusColor(c.status);
  const pct = c.percentage / 100;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName} numberOfLines={1}>{c.subject}</Text>
          <Text style={styles.profName}>{c.professor} · {c.code}</Text>
        </View>
        <Text style={[styles.pctBig, { color }]}>{c.percentage}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${Math.min(c.percentage, 100)}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.meta}>{c.attended}/{c.total} classes</Text>
        {c.safe_bunks > 0 ? (
          <View style={styles.bunkPill}>
            <Text style={styles.bunkText}>{c.safe_bunks} safe bunks</Text>
          </View>
        ) : (
          <View style={[styles.bunkPill, { backgroundColor: "#2a1010" }]}>
            <Text style={[styles.bunkText, { color: theme.danger }]}>No bunks left</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function statusColor(s: string) {
  if (s === "safe") return theme.success;
  if (s === "warning") return theme.warn;
  return theme.danger;
}

function statusLabel(s: string) {
  if (s === "safe") return "✓ Safe";
  if (s === "warning") return "⚠ Warning";
  return "✗ Danger";
}

function Center() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  page:         { flex: 1, backgroundColor: theme.bg },
  pad:          { padding: 16, paddingBottom: 40 },
  overallCard:  { borderRadius: 20, borderWidth: 2, padding: 24, marginBottom: 20, backgroundColor: theme.surface, alignItems: "center" },
  overallLabel: { color: theme.muted, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  overallPct:   { fontSize: 56, fontWeight: "700" },
  overallSub:   { color: theme.muted, fontSize: 13, marginTop: 4 },
  statusPill:   { marginTop: 12, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  statusText:   { fontSize: 13, fontWeight: "600" },
  section:      { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12 },
  card:         { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  cardTop:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  subjectName:  { color: theme.text, fontSize: 14, fontWeight: "600" },
  profName:     { color: theme.muted, fontSize: 11, marginTop: 2 },
  pctBig:       { fontSize: 22, fontWeight: "700" },
  barBg:        { height: 4, backgroundColor: theme.surface3, borderRadius: 2, marginBottom: 10 },
  barFill:      { height: 4, borderRadius: 2 },
  cardBottom:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta:         { color: theme.muted, fontSize: 12 },
  bunkPill:     { backgroundColor: "#0f2a0f", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  bunkText:     { color: theme.success, fontSize: 11, fontWeight: "600" },

  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent:  { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: theme.border },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:    { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeBtn:      { color: theme.muted, fontSize: 24, fontWeight: "300" },
  label:         { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input:         { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 14, marginBottom: 8 },
  submitBtn:     { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
