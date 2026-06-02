import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";

let tokenCache: string | null = null;

async function getToken(): Promise<string | null> {
  if (tokenCache) return tokenCache;
  tokenCache = await AsyncStorage.getItem(TOKEN_KEY);
  return tokenCache;
}

async function setToken(token: string) {
  tokenCache = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export const Api = {
  async restoreToken() {
    const token = await getToken();
    return !!token;
  },

  async loginDemo(email: string, name: string) {
    const data = await request("/auth/demo", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    });
    await setToken(data.access_token);
    return data;
  },

  async getDashboard() {
    return request("/mvp/dashboard");
  },

  async *streamHomework(message: string, topic = "General"): AsyncGenerator<string> {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}/agent/chat/homework`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, topic }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      for (let i = 0; i < events.length - 1; i += 1) {
        const line = events[i].trim();
        if (!line.startsWith("data:")) continue;
        const jsonPayload = line.slice(5).trim();
        try {
          const data = JSON.parse(jsonPayload);
          if (data.token) yield data.token;
        } catch {
          // ignore malformed event
        }
      }
      buffer = events[events.length - 1];
    }
  },
};
