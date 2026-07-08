import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, ScrollView
} from "react-native";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import {
  streamChat, transcribeAudio, listRagDocuments,
  deleteRagDocument, uploadRagText, uploadRagDocument
} from "../api";
import { theme } from "../theme";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: string[];
}

let _id = 0;
const uid = () => String(++_id);

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: uid(), role: "ai", text: "Hi! I'm Hermes — your campus AI. Ask me coding questions, library timings, hostel curfew rules, or check the mess menu." }
  ]);
  const [input, setInput]               = useState("");
  const [busy, setBusy]                 = useState(false);
  const [mode, setMode]                 = useState<"fast" | "expansive">("fast");
  const [recording, setRecording]       = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording]   = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // RAG States
  const [showRagModal, setShowRagModal] = useState(false);
  const [documents, setDocuments]       = useState<Array<{ name: string; size: number }>>([]);
  const [loadingDocs, setLoadingDocs]   = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle]   = useState("handbook_addendum.txt");
  const [newDocContent, setNewDocContent] = useState("");
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const listRef            = useRef<FlatList>(null);

  const scrollBottom = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await listRagDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      console.warn("Failed to load documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (showRagModal) {
      loadDocs();
    }
  }, [showRagModal]);

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Microphone access is required to transcribe voice commands.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (e: any) {
      Alert.alert("Error", "Could not start audio recording: " + e.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const text = await transcribeAudio(uri);
        if (text && text.trim()) {
          setInput(prev => (prev ? prev + " " + text : text));
        }
      }
    } catch (err: any) {
      Alert.alert("Transcription Error", err.message || "Failed to process audio.");
    } finally {
      setTranscribing(false);
    }
  };

  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setBusy(false);
    }
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/markdown", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const file = res.assets[0];
      setUploadingDoc(true);
      const uploadedName = await uploadRagDocument(file.uri, file.name, file.mimeType);
      Alert.alert("Success", `Uploaded "${uploadedName}" successfully.`);
      loadDocs();
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to upload file.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleTextUpload = async () => {
    const title = newDocTitle.trim();
    const content = newDocContent.trim();
    if (!title || !content) {
      Alert.alert("Error", "Please provide both a filename and document content.");
      return;
    }
    if (!title.endsWith(".txt") && !title.endsWith(".md")) {
      Alert.alert("Error", "Filename must end with .txt or .md");
      return;
    }
    setUploadingDoc(true);
    try {
      await uploadRagText(title, content);
      Alert.alert("Success", `Successfully saved document "${title}".`);
      setNewDocContent("");
      loadDocs();
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to upload text document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDelete = async (name: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRagDocument(name);
              loadDocs();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete document.");
            }
          }
        }
      ]
    );
  };

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: Message = { id: uid(), role: "user", text: msg };
    const aiMsg:   Message = { id: uid(), role: "ai",   text: "", sources: [] };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    scrollBottom();

    try {
      for await (const frame of streamChat(msg, "General", mode, controller.signal)) {
        if (frame.sources && frame.sources.length > 0) {
          setMessages(prev =>
            prev.map(m => m.id === aiMsg.id ? { ...m, sources: frame.sources } : m)
          );
        }
        if (frame.token) {
          setMessages(prev =>
            prev.map(m => m.id === aiMsg.id ? { ...m, text: m.text + frame.token } : m)
          );
          scrollBottom();
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        setMessages(prev =>
          prev.map(m => m.id === aiMsg.id
            ? { ...m, text: m.text + " \n\n*[Stream cancelled by user]*" }
            : m
          )
        );
      } else {
        setMessages(prev =>
          prev.map(m => m.id === aiMsg.id
            ? { ...m, text: `Error: ${err?.message ?? "Could not reach backend"}` }
            : m
          )
        );
      }
    } finally {
      setBusy(false);
      abortControllerRef.current = null;
    }
  }, [input, busy, mode]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.row, isUser && styles.rowUser]}>
        {!isUser && <View style={styles.avatar}><Text style={styles.avatarText}>H</Text></View>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          {item.text ? (
            <Text style={[styles.bubbleText, isUser && { color: "#fff" }]}>{item.text}</Text>
          ) : (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={styles.typingText}>Hermes is thinking…</Text>
            </View>
          )}

          {/* RAG Source citations */}
          {!isUser && item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sourcesTitle}>📖 Sources Cited:</Text>
              <View style={styles.badgeRow}>
                {item.sources.map((src, i) => (
                  <View key={i} style={styles.sourceBadge}>
                    <Text style={styles.sourceBadgeText}>{src}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Campus AI Advisor</Text>
          <Text style={styles.sub}>
            {busy ? "⚡ streaming response…" : "Hermes Agent · Local RAG Enabled"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable 
            style={styles.ragHeaderBtn} 
            onPress={() => setShowRagModal(true)}
          >
            <Text style={{ fontSize: 18 }}>📁</Text>
          </Pressable>
          <View style={[styles.dot, { backgroundColor: busy ? theme.warn : theme.success }]} />
        </View>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeContainer}>
        <Pressable
          style={[styles.modeTab, mode === "fast" && styles.modeTabActive]}
          onPress={() => setMode("fast")}
        >
          <Text style={[styles.modeText, mode === "fast" && styles.modeTextActive]}>⚡ Fast Mode</Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, mode === "expansive" && styles.modeTabActive]}
          onPress={() => setMode("expansive")}
        >
          <Text style={[styles.modeText, mode === "expansive" && styles.modeTabActive]}>📖 Expansive Mode</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollBottom}
      />

      {/* Input bar */}
      <View style={styles.bar}>
        {/* Voice Dictation Button */}
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={[
            styles.micBtn,
            isRecording && { backgroundColor: theme.danger }
          ]}
        >
          {transcribing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.micIcon}>{isRecording ? "🔴" : "🎙️"}</Text>
          )}
        </Pressable>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={isRecording ? "Listening..." : "Ask college rules, mess, library..."}
          placeholderTextColor={theme.faint}
          multiline
          maxLength={1000}
          onSubmitEditing={send}
          blurOnSubmit={false}
          editable={!isRecording}
        />

        {busy ? (
          <Pressable style={[styles.sendBtn, { backgroundColor: theme.danger }]} onPress={cancelStream}>
            <Text style={styles.stopIcon}>■</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.sendBtn, (!input.trim() || transcribing) && styles.sendDisabled]}
            onPress={send}
            disabled={!input.trim() || transcribing}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        )}
      </View>

      {/* RAG Documents Management Modal */}
      <Modal
        visible={showRagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRagModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📚 RAG Documents</Text>
              <Pressable style={styles.closeBtn} onPress={() => setShowRagModal(false)}>
                <Text style={styles.closeBtnText}>✕ Close</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* List of Documents */}
              <Text style={styles.sectionTitle}>Active Knowledge Base ({documents.length})</Text>
              {loadingDocs ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 10 }} />
              ) : documents.length === 0 ? (
                <Text style={styles.emptyText}>No documents uploaded yet. Ask AI will fall back to model defaults.</Text>
              ) : (
                documents.map((doc, idx) => (
                  <View key={idx} style={styles.docItem}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                      <Text style={styles.docSize}>{(doc.size / 1024).toFixed(1)} KB</Text>
                    </View>
                    <Pressable style={styles.deleteBtn} onPress={() => handleDelete(doc.name)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                ))
              )}

              <View style={styles.divider} />

              {/* Paste Document Content */}
              <Text style={styles.sectionTitle}>Add Text Note / Context</Text>
              <TextInput
                style={styles.docInput}
                placeholder="Filename (e.g. library_rules.txt)"
                placeholderTextColor={theme.faint}
                value={newDocTitle}
                onChangeText={setNewDocTitle}
              />
              <TextInput
                style={styles.docTextarea}
                placeholder="Paste the document text here..."
                placeholderTextColor={theme.faint}
                value={newDocContent}
                onChangeText={setNewDocContent}
                multiline
                numberOfLines={4}
              />
              <Pressable
                style={[styles.primaryBtn, uploadingDoc && { opacity: 0.7 }]}
                disabled={uploadingDoc}
                onPress={handleTextUpload}
              >
                {uploadingDoc ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>💾 Save Text Note</Text>
                )}
              </Pressable>

              <View style={styles.divider} />

              {/* Native Document Picker */}
              <Text style={styles.sectionTitle}>Or Upload Text File (.txt/.md)</Text>
              <Pressable
                style={[styles.secondaryBtn, { marginBottom: 20 }, uploadingDoc && { opacity: 0.7 }]}
                disabled={uploadingDoc}
                onPress={pickFile}
              >
                <Text style={styles.secondaryBtnText}>📁 Select File from Device</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: theme.bg },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  title:       { color: theme.text, fontSize: 18, fontWeight: "700" },
  sub:         { color: theme.muted, fontSize: 11, marginTop: 2 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  modeContainer: { flexDirection: "row", backgroundColor: theme.surface2, borderRadius: 12, padding: 4, margin: 12, borderWidth: 1, borderColor: theme.border },
  modeTab:       { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  modeTabActive: { backgroundColor: theme.surface3 },
  modeText:      { color: theme.muted, fontSize: 12, fontWeight: "600" },
  modeTextActive:{ color: theme.primary },
  list:        { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  row:         { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 4 },
  rowUser:     { flexDirection: "row-reverse" },
  avatar:      { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.primaryBg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.primary },
  avatarText:  { color: theme.primary, fontSize: 12, fontWeight: "700" },
  bubble:      { maxWidth: "82%", borderRadius: 16, padding: 12 },
  bubbleAi:    { backgroundColor: theme.surface, borderTopLeftRadius: 4, borderWidth: 1, borderColor: theme.border },
  bubbleUser:  { backgroundColor: theme.primary, borderTopRightRadius: 4 },
  bubbleText:  { color: theme.soft, fontSize: 14, lineHeight: 21 },
  typing:      { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText:  { color: theme.muted, fontSize: 13, fontStyle: "italic" },
  bar:         { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: theme.border },
  micBtn:      { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  micIcon:     { fontSize: 18 },
  input:       { flex: 1, backgroundColor: theme.surface2, borderRadius: 14, borderWidth: 1, borderColor: theme.border, color: theme.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 120 },
  sendBtn:     { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" },
  sendDisabled:{ backgroundColor: theme.surface3 },
  sendIcon:    { color: "#fff", fontSize: 18, fontWeight: "700" },
  stopIcon:    { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  // Sources cited styles
  sourcesContainer: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border },
  sourcesTitle:     { color: theme.muted, fontSize: 11, fontWeight: "600", marginBottom: 6 },
  badgeRow:         { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sourceBadge:      { backgroundColor: theme.primary + "15", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.primary + "30" },
  sourceBadgeText:  { color: theme.primary, fontSize: 10, fontWeight: "600" },

  // Modal styles
  ragHeaderBtn: { padding: 8, borderRadius: 10, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxHeight: "85%", backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 18, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border },
  closeBtnText: { color: theme.soft, fontSize: 12, fontWeight: "600" },
  sectionTitle: { color: theme.text, fontSize: 14, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  docInput: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 8, color: theme.text, padding: 10, fontSize: 13, marginBottom: 10 },
  docTextarea: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 8, color: theme.text, padding: 10, fontSize: 13, minHeight: 80, textAlignVertical: "top", marginBottom: 10 },
  primaryBtn: { backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  secondaryBtn: { backgroundColor: theme.surface3, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { color: theme.soft, fontSize: 13, fontWeight: "600" },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  docItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.surface2, padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  docName: { color: theme.text, fontSize: 13, fontWeight: "500" },
  docSize: { color: theme.muted, fontSize: 11, marginTop: 2 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: theme.danger + "15", borderWidth: 1, borderColor: theme.danger + "30" },
  deleteBtnText: { color: theme.danger, fontSize: 11, fontWeight: "600" },
  emptyText: { color: theme.muted, fontSize: 13, fontStyle: "italic", textAlign: "center", marginVertical: 10 },
});
