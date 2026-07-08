import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  Pressable, ActivityIndicator, RefreshControl
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getSchedule, addScheduleEvent, deleteScheduleEvent, updateScheduleEvent } from "../api";
import { theme } from "../theme";
import { Modal, TextInput, Alert } from "react-native";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ScheduleScreen() {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Add Event Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [subject, setSubject]           = useState("");
  const [startTime, setStartTime]       = useState("09:00");
  const [endTime, setEndTime]           = useState("10:30");
  const [room, setRoom]                 = useState("SJT 302");
  const [faculty, setFaculty]           = useState("Prof. Raman");
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const d = await getSchedule();
      setData(d);
      // Auto-select today
      const today = d.week?.find((w: any) => w.is_today);
      setSelectedDay(prev => prev ?? today?.day ?? d.week?.[0]?.day ?? "Mon");
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const handleAddEvent = async () => {
    if (!subject.trim()) {
      Alert.alert("Error", "Please enter a subject / event name.");
      return;
    }
    const dayData = data?.week?.find((w: any) => w.day === selectedDay);
    const dateStr = dayData ? dayData.date.split("T")[0] : new Date().toISOString().split("T")[0];

    try {
      if (editingEvent) {
        await updateScheduleEvent(editingEvent.id, {
          day: selectedDay || "Mon",
          date: dateStr,
          subject: subject.trim(),
          start_time: startTime.trim(),
          end_time: endTime.trim(),
          room: room.trim(),
          faculty: faculty.trim(),
        });
      } else {
        await addScheduleEvent({
          day: selectedDay || "Mon",
          date: dateStr,
          subject: subject.trim(),
          start_time: startTime.trim(),
          end_time: endTime.trim(),
          room: room.trim(),
          faculty: faculty.trim(),
          status: "scheduled"
        });
      }
      setSubject("");
      setEditingEvent(null);
      setShowAddModal(false);
      await load(true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save event.");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event from your schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteScheduleEvent(id);
              await load(true);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete event.");
            }
          }
        }
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Center />;

  const week: any[] = data?.week ?? [];
  const dayData = week.find(w => w.day === selectedDay);
  const classes = dayData?.classes ?? [];

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Weekly Schedule</Text>
          <Text style={styles.headerSub}>Lectures & events</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => {
          setEditingEvent(null);
          setSubject("");
          setStartTime("09:00");
          setEndTime("10:30");
          setRoom("SJT 302");
          setFaculty("Prof. Raman");
          setShowAddModal(true);
        }}>
          <Text style={styles.addBtnText}>+ Add Event</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        {/* Day selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {week.map(w => (
            <Pressable
              key={w.day}
              style={[styles.dayTab, selectedDay === w.day && styles.dayTabActive, w.is_today && styles.dayTabToday]}
              onPress={() => setSelectedDay(w.day)}
            >
              <Text style={[styles.dayLabel, selectedDay === w.day && styles.dayLabelActive]}>
                {w.day}
              </Text>
              {w.is_today && <View style={styles.todayDot} />}
            </Pressable>
          ))}
        </ScrollView>

        {/* Date */}
        {dayData && (
          <Text style={styles.dateLabel}>
            {new Date(dayData.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            {dayData.is_today ? " · Today" : ""}
          </Text>
        )}

        {/* Classes */}
        {classes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No classes scheduled</Text>
          </View>
        ) : (
          classes.map((cls: any) => (
            <ClassCard
              key={cls.id || cls.subject}
              cls={cls}
              onDelete={handleDeleteEvent}
              onEdit={() => {
                setEditingEvent(cls);
                setSubject(cls.subject);
                setStartTime(cls.start_time);
                setEndTime(cls.end_time);
                setRoom(cls.room || "SJT 302");
                setFaculty(cls.faculty || "Prof. Raman");
                setShowAddModal(true);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => { setShowAddModal(false); setEditingEvent(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEvent ? "Edit Calendar Event" : "Add Calendar Event"}</Text>
              <Pressable onPress={() => { setShowAddModal(false); setEditingEvent(null); }}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>EVENT / SUBJECT NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Computer Networks Lab"
              placeholderTextColor={theme.faint}
              value={subject}
              onChangeText={setSubject}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>START TIME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 09:00"
                  placeholderTextColor={theme.faint}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>END TIME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 10:30"
                  placeholderTextColor={theme.faint}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            <Text style={styles.label}>ROOM / LOCATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SJT 302"
              placeholderTextColor={theme.faint}
              value={room}
              onChangeText={setRoom}
            />

            <Text style={styles.label}>FACULTY / ORGANIZER</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Prof. Raman"
              placeholderTextColor={theme.faint}
              value={faculty}
              onChangeText={setFaculty}
            />

            <Pressable style={styles.submitBtn} onPress={handleAddEvent}>
              <Text style={styles.submitBtnText}>{editingEvent ? "Save Changes" : "Create Event"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ClassCard({ cls, onDelete, onEdit }: { cls: any; onDelete: (id: number) => void; onEdit: () => void }) {
  const cancelled = cls.status === "cancelled";
  return (
    <Pressable style={[styles.card, cancelled && styles.cardCancelled]} onPress={onEdit}>
      <View style={styles.timeCol}>
        <Text style={styles.timeStart}>{cls.start_time}</Text>
        <View style={styles.timeLine} />
        <Text style={styles.timeEnd}>{cls.end_time}</Text>
      </View>
      <View style={styles.details}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={[styles.subject, cancelled && styles.strikeThrough, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
            {cls.subject}
          </Text>
          {cls.id && (
            <Pressable onPress={(e) => { e.stopPropagation(); onDelete(cls.id); }} hitSlop={8}>
              <Text style={{ fontSize: 14 }}>🗑️</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.meta}>{cls.faculty}</Text>
        <View style={styles.tagRow}>
          <Tag text={cls.room} />
          <Tag text={cls.code} />
          {cancelled && <Tag text="Cancelled" color={theme.danger} />}
        </View>
      </View>
    </Pressable>
  );
}

function Tag({ text, color }: { text: string; color?: string }) {
  return (
    <View style={[styles.tag, color ? { backgroundColor: color + "18" } : {}]}>
      <Text style={[styles.tagText, color ? { color } : {}]}>{text}</Text>
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
  page:            { flex: 1, backgroundColor: theme.bg },
  pad:             { padding: 16, paddingBottom: 40 },
  dayScroll:       { marginBottom: 16 },
  dayTab:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: "center", minWidth: 52 },
  dayTabActive:    { backgroundColor: theme.primary, borderColor: theme.primary },
  dayTabToday:     { borderColor: theme.primary },
  dayLabel:        { color: theme.muted, fontSize: 13, fontWeight: "600" },
  dayLabelActive:  { color: "#fff" },
  todayDot:        { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, marginTop: 3 },
  dateLabel:       { color: theme.muted, fontSize: 12, marginBottom: 16 },
  card:            { flexDirection: "row", backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border, gap: 14 },
  cardCancelled:   { opacity: 0.5 },
  timeCol:         { alignItems: "center", width: 44 },
  timeStart:       { color: theme.primary, fontSize: 11, fontWeight: "700" },
  timeEnd:         { color: theme.muted, fontSize: 11 },
  timeLine:        { flex: 1, width: 1, backgroundColor: theme.border, marginVertical: 4 },
  details:         { flex: 1 },
  subject:         { color: theme.text, fontSize: 14, fontWeight: "600", marginBottom: 3 },
  strikeThrough:   { textDecorationLine: "line-through" },
  meta:            { color: theme.muted, fontSize: 12, marginBottom: 8 },
  tagRow:          { flexDirection: "row", gap: 6 },
  tag:             { backgroundColor: theme.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tagText:         { color: theme.muted, fontSize: 10 },
  empty:           { padding: 40, alignItems: "center" },
  emptyText:       { color: theme.muted, fontSize: 14 },
  
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle:     { color: theme.text, fontSize: 20, fontWeight: "700" },
  headerSub:       { color: theme.muted, fontSize: 12, marginTop: 2 },
  addBtn:          { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:      { color: "#fff", fontSize: 12, fontWeight: "600" },

  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent:    { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: theme.border },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:      { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeBtn:        { color: theme.muted, fontSize: 24, fontWeight: "300" },
  label:           { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input:           { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 14, marginBottom: 8 },
  submitBtn:       { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitBtnText:   { color: "#fff", fontSize: 15, fontWeight: "600" },
});
