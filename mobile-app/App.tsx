import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import {
  Text, View, Modal, TextInput, Pressable, ActivityIndicator,
  Alert, ScrollView, Linking, Animated, Easing,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureAuth, voiceCommand, transcribeAudio, getAttendance, getSchedule, getAssignments, getFinance, getPlacement } from "./src/api";
import { theme } from "./src/theme";

import { HomeScreen }        from "./src/screens/HomeScreen";
import { ChatScreen }        from "./src/screens/ChatScreen";
import { AttendanceScreen }  from "./src/screens/AttendanceScreen";
import { ScheduleScreen }    from "./src/screens/ScheduleScreen";
import { AssignmentsScreen } from "./src/screens/AssignmentsScreen";
import { JobsScreen }        from "./src/screens/JobsScreen";
import { PlacementScreen }   from "./src/screens/PlacementScreen";
import { FinanceScreen }     from "./src/screens/FinanceScreen";
import { LoginScreen }       from "./src/screens/LoginScreen";
import { ProfileScreen }     from "./src/screens/ProfileScreen";

export const navigationRef = createNavigationContainerRef<any>();

// Type-safe navigate wrapper — uses dispatch+CommonActions to bypass strict generic inference
function nav(screen: string, params?: Record<string, any>) {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(
    params
      ? { type: "NAVIGATE", payload: { name: screen, params } }
      : { type: "NAVIGATE", payload: { name: screen } }
  );
}

// ── Status label helper ────────────────────────────────────────────────────────
type VoiceStatus =
  | ""
  | "Tap mic to speak"
  | "🎙️ Listening… speak now!"
  | "⏳ Transcribing via Whisper…"
  | "🤖 Processing intent…"
  | string;

function AgentFloatingButton() {
  const [visible, setVisible] = useState(false);
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("Tap mic to speak");

  // Audio Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Animated pulse ring for recording
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (visible) {
      Audio.requestPermissionsAsync().then(({ status: perm }) => {
        if (perm !== "granted") {
          Alert.alert("Permission Required", "Microphone access is needed for voice commands.");
        }
      }).catch(() => {});
    }
    // Stop any speech when modal closes
    if (!visible) Speech.stop();
  }, [visible]);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setStatus("🎙️ Listening… speak now!");
      setResponse("");
      startPulse();
    } catch (err: any) {
      Alert.alert("Microphone Error", err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    stopPulse();
    setStatus("⏳ Transcribing via Whisper…");
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        const text = await transcribeAudio(uri);
        if (!text.trim()) {
          setStatus("Nothing heard — tap mic and try again");
          return;
        }
        setCommand(text);
        setStatus(`📝 Heard: "${text}"`);
        await executeVoiceCommand(text);
      }
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
      setResponse("");
    }
  };

  const executeVoiceCommand = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setStatus("🤖 Processing intent…");
    try {
      const res = await voiceCommand(text.trim());
      const replyText = res.response || "Command processed.";
      setResponse(replyText);
      setStatus("✅ Done");

      // Speak the response aloud
      Speech.speak(replyText, { language: "en", rate: 1.0 });

      if (res.action === "navigate" && res.route && navigationRef.isReady()) {
        const route = res.route;
        setTimeout(() => {
          setVisible(false);
          setCommand("");
          setResponse("");
          setStatus("Tap mic to speak");

          if (route === "/assignments") nav("Track", { screen: "assignments" });
          else if (route === "/attendance") nav("Track", { screen: "attendance" });
          else if (route === "/schedule") nav("Track", { screen: "schedule" });
          else if (route === "/placement") nav("Track", { screen: "placement" });
          else if (route === "/finance") nav("Track", { screen: "finance" });
          else if (route === "/jobs") nav("Jobs");
          else if (route === "/chat") nav("Chat");
          else if (route === "/") nav("Home");
        }, 1400);
      }
    } catch (e: any) {
      setStatus("❌ Command failed");
      setResponse(e.message || "Failed to process command.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = () => executeVoiceCommand(command);

  const closeModal = () => {
    if (isRecording) recording?.stopAndUnloadAsync().catch(() => {});
    setIsRecording(false);
    stopPulse();
    setVisible(false);
    setCommand("");
    setResponse("");
    setStatus("Tap mic to speak");
    Speech.stop();
  };

  return (
    <>
      {/* Floating mic button */}
      <Pressable
        style={{
          position: "absolute", right: 20, bottom: 84,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: theme.primary,
          alignItems: "center", justifyContent: "center",
          shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
          borderWidth: 1.5, borderColor: theme.border,
        }}
        onPress={() => setVisible(true)}
      >
        <Text style={{ fontSize: 24 }}>🎙️</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, borderTopWidth: 1, borderTopColor: theme.border,
          }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Hermes Voice Agent</Text>
                <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>Powered by Whisper (local)</Text>
              </View>
              <Pressable onPress={closeModal}>
                <Text style={{ color: theme.muted, fontSize: 28 }}>×</Text>
              </Pressable>
            </View>

            {/* Pulse orb */}
            <View style={{ alignItems: "center", marginVertical: 12 }}>
              {/* Pulse ring — only visible while recording */}
              <Animated.View style={{
                position: "absolute",
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: isRecording ? "rgba(239,68,68,0.25)" : "transparent",
                transform: [{ scale: pulseAnim }],
              }} />
              <Pressable
                style={{
                  width: 72, height: 72, borderRadius: 36,
                  backgroundColor: isRecording ? theme.danger : theme.primary,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 2,
                  borderColor: isRecording ? "rgba(239,68,68,0.6)" : theme.border,
                  shadowColor: isRecording ? "#ef4444" : theme.primary,
                  shadowOpacity: 0.6, shadowRadius: 14, elevation: 8,
                }}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Text style={{ fontSize: 30 }}>{isRecording ? "⏹️" : "🎤"}</Text>
              </Pressable>
              <Text style={{ color: theme.muted, fontSize: 11, marginTop: 10, letterSpacing: 0.5 }}>
                {isRecording ? "TAP TO STOP" : "TAP TO TALK"}
              </Text>
            </View>

            {/* Status line */}
            {status ? (
              <Text style={{
                color: isRecording ? "#f87171" : theme.muted,
                fontSize: 13, textAlign: "center", marginBottom: 12,
                fontStyle: "italic",
              }}>
                {status}
              </Text>
            ) : null}

            <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 8 }}>
              Or type a command manually:
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border,
                borderRadius: 14, color: theme.text, padding: 14, fontSize: 15, marginBottom: 14,
              }}
              placeholder="Command appears here after transcription…"
              placeholderTextColor={theme.faint}
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={handleCommand}
            />

            {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: 10 }} />}

            {response ? (
              <View style={{
                backgroundColor: theme.primaryBg, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: theme.primary, marginBottom: 14,
              }}>
                <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>✨ {response}</Text>
              </View>
            ) : null}

            <Pressable
              style={{ backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              onPress={handleCommand}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Send Command</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}



const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card:       theme.surface,
    border:     theme.border,
    primary:    theme.primary,
    text:       theme.text,
    notification: theme.primary,
  },
};

