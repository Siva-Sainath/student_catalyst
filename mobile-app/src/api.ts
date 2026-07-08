/**
 * Hermes Agent API client.
 * Base URL is read from EXPO_PUBLIC_API_URL env var.
 * Falls back to localhost for local dev.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_ENV = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

// Only use 10.0.2.2 if we are strictly on android AND API_ENV is missing
const FALLBACK = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";
const BASE = (API_ENV && API_ENV.trim() !== "") ? API_ENV : FALLBACK;

const DEMO_EMAIL = "student@bmsce.ac.in";
const DEMO_NAME  = "Siva Sainath";

// ── Token management ─────────────────────────────────────────────────────────

let _token: string | null = null;

async function getToken(): Promise<string | null> {
  if (_token) return _token;
  _token = await AsyncStorage.getItem("jwt_token");
  return _token;
}

async function saveToken(t: string | null) {
  _token = t;
  if (t) {
    await AsyncStorage.setItem("jwt_token", t);
  } else {
    await AsyncStorage.removeItem("jwt_token");
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function ensureAuth(): Promise<string> {
  const cached = await getToken();
  if (cached) return cached;
  const res = await fetch(`${BASE}/auth/demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, name: DEMO_NAME }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  await saveToken(data.access_token);
  return data.access_token;
}

async function authHeaders() {
  const token = await ensureAuth();
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Data endpoints ────────────────────────────────────────────────────────────

async function get(path: string, retry = true): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}${path}`, { headers });
  
  if (res.status === 401 && retry) {
    await saveToken(null);
    return get(path, false);
  }
  
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const getDashboard   = () => get("/data/dashboard");
export const getAttendance  = () => get("/data/attendance");
export const getSchedule    = () => get("/data/schedule");
export const getAssignments = () => get("/data/assignments");
export const getPlacement   = () => get("/data/placement");
export const getFinance     = () => get("/data/finance");
export const getJobs        = () => get("/data/jobs");
export const getProfile     = () => get("/user/profile");

export async function updateProfile(payload: { name?: string; major?: string; gpa?: number; skills?: string[] }) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/user/profile`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update profile failed: ${res.status}`);
  return res.json();
}
export const getChatHistory = () => get("/agent/chat/history");
export const getHealth      = () => fetch(`${BASE}/health`).then(r => r.json());

// ── Streaming chat ────────────────────────────────────────────────────────────

/**
 * Streams chat tokens from the backend using SSE.
 * Usage:
 *   for await (const token of streamChat("What is recursion?")) {
 *     setText(t => t + token);
 *   }
 */
export async function* streamChat(
  message: string,
  topic: string = "General",
  mode: string = "fast",
  signal?: AbortSignal
): AsyncGenerator<{ token?: string; sources?: string[] }, void, unknown> {
  const token = await ensureAuth();
  const queue: { token?: string; sources?: string[] }[] = [];
  let resolveNext: ((value: any) => void) | null = null;
  let done = false;
  let error: any = null;

  const pushFrame = (frame: { token?: string; sources?: string[] }) => {
    queue.push(frame);
    if (resolveNext) {
      resolveNext(undefined);
      resolveNext = null;
    }
  };

  const finish = () => {
    done = true;
    if (resolveNext) {
      resolveNext(undefined);
      resolveNext = null;
    }
  };

  const fail = (err: any) => {
    error = err;
    finish();
  };

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${BASE}/agent/chat/stream`);
  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  xhr.setRequestHeader("Content-Type", "application/json");

  if (signal) {
    if (signal.aborted) {
      xhr.abort();
      return;
    }
    signal.addEventListener("abort", () => {
      xhr.abort();
      finish();
    });
  }

  let linesProcessed = 0;

  xhr.onprogress = () => {
    if (signal?.aborted) return;
    const text = xhr.responseText;
    const lines = text.split("\n");
    while (linesProcessed < lines.length - 1) {
      const line = lines[linesProcessed];
      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.token || json.sources) {
            pushFrame(json);
          }
        } catch (e) {}
      }
      linesProcessed++;
    }
  };

  xhr.onload = () => {
    if (signal?.aborted) return;
    const text = xhr.responseText;
    const lines = text.split("\n");
    while (linesProcessed < lines.length) {
      const line = lines[linesProcessed];
      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.token || json.sources) {
            pushFrame(json);
          }
        } catch (e) {}
      }
      linesProcessed++;
    }
    finish();
  };

  xhr.onerror = () => {
    fail(new Error("Network error during streaming"));
  };

  xhr.send(JSON.stringify({ message, topic, mode }));

  while (true) {
    if (queue.length > 0) {
      yield queue.shift()!;
    } else if (done) {
      if (error) throw error;
      break;
    } else {
      await new Promise(resolve => {
        resolveNext = resolve;
      });
    }
  }
}

// ── Voice command ─────────────────────────────────────────────────────────────

export async function voiceCommand(text: string) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/agent/voice/command`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Voice failed: ${res.status}`);
  return res.json();
}

export async function addAssignment(title: string, subject: string, due_date: string, type: string = "task") {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/assignments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, subject, due_date, type }),
  });
  if (!res.ok) throw new Error(`Add assignment failed: ${res.status}`);
  return res.json();
}

export async function deleteAssignment(id: number) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/assignments/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Delete assignment failed: ${res.status}`);
  return res.json();
}

