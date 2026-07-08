import React, { useState, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet,
  Pressable, Linking, ActivityIndicator, RefreshControl,
  Modal, TextInput, Alert
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPlacement, addPlacement } from "../api";
import { theme } from "../theme";

const STAGES = ["Applied", "OA", "Technical Round", "HR Round", "Offer", "Rejected"];

export function PlacementScreen() {
  const [data, setData]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal / Creation State
  const [showModal, setShowModal] = useState(false);
  const [company, setCompany]     = useState("");
  const [role, setRole]           = useState("");
  const [stage, setStage]         = useState("Applied");

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const d = await getPlacement();
      setData(d.applications ?? []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    if (!company.trim() || !role.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    try {
      await addPlacement(company.trim(), role.trim(), stage);
      setCompany("");
      setRole("");
      setStage("Applied");
      setShowModal(false);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add placement application");
    }
  };

  if (loading) return <Center />;

  const offers   = data.filter(a => a.stage === "Offer").length;
  const active   = data.filter(a => !["Offer","Rejected"].includes(a.stage)).length;
  const rejected = data.filter(a => a.stage === "Rejected").length;

  return (
    <View style={styles.page}>
      {/* Header action */}
      <View style={styles.header}>
        <View style={styles.summaryTitleContainer}>
          <Text style={styles.summaryTitle}>{data.length} Applications</Text>
          <Text style={styles.summarySub}>Your job search funnel</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Add App</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        {/* Summary chips */}
        <View style={styles.summaryRow}>
          <SumChip label="Active" value={active} color={theme.primary} />
          <SumChip label="Offers" value={offers} color={theme.success} />
          <SumChip label="Rejected" value={rejected} color={theme.danger} />
        </View>

        <Text style={styles.section}>APPLICATIONS</Text>
        {data.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No active job applications tracked yet.</Text>
          </View>
        ) : (
          data.map(app => <AppCard key={app.id} app={app} />)
        )}
      </ScrollView>

      {/* Creation Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Track Application</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>COMPANY NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Google, Stripe"
              placeholderTextColor={theme.faint}
              value={company}
              onChangeText={setCompany}
            />

            <Text style={styles.label}>ROLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Software Engineer Intern"
              placeholderTextColor={theme.faint}
              value={role}
              onChangeText={setRole}
            />

            <Text style={styles.label}>CURRENT STAGE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stagePicker}>
              {STAGES.map(s => {
                const selected = stage === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.stageChip, selected && styles.stageChipSelected]}
                    onPress={() => setStage(s)}
                  >
                    <Text style={[styles.stageChipText, selected && { color: "#fff" }]}>{s}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.submitBtn} onPress={handleAdd}>
              <Text style={styles.submitBtnText}>Add to Funnel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AppCard({ app: a }: { app: any }) {
  const isOffer    = a.stage === "Offer";
  const isRejected = a.stage === "Rejected";
  const stageColor = isOffer ? theme.success : isRejected ? theme.danger : theme.primary;
  const stageIdx   = STAGES.indexOf(a.stage);

  return (
    <View style={[styles.card, isOffer && styles.cardOffer]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.companyName}>{a.company}</Text>
          <Text style={styles.roleName}>{a.role}</Text>
        </View>
        <View style={[styles.stageBadge, { backgroundColor: stageColor + "20" }]}>
          <Text style={[styles.stageText, { color: stageColor }]}>{a.stage}</Text>
        </View>
      </View>

      {/* Stage pipeline — skip for Rejected */}
      {!isRejected && (
        <View style={styles.pipeline}>
          {STAGES.filter(s => s !== "Rejected").map((s, i) => {
            const passed = i <= stageIdx;
            const current = i === stageIdx;
            return (
              <React.Fragment key={s}>
                <View style={[styles.pDot, passed ? styles.pDotDone : styles.pDotPending, current && styles.pDotCurrent]}>
                  {passed && !current && <Text style={styles.pCheck}>✓</Text>}
                </View>
                {i < STAGES.filter(s => s !== "Rejected").length - 1 && (
                  <View style={[styles.pLine, passed && i < stageIdx ? styles.pLineDone : {}]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}

      <View style={styles.cardBottom}>
        <Text style={styles.updated}>Updated {new Date(a.last_updated).toLocaleDateString("en-IN")}</Text>
        <Pressable onPress={() => Linking.openURL(a.careers_link)}>
          <Text style={styles.link}>Careers →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SumChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color + "40" }]}>
      <Text style={[styles.chipNum, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
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
  page:         { flex: 1, backgroundColor: theme.bg },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  summaryTitleContainer: { flex: 1 },
  summaryTitle:  { color: theme.text, fontSize: 20, fontWeight: "700" },
  summarySub:    { color: theme.muted, fontSize: 12, marginTop: 2 },
  addBtn:        { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:    { color: "#fff", fontSize: 13, fontWeight: "600" },
  pad:           { padding: 16, paddingBottom: 40 },
  summaryRow:      { flexDirection: "row", gap: 10, marginBottom: 20 },
  chip:         { flex: 1, backgroundColor: theme.surface, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  chipNum:      { fontSize: 26, fontWeight: "700" },
  chipLabel:    { color: theme.muted, fontSize: 11, marginTop: 2 },
  section:      { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12 },
  empty:         { paddingVertical: 40, alignItems: "center" },
  emptyText:     { color: theme.muted, fontSize: 14 },
  card:         { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardOffer:    { borderColor: theme.success + "60" },
  cardTop:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  companyName:  { color: theme.text, fontSize: 16, fontWeight: "700" },
  roleName:     { color: theme.muted, fontSize: 12, marginTop: 2 },
  stageBadge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  stageText:    { fontSize: 11, fontWeight: "700" },
  pipeline:     { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  pDot:         { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pDotDone:     { backgroundColor: theme.primary },
  pDotPending:  { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border },
  pDotCurrent:  { backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.primary + "80" },
  pCheck:       { color: "#fff", fontSize: 8, fontWeight: "800" },
  pLine:        { flex: 1, height: 2, backgroundColor: theme.border },
  pLineDone:    { backgroundColor: theme.primary },
  cardBottom:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  updated:      { color: theme.faint, fontSize: 11 },
  link:         { color: theme.primary, fontSize: 12, fontWeight: "600" },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent:  { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: theme.border },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:    { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeBtn:      { color: theme.muted, fontSize: 24, fontWeight: "300" },
  label:         { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input:         { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 14, marginBottom: 8 },
  stagePicker:   { flexDirection: "row", marginVertical: 4 },
  stageChip:     { backgroundColor: theme.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  stageChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  stageChipText: { color: theme.muted, fontSize: 12 },
  submitBtn:     { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