const ICONS: Record<string, string> = {
  Home:    "⊡",
  Chat:    "✦",
  Jobs:    "◈",
  Track:   "◉",
  Profile: "👤",
};

const ACTIVE_COLORS: Record<string, string> = {
  Home:    "#3b82f6",
  Chat:    "#3b82f6",
  Jobs:    "#10b981",
  Track:   "#f59e0b",
  Profile: "#3b82f6",
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const activeColor = ACTIVE_COLORS[name] ?? theme.primary;
  const color = focused ? activeColor : theme.muted;
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 18, color, fontWeight: focused ? "700" : "400" }}>{ICONS[name] ?? "•"}</Text>
    </View>
  );
}

/** "Track" tab — contains Attendance, Schedule, Assignments, Placement, Finance */
function TrackStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: theme.surface },
        headerTintColor:  theme.text,
        headerTitleStyle: { fontSize: 16, fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle:     { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen
        name="TrackHome"
        component={TrackHomeScreen}
        options={{ title: "Track" }}
      />
      <Stack.Screen name="attendance"  component={AttendanceScreen}  options={{ title: "Attendance" }} />
      <Stack.Screen name="schedule"    component={ScheduleScreen}    options={{ title: "Schedule" }} />
      <Stack.Screen name="assignments" component={AssignmentsScreen} options={{ title: "Assignments" }} />
      <Stack.Screen name="placement"   component={PlacementScreen}   options={{ title: "Placement" }} />
      <Stack.Screen name="finance"     component={FinanceScreen}     options={{ title: "Finance" }} />
    </Stack.Navigator>
  );
}