export async function updateAssignment(id: number, payload: {
  title?: string;
  subject?: string;
  due_date?: string;
  type?: string;
  status?: string;
}) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/assignments/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update assignment failed: ${res.status}`);
  return res.json();
}

export async function transcribeAudio(fileUri: string): Promise<string> {
  const token = await ensureAuth();
  const formData = new FormData();

  // Ensure file:// prefix on BOTH iOS and Android. 
  // If Android gets a raw /data/user/... path without file://, fetch instantly throws "Network request failed".
  let cleanUri = fileUri;
  if (!cleanUri.startsWith("file://")) {
    cleanUri = "file://" + cleanUri;
  }
  
  // iOS sometimes double-encodes the path
  if (Platform.OS === "ios") {
    cleanUri = decodeURI(cleanUri);
  }

  // Detect extension from URI; default to m4a (Expo default)
  const rawName = cleanUri.split("/").pop() || "recording.m4a";
  const ext = rawName.includes(".") ? rawName.split(".").pop()!.toLowerCase() : "m4a";
  const mimeMap: Record<string, string> = {
    m4a: "audio/m4a",
    mp4: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    webm: "audio/webm",
    "3gp": "audio/3gpp",
    ogg: "audio/ogg",
    caf: "audio/x-caf",
  };
  const mimeType = mimeMap[ext] ?? "audio/m4a";

  formData.append("file", {
    uri: cleanUri,
    name: `recording.${ext}`,
    type: mimeType,
  } as any);

  const res = await fetch(`${BASE}/agent/voice/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Transcription failed: ${res.status}`);
  }
  const data = await res.json();
  return data.text ?? "";
}



export async function addPlacement(company: string, role: string, stage: string = "Applied") {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/placement`, {
    method: "POST",
    headers,
    body: JSON.stringify({ company, role, stage }),
  });
  if (!res.ok) throw new Error(`Add placement failed: ${res.status}`);
  return res.json();
}

export async function addTransaction(category: string, amount: number, description: string = "") {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/finance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ category, amount, description }),
  });
  if (!res.ok) throw new Error(`Add transaction failed: ${res.status}`);
  return res.json();
}

export async function updateBudget(budget: number) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/finance/budget`, {
    method: "POST",
    headers,
    body: JSON.stringify({ budget }),
  });
  if (!res.ok) throw new Error(`Update budget failed: ${res.status}`);
  return res.json();
}

export async function addScheduleEvent(event: {
  day: string;
  date: string;
  subject: string;
  start_time: string;
  end_time: string;
  room?: string;
  faculty?: string;
  status?: string;
}) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/schedule`, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Add schedule event failed: ${res.status}`);
  return res.json();
}

export async function deleteScheduleEvent(id: number) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/schedule/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Delete schedule event failed: ${res.status}`);
  return res.json();
}

export async function updateScheduleEvent(id: number, event: {
  day?: string;
  date?: string;
  subject?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  faculty?: string;
  status?: string;
}) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/schedule/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Update schedule event failed: ${res.status}`);
  return res.json();
}

export async function updateAttendance(courseId: number, attended: number, total: number) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/attendance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ course_id: courseId, attended, total }),
  });
  if (!res.ok) throw new Error(`Update attendance failed: ${res.status}`);
  return res.json();
}

export async function deleteTransaction(id: number) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/finance/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Delete transaction failed: ${res.status}`);
  return res.json();
}

export async function updateTransaction(id: number, category: string, amount: number, description: string) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE}/data/finance/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ category, amount, description }),
  });
  if (!res.ok) throw new Error(`Update transaction failed: ${res.status}`);
  return res.json();
}

export async function uploadRagDocument(fileUri: string, name?: string, mimeType?: string): Promise<string> {
  const token = await ensureAuth();
  const formData = new FormData();
  let filename = name || fileUri.split('/').pop() || "document.txt";
  const type = mimeType || (filename.endsWith(".pdf") ? "application/pdf" : "text/plain");
  
  // Ensure file extension is present for backend validation
  if (type === "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) {
    filename = filename + ".pdf";
  } else if ((type === "text/plain" || type.includes("text")) && !filename.toLowerCase().endsWith(".txt") && !filename.toLowerCase().endsWith(".md")) {
    filename = filename + ".txt";
  }

  let cleanUri = fileUri;
  if (!cleanUri.startsWith("content://")) {
    cleanUri = decodeURIComponent(cleanUri);
  }
  if (Platform.OS === "ios" && !cleanUri.startsWith("file://") && !cleanUri.startsWith("/")) {
    cleanUri = "file://" + cleanUri;
  }
  
  formData.append("file", {
    uri: cleanUri,
    name: filename,
    type: type,
  } as any);

  const res = await fetch(`${BASE}/agent/rag/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error(`Document upload failed: ${res.status}`);
  const data = await res.json();
  return data.filename;
}

export async function listRagDocuments(): Promise<{ documents: Array<{ name: string; size: number }> }> {
  return get("/agent/rag/documents");
}

export async function deleteRagDocument(filename: string): Promise<{ status: string; message: string }> {
  const token = await ensureAuth();
  const res = await fetch(`${BASE}/agent/rag/document/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Delete document failed: ${res.status}`);
  return res.json();
}

export async function uploadRagText(filename: string, content: string): Promise<string> {
  const token = await ensureAuth();
  const res = await fetch(`${BASE}/agent/rag/upload-text`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename, content }),
  });
  if (!res.ok) throw new Error(`Text upload failed: ${res.status}`);
  const data = await res.json();
  return data.filename;
}
