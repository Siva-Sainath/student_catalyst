import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import * as Speech from "expo-speech";
import { Api } from "../api";
import { theme } from "../theme";

export function ChatScreen() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    setBusy(true);
    setReply("");
    setInput("");
    try {
      await Api.ensureAuth();
      for await (const t of Api.streamChat(msg)) setReply((p) => p + t);
    } catch (e: any) {
      setReply(e?.message || "Could not reach Mac server.");
    } finally {
      setBusy(false);
    }
  };

  const voiceNav = async () => {
    if (!input.trim()) return;
    try {
      await Api.ensureAuth();
      const r = await Api.voice(input.trim());
      setReply(`🎙 ${r.response}\n→ Action: ${r.action}`);
    } catch {
      setReply("Voice command failed.");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Campus AI</Text>
        <Text style={styles.sub}>Mistral chat · streamed from your Mac</Text>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16 }}>
        {reply ? (
          <View style={styles.bubbleAi}>
            <Text style={styles.bubbleText}>{reply}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Ask homework, attendance, or campus questions…</Text>
        )}
      </ScrollView>
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor={theme.muted}
          multiline
        />
        <Pressable style={styles.iconBtn} onPress={voiceNav}>
          <Text>🎙</Text>
        </Pressable>
        {reply ? (
          <Pressable style={styles.iconBtn} onPress={() => Speech.speak(reply)}>
            <Text>🔊</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.send, busy && { opacity: 0.6 }]} onPress={send} disabled={busy}>
          <Text style={styles.sendTxt}>{busy ? "…" : "↑"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: { padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { color: theme.text, fontSize: 20, fontWeight: "700" },
  sub: { color: theme.success, fontSize: 11, marginTop: 4 },
  body: { flex: 1 },
  placeholder: { color: theme.muted, fontSize: 14 },
  bubbleAi: {
    backgroundColor: theme.surface2,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleText: { color: "#d1e0ff", fontSize: 15, lineHeight: 22 },
  bar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: theme.border },
  input: {
    flex: 1,
    backgroundColor: theme.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  sendTxt: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