function TrackHomeScreen({ navigation }: any) {
  const [metrics, setMetrics] = useState<any>({
    attendance: "--%",
    schedule: "Classes today",
    assignments: "Pending tasks",
    placement: "Active apps",
    finance: "Left this month"
  });
  const [loading, setLoading] = useState(false);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [att, sch, ass, fin, pla] = await Promise.all([
        getAttendance().catch(() => null),
        getSchedule().catch(() => null),
        getAssignments().catch(() => null),
        getFinance().catch(() => null),
        getPlacement().catch(() => null),
      ]);

      const overallPct = att?.overall?.percentage ? `${att.overall.percentage}%` : "--%";
      
      const todayDateStr = sch?.today;
      const todayWeekDay = sch?.week?.find((w: any) => w.date === todayDateStr);
      const classesCount = todayWeekDay?.classes?.length ?? 0;
      const classesText = classesCount === 1 ? "1 class today" : `${classesCount} classes today`;
      
      const assCount = ass?.assignments?.filter((a: any) => a.status === "pending")?.length ?? 0;
      const assText = assCount === 1 ? "1 pending task" : `${assCount} pending tasks`;

      const budgetLeft = fin?.budget_remaining ? `₹${fin.budget_remaining.toLocaleString("en-IN")} left` : "--";
      
      const activeAppsCount = pla?.applications?.length ?? 0;
      const appsText = activeAppsCount === 1 ? "1 active app" : `${activeAppsCount} active apps`;

      setMetrics({
        attendance: overallPct,
        schedule: classesText,
        assignments: assText,
        placement: appsText,
        finance: budgetLeft
      });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadMetrics();
    });
    return unsub;
  }, [navigation]);

  const cards = [
    { label: "Attendance",  icon: "📊", route: "attendance",  desc: "Classes & safe bunks", value: metrics.attendance, color: "#10b981" },
    { label: "Schedule",    icon: "📅", route: "schedule",    desc: "Today's timetable",   value: metrics.schedule,   color: "#3b82f6" },
    { label: "Assignments", icon: "📝", route: "assignments", desc: "Deadlines & priority", value: metrics.assignments,  color: "#f59e0b" },
    { label: "Placement",   icon: "🎯", route: "placement",   desc: "Company pipeline",    value: metrics.placement,    color: "#a855f7" },
    { label: "Finance",     icon: "💰", route: "finance",     desc: "Monthly expenses",    value: metrics.finance,      color: "#ec4899" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 16 }}>AUDIT & PROGRESS CENTER</Text>
      
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
        {cards.map(card => (
          <Pressable
            key={card.route}
            onPress={() => navigation.navigate(card.route)}
            style={({ pressed }) => [
              {
                width: "48%",
                backgroundColor: theme.surface,
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
                minHeight: 140,
                justifyContent: "space-between",
              },
              pressed && { opacity: 0.8 }
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: card.color + "12", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>{card.icon}</Text>
              </View>
              <Text style={{ color: theme.muted, fontSize: 18 }}>›</Text>
            </View>
            
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: card.color, fontSize: 20, fontWeight: "700" }}>{card.value}</Text>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", marginTop: 4 }}>{card.label}</Text>
              <Text style={{ color: theme.muted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{card.desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/** Main bottom tab navigator */
function RootTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle:             { backgroundColor: theme.surface },
        headerTintColor:         theme.text,
        headerTitleStyle:        { fontSize: 16, fontWeight: "600" as const },
        headerShadowVisible:     false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" as const },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Jobs" component={JobsScreen} />
      <Tab.Screen
        name="Track"
        component={TrackStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState<string | undefined>("Home");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const cached = await AsyncStorage.getItem("jwt_token");
        setToken(cached);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log("Deep link received:", event.url);
      const url = event.url;
      if (url.includes("/oauth")) {
        const match = url.match(/[?&]token=([^&]+)/);
        const tokenVal = match ? match[1] : null;
        if (tokenVal) {
          try {
            await AsyncStorage.setItem("jwt_token", tokenVal);
            setToken(tokenVal);
            Alert.alert("Success", "Authenticated successfully via OAuth!");
          } catch (e) {
            console.warn(e);
          }
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!token) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen onLoginSuccess={(t) => setToken(t)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onStateChange={() => {
          const route = navigationRef.getCurrentRoute() as { name?: string } | undefined;
          setCurrentRoute(route?.name);
        }}
      >
        <RootTabs onLogout={() => setToken(null)} />
        {currentRoute !== "Chat" && currentRoute !== "Profile" && <AgentFloatingButton />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
