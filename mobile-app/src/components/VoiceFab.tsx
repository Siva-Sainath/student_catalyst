import React, { useState } from "react";
import { Pressable, Text, View, StyleSheet, TextInput, Modal } from "react-native";
import * as Speech from "expo-speech";
import { Api } from "../api";
import { theme } from "../theme";

const ACTION_SCREENS: Record<string, string> = {
  home: "Home",
  attendance: "Attend",
  jobs: "Jobs",
  finance: "More",
  chat: "Chat",
};

export function VoiceFab({ navigation }: { navigation: any }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const cmd = text.trim();
    if (!cmd || busy) return;
    setBusy(true);
    try {
      await Api.ensureAuth();
      const r = await Api.voice(cmd);
      Speech.speak(r.response);
      const screen = ACTION_SCREENS[r.action];
      if (screen) navigation.navigate(screen);
      else if (r.action === "chat") navigation.navigate("Chat");
      setOpen(false);
      setText("");
    } catch {
      Speech.speak("Could not reach your Mac server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <Text style={{ fontSize: 22 }}>🎙</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Hermes voice</Text>
            <Text style={styles.hint}>Say or type: "open jobs", "show attendance"…</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Voice command"
              placeholderTextColor={theme.muted}
              autoFocus
            />
            <Pressable style={styles.btn} onPress={run} disabled={busy}>
              <Text style={styles.btnText}>{busy ? "Running…" : "Run command"}</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#3b82f6",
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: { color: theme.text, fontSize: 18, fontWeight: "700" },
  hint: { color: theme.muted, fontSize: 12, marginTop: 6, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    color: theme.text,
    backgroundColor: theme.surface2,
    marginBottom: 12,
  },
  btn: { backgroundColor: theme.primary, borderRadius: 12, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  cancel: { color: theme.muted, textAlign: "center", marginTop: 14 },
});
