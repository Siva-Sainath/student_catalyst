import React, { useEffect } from "react";
import { NavigationContainer, DarkTheme, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Api } from "./src/api";
import { theme } from "./src/theme";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { FeatureScreen } from "./src/screens/FeatureScreen";
import { Card } from "./src/components/Card";
import { VoiceFab } from "./src/components/VoiceFab";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card: "#070f20",
    border: theme.border,
    primary: theme.primary,
    text: theme.text,
  },
};

function JobsScreen() {
  return (
    <FeatureScreen
      title="Jobs · Hermes"
      load={async () => {
        await Api.ensureAuth();
        return Api.getJobs();
      }}
      render={(d) =>
        (d.recommendations || []).slice(0, 8).map((j: any, i: number) => (
          <Card key={i}>
            <Text style={s.h}>{j.role}</Text>
            <Text style={s.m}>{j.company} · {j.location}</Text>
            <Text style={s.g}>Match {j.match_score}% · {j.stipend}</Text>
          </Card>
        ))
      }
    />
  );
}

function AttendanceScreen() {
  return (
    <FeatureScreen
      title="Attendance"
      load={async () => {
        await Api.ensureAuth();
        return Api.getAttendance();
      }}
      render={(d) => (
        <>
          <Card>
            <Text style={s.h}>Overall {d.overall?.percentage}%</Text>
            <Text style={s.m}>{d.insights}</Text>
          </Card>
          {(d.courses || []).map((c: any, i: number) => (
            <Card key={i}>
              <Text style={s.h}>{c.course}</Text>
              <Text style={s.m}>{c.attended}/{c.total} · {c.percentage}%</Text>
            </Card>
          ))}
        </>
      )}
    />
  );
}

function MoreScreen() {
  return (
    <FeatureScreen
      title="Finance"
      load={async () => {
        await Api.ensureAuth();
        return Api.getFinance();
      }}
      render={(d) => (
        <>
          <Card>
            <Text style={s.h}>₹{d.stats?.total_spent} spent</Text>
            <Text style={s.m}>{d.insights}</Text>
          </Card>
          {(d.stats?.breakdown || []).map((b: any, i: number) => (
            <Card key={i}>
              <Text style={s.h}>{b.category}</Text>
              <Text style={s.m}>₹{b.total} ({b.percentage}%)</Text>
            </Card>
          ))}
        </>
      )}
    />
  );
}

const s = {
  h: { color: theme.text, fontSize: 15, fontWeight: "600" as const },
  m: { color: theme.soft, fontSize: 13, marginTop: 4 },
  g: { color: theme.success, fontSize: 12, marginTop: 6 },
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Home: "🏠", Chat: "✨", Jobs: "💼", Attend: "📚", More: "⚙️" };
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{icons[label] || "•"}</Text>
    </View>
  );
}

function MainTabs() {
  const navigation = useNavigation();

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: "#070f20", borderTopColor: theme.border, height: 64, paddingBottom: 8 },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.muted,
          tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Jobs" component={JobsScreen} />
        <Tab.Screen name="Attend" component={AttendanceScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
      <VoiceFab navigation={navigation} />
    </>
  );
}

export default function App() {
  useEffect(() => {
    Api.ensureAuth().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
