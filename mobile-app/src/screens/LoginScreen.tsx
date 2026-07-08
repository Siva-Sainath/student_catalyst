import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../theme";

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    const targetEmail = email.trim() || "student@bmsce.ac.in";
    const targetName = name.trim() || "Siva Sainath";

    setLoading(true);
    try {
      const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
      const res = await fetch(`${BASE}/auth/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, name: targetName }),
      });
      if (!res.ok) throw new Error("Authentication failed");
      const data = await res.json();
      await AsyncStorage.setItem("jwt_token", data.access_token);
      onLoginSuccess(data.access_token);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Could not connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRealOAuth = async (provider: "google" | "github") => {
    try {
      const BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
      const loginUrl = `${BASE}/auth/login/${provider}`;
      await Linking.openURL(loginUrl);
    } catch (err: any) {
      Alert.alert("OAuth Error", err.message || "Could not open OAuth URL");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandLogo}>✦</Text>
          <Text style={styles.brandTitle}>Student Catalyst</Text>
          <Text style={styles.brandSub}>Your campus companion & AI advisor</Text>
        </View>

        {/* Demo Input Fields */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="student@bmsce.ac.in"
            placeholderTextColor={theme.faint}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Siva Sainath"
            placeholderTextColor={theme.faint}
            value={name}
            onChangeText={setName}
          />

          <Pressable style={styles.loginBtn} onPress={handleDemoLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In / Continue</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>OR LOGIN WITH</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* OAuth Buttons */}
        <View style={styles.oauthRow}>
          <Pressable style={styles.oauthBtn} onPress={() => handleRealOAuth("google")}>
            <Text style={styles.oauthIcon}>🔴</Text>
            <Text style={styles.oauthText}>Google</Text>
          </Pressable>

          <Pressable style={styles.oauthBtn} onPress={() => handleRealOAuth("github")}>
            <Text style={styles.oauthIcon}>🐱</Text>
            <Text style={styles.oauthText}>GitHub</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, justifyContent: "center" },
  content: { paddingHorizontal: 24 },
  brandContainer: { alignItems: "center", marginBottom: 36 },
  brandLogo: { fontSize: 44, color: theme.primary, fontWeight: "700", marginBottom: 12 },
  brandTitle: { color: theme.text, fontSize: 24, fontWeight: "700" },
  brandSub: { color: theme.muted, fontSize: 13, marginTop: 6 },
  form: { marginBottom: 28 },
  inputLabel: { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 14, fontSize: 14 },
  loginBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  loginBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  separatorContainer: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  separatorLine: { flex: 1, height: 1, backgroundColor: theme.border },
  separatorText: { color: theme.faint, fontSize: 10, fontWeight: "700", paddingHorizontal: 16 },
  oauthRow: { flexDirection: "row", gap: 12 },
  oauthBtn: { flex: 1, flexDirection: "row", gap: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  oauthIcon: { fontSize: 16 },
  oauthText: { color: theme.soft, fontSize: 14, fontWeight: "600" }
});
