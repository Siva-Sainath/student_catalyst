import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";
let tokenCache: string | null = null;

async function token() {
  if (!tokenCache) tokenCache = await AsyncStorage.getItem(TOKEN_KEY);
  return tokenCache;
}

async function req(path: string, init: RequestInit = {}) {
  const t = await token();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const Api = {
  baseUrl: BASE_URL,
  async ensureAuth() {
    if (await token()) return;
    const data = await req("/auth/demo", {
      method: "POST",
      body: JSON.stringify({ email: "student@vit.ac.in", name: "Rahul Sharma" }),
    });
    tokenCache = data.access_token;
    await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  },
  getDashboard: () => req("/mvp/dashboard"),
  getSchedule: () => req("/mvp/schedule"),
  getAssignments: () => req("/mvp/assignments"),
  getPlacement: () => req("/mvp/placement"),
  getTravel: () => req("/mvp/travel"),
  getAttendance: () => req("/agent/attendance/stats"),
  getFinance: () => req("/agent/finance/insights"),
  getJobs: () => req("/agent/jobs/recommend"),
  voice: (text: string) =>
    req("/agent/voice/command/enhanced", { method: "POST", body: JSON.stringify({ text }) }),
  async *streamChat(message: string, topic = "General") {
    const t = await token();
    const res = await fetch(`${BASE_URL}/agent/chat/homework`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: JSON.stringify({ message, topic }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) return;
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      for (let i = 0; i < parts.length - 1; i++) {
        const line = parts[i].trim();
        if (!line.startsWith("data:")) continue;
        try {
          const j = JSON.parse(line.slice(5).trim());
          if (j.token) yield j.token as string;
        } catch {
          /* skip */
        }
      }
      buf = parts[parts.length - 1];
    }
  },
};
