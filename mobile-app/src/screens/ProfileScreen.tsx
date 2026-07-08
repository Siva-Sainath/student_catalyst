import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile, updateProfile } from "../api";
import { theme } from "../theme";

interface ProfileScreenProps {
  onLogout: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName]   = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editGpa, setEditGpa]     = useState("");
  const [editSkills, setEditSkills] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setEditName(data.name || "");
      setEditMajor(data.major || "");
      setEditGpa(data.gpa?.toString() || "");
      setEditSkills(data.skills?.join(", ") || "");
    } catch (err: any) {
      console.warn("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleUpdate = async () => {
    const parsedGpa = parseFloat(editGpa);
    if (isNaN(parsedGpa) || parsedGpa < 0 || parsedGpa > 10) {
      Alert.alert("Error", "GPA must be a number between 0 and 10.");
      return;
    }

    try {
      const skillsArray = editSkills.split(",").map(s => s.trim()).filter(s => s.length > 0);
      const updated = await updateProfile({
        name: editName,
        major: editMajor,
        gpa: parsedGpa,
        skills: skillsArray
      });
      setProfile(updated);
      setEditModal(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("jwt_token");
            onLogout();
          }
        }
      ]
    );
  };

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name ? profile.name[0] : "S"}</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>

        <Pressable style={styles.editBtn} onPress={() => setEditModal(true)}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </Pressable>
      </View>

      {/* Academic Details Card */}
      <Text style={styles.sectionTitle}>ACADEMICS</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Major / Department</Text>
          <Text style={styles.infoVal}>{profile.major || "Undeclared"}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cumulative GPA</Text>
          <Text style={styles.infoVal}>{profile.gpa ? profile.gpa.toFixed(2) : "0.00"}</Text>
        </View>
      </View>

      {/* Skills Card */}
      <Text style={styles.sectionTitle}>SKILLS & TECH STACK</Text>
      <View style={styles.card}>
        {profile.skills && profile.skills.length > 0 ? (
          <View style={styles.skillsContainer}>
            {profile.skills.map((skill: string, idx: number) => (
              <View key={idx} style={styles.skillBadge}>
                <Text style={styles.skillBadgeText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No skills declared. Tap 'Edit Profile' to add some.</Text>
        )}
      </View>

      {/* Logout button */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Logout / Sign Out</Text>
      </Pressable>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Info</Text>
              <Pressable onPress={() => setEditModal(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={theme.faint}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.label}>MAJOR / DEPARTMENT</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Computer Science & Eng"
                placeholderTextColor={theme.faint}
                value={editMajor}
                onChangeText={setEditMajor}
              />

              <Text style={styles.label}>GPA (0.00 - 10.00)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 8.5"
                placeholderTextColor={theme.faint}
                keyboardType="numeric"
                value={editGpa}
                onChangeText={setEditGpa}
              />

              <Text style={styles.label}>SKILLS (COMMA SEPARATED)</Text>
              <TextInput
                style={styles.input}
                placeholder="React Native, Python, SQL"
                placeholderTextColor={theme.faint}
                value={editSkills}
                onChangeText={setEditSkills}
              />

              <Pressable style={styles.saveBtn} onPress={handleUpdate}>
                <Text style={styles.saveBtnText}>Save Profile Updates</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  pad: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg },
  profileCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.primary, marginBottom: 16 },
  avatarText: { color: theme.primary, fontSize: 32, fontWeight: "700" },
  name: { color: theme.text, fontSize: 20, fontWeight: "700" },
  email: { color: theme.muted, fontSize: 13, marginTop: 4, marginBottom: 16 },
  editBtn: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  editBtnText: { color: theme.soft, fontSize: 12, fontWeight: "600" },
  sectionTitle: { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  infoLabel: { color: theme.muted, fontSize: 13 },
  infoVal: { color: theme.text, fontSize: 13, fontWeight: "600" },
  infoDivider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillBadge: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  skillBadgeText: { color: theme.soft, fontSize: 11, fontWeight: "500" },
  emptyText: { color: theme.muted, fontSize: 13, fontStyle: "italic", textAlign: "center" },
  logoutBtn: { backgroundColor: theme.danger + "15", borderWidth: 1, borderColor: theme.danger + "30", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  logoutBtnText: { color: theme.danger, fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: theme.border, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeModalText: { color: theme.muted, fontSize: 18, fontWeight: "600" },
  label: { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 14, marginBottom: 8 },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24, marginBottom: 16 },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" }
});
