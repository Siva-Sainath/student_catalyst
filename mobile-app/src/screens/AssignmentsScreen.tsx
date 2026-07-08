import React, { useState, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet,
  ActivityIndicator, Pressable, RefreshControl,
  TextInput, Modal, Alert
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAssignments, addAssignment, deleteAssignment, updateAssignment } from "../api";
import { theme } from "../theme";

export function AssignmentsScreen() {
  const [data, setData]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [newSubject, setNewSubject] = useState("OS");
  const [newType, setNewType]       = useState("coding");
  const [dueDays, setDueDays]       = useState("3"); // days from now
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const d = await getAssignments();
      setData(d.assignments ?? []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    try {
      const days = parseInt(dueDays) || 3;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const isoDate = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
      
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, {
          title: newTitle.trim(),
          subject: newSubject,
          due_date: isoDate,
          type: newType
        });
      } else {
        await addAssignment(newTitle.trim(), newSubject, isoDate, newType);
      }
      setNewTitle("");
      setDueDays("3");
      setEditingAssignment(null);
      setShowModal(false);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save assignment");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAssignment(id);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete assignment");
    }
  };

  if (loading) return <Center />;

  return (
    <View style={styles.page}>
      {/* Header action */}
      <View style={styles.header}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{data.length} Assignments</Text>
          <Text style={styles.summarySub}>Your campus delivery pipeline</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => {
          setEditingAssignment(null);
          setNewTitle("");
          setNewSubject("OS");
          setNewType("coding");
          setDueDays("3");
          setShowModal(true);
        }}>
          <Text style={styles.addBtnText}>+ New Task</Text>
        </Pressable>
      </View>
 
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        {data.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No assignments pending. You are all caught up!</Text>
          </View>
        ) : (
          data.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onDelete={() => handleDelete(a.id)}
              onEdit={() => {
                setEditingAssignment(a);
                setNewTitle(a.title);
                setNewSubject(a.subject);
                setNewType(a.type);
                setDueDays("3");
                setShowModal(true);
              }}
            />
          ))
        )}
      </ScrollView>
 
      {/* Modern creation modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => { setShowModal(false); setEditingAssignment(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAssignment ? "Edit Task" : "Create Task"}</Text>
              <Pressable onPress={() => { setShowModal(false); setEditingAssignment(null); }}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>TASK TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Implement hash map in C++"
              placeholderTextColor={theme.faint}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.label}>SUBJECT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsRow}>
              {["OS", "Algorithms", "Mobile dev", "TFC", "Cryptography", "LAO", "SE"].map(s => {
                const selected = newSubject === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.subjectChip, selected && styles.subjectChipSelected]}
                    onPress={() => setNewSubject(s)}
                  >
                    <Text style={[styles.chipText, selected && { color: "#fff" }]}>
                      {s.split(" ")[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>TYPE</Text>
            <View style={styles.typeRow}>
              {["coding", "lab", "design", "report"].map(t => {
                const selected = newType === t;
                return (
                  <Pressable
                    key={t}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => setNewType(t)}
                  >
                    <Text style={[styles.typeText, selected && { color: "#fff" }]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>DUE DATE (DAYS FROM NOW)</Text>
            <View style={styles.daysRow}>
              {["1", "2", "3", "5", "7", "10"].map(d => {
                const selected = dueDays === d;
                return (
                  <Pressable
                    key={d}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                    onPress={() => setDueDays(d)}
                  >
                    <Text style={[styles.dayText, selected && { color: "#fff" }]}>{d}d</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.submitBtn} onPress={handleAdd}>
              <Text style={styles.submitBtnText}>{editingAssignment ? "Save Changes" : "Publish Assignment"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AssignmentCard({ assignment: a, onDelete, onEdit }: {
  assignment: any; onDelete: () => void; onEdit: () => void;
}) {
  const urgencyColor = a.urgency === "urgent" ? theme.danger : a.urgency === "soon" ? theme.warn : theme.muted;
  const typeColor    = { coding: theme.primary, lab: theme.info, design: theme.warn, report: theme.success }[a.type as string] ?? theme.muted;

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardBody} onPress={onEdit}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
          <Text style={styles.subject}>{a.subject}</Text>
        </View>
        <Text style={styles.title}>{a.title}</Text>
        
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: typeColor + "18" }]}>
            <Text style={[styles.tagText, { color: typeColor }]}>{a.type.toUpperCase()}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: urgencyColor + "18" }]}>
            <Text style={[styles.tagText, { color: urgencyColor }]}>{a.due_label}</Text>
          </View>
        </View>
      </Pressable>
      
      <Pressable style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </Pressable>
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
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  summary:       { flex: 1 },
  summaryTitle:  { color: theme.text, fontSize: 20, fontWeight: "700" },
  summarySub:    { color: theme.muted, fontSize: 12, marginTop: 2 },
  addBtn:        { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:    { color: "#fff", fontSize: 13, fontWeight: "600" },
  pad:           { padding: 16, paddingBottom: 40 },
  empty:         { paddingVertical: 60, alignItems: "center" },
  emptyText:     { color: theme.muted, fontSize: 14, textAlign: "center" },
  card:          { flexDirection: "row", backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  cardBody:      { flex: 1 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  typeDot:       { width: 6, height: 6, borderRadius: 3 },
  subject:       { color: theme.muted, fontSize: 11, fontWeight: "600" },
  title:         { color: theme.text, fontSize: 15, fontWeight: "600", marginBottom: 12, lineHeight: 21 },
  tagRow:        { flexDirection: "row", gap: 6 },
  tag:           { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:       { fontSize: 9, fontWeight: "700" },
  deleteBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.surface3, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  deleteIcon:    { color: theme.danger, fontSize: 14 },
  
  // Modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent:  { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: theme.border },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:    { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeBtn:      { color: theme.muted, fontSize: 24, fontWeight: "300" },
  label:         { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input:         { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 14 },
  subjectsRow:   { flexDirection: "row", marginVertical: 4 },
  subjectChip:   { backgroundColor: theme.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  subjectChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText:      { color: theme.muted, fontSize: 12 },
  typeRow:       { flexDirection: "row", gap: 8, marginVertical: 4 },
  typeChip:      { flex: 1, backgroundColor: theme.surface2, borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: theme.border },
  typeChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeText:      { color: theme.muted, fontSize: 12 },
  daysRow:       { flexDirection: "row", gap: 8, marginVertical: 4 },
  dayChip:       { flex: 1, backgroundColor: theme.surface2, borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: theme.border },
  dayChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayText:       { color: theme.muted, fontSize: 12 },
  submitBtn:     { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
