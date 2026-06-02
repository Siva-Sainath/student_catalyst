import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, View, TextInput, Pressable, ScrollView } from "react-native";
import * as Speech from "expo-speech";
import { Api } from "./src/api";

type AppScreen = "login" | "dashboard" | "chat";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [email, setEmail] = useState("student@vit.ac.in");
  const [name, setName] = useState("Rahul Sharma");
  const [prompt, setPrompt] = useState("Explain Dijkstra in simple steps");
  const [chat, setChat] = useState("");
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLogin = useMemo(() => email.includes("@"), [email]);

  useEffect(() => {
    Api.restoreToken().then(async (ok) => {
      if (ok) {
        setScreen("dashboard");
        const data = await Api.getDashboard();
        setDashboard(data);
      }
    });
  }, []);

  const login = async () => {
    if (!canLogin) return;
    setLoading(true);
    setError(null);
    try {
      await Api.loginDemo(email, name);
      const data = await Api.getDashboard();
      setDashboard(data);
      setScreen("dashboard");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const runChat = async () => {
    setLoading(true);
    setError(null);
    setChat("");
    try {
      for await (const token of Api.streamHomework(prompt, "Algorithms")) {
        setChat((prev) => prev + token);
      }
    } catch (e: any) {
      setError(e?.message || "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  const speak = () => {
    if (chat.trim()) Speech.speak(chat);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050e1d" }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#1e3561" }}>
        <Text style={{ color: "#e8f0fe", fontSize: 20, fontWeight: "700" }}>Campus AI MVP</Text>
        <Text style={{ color: "#6b8cad", fontSize: 12 }}>React Native + Mac local backend</Text>
      </View>

      {screen === "login" && (
        <View style={{ padding: 16, gap: 12 }}>
          <TextInput value={email} onChangeText={setEmail} style={input} placeholder="Email" placeholderTextColor="#5a7598" />
          <TextInput value={name} onChangeText={setName} style={input} placeholder="Name" placeholderTextColor="#5a7598" />
          <Pressable onPress={login} style={button}>
            <Text style={buttonText}>{loading ? "Signing in..." : "Sign in (Demo Token)"}</Text>
          </Pressable>
          <Text style={{ color: "#6b8cad", fontSize: 12 }}>OAuth endpoints also available: `/auth/google`, `/auth/github`.</Text>
          {error && <Text style={{ color: "#ef4444" }}>{error}</Text>}
        </View>
      )}

      {screen !== "login" && (
        <ScrollView style={{ padding: 16 }}>
          <View style={card}>
            <Text style={title}>Dashboard</Text>
            <Text style={sub}>{dashboard?.greeting || "Loading..."}</Text>
            <Text style={value}>Attendance: {dashboard?.student?.attendance ?? "--"}%</Text>
            <Text style={value}>CGPA: {dashboard?.student?.cgpa ?? "--"}</Text>
            <Text style={sub}>{dashboard?.ai_tip}</Text>
          </View>

          <View style={card}>
            <Text style={title}>Homework AI</Text>
            <TextInput value={prompt} onChangeText={setPrompt} style={input} placeholder="Ask a homework question" placeholderTextColor="#5a7598" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={runChat} style={[button, { flex: 1 }]}>
                <Text style={buttonText}>{loading ? "Thinking..." : "Ask Local Model"}</Text>
              </Pressable>
              <Pressable onPress={speak} style={[button, { flex: 1, backgroundColor: "#1d4ed8" }]}>
                <Text style={buttonText}>Speak</Text>
              </Pressable>
            </View>
            {!!chat && <Text style={{ color: "#d6e6ff", marginTop: 10 }}>{chat}</Text>}
          </View>

          <Pressable onPress={() => setScreen(screen === "dashboard" ? "chat" : "dashboard")} style={[button, { marginTop: 8 }]}>
            <Text style={buttonText}>{screen === "dashboard" ? "Open Chat View" : "Back to Dashboard"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const input = {
  borderWidth: 1,
  borderColor: "#1e3561",
  backgroundColor: "#0a1628",
  borderRadius: 10,
  color: "#e8f0fe",
  paddingHorizontal: 12,
  paddingVertical: 10,
};

const card = {
  borderWidth: 1,
  borderColor: "#1e3561",
  backgroundColor: "#0a1628",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  gap: 8,
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: 10,
  paddingVertical: 11,
  alignItems: "center" as const,
};

const buttonText = {
  color: "#ffffff",
  fontWeight: "600" as const,
};

const title = { color: "#e8f0fe", fontSize: 16, fontWeight: "700" as const };
const sub = { color: "#8ba3c7" };
const value = { color: "#d6e6ff" };
