/**
 * API client for Mac backend communication.
 * Handles JWT token management and HTTP requests.
 */

// Use localhost for development, can be overridden with VITE_MAC_SERVER_URL
const API_BASE_URL = import.meta.env.VITE_MAC_SERVER_URL || "http://localhost:8000";

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export class ApiClient {
  /**
   * Get JWT token from localStorage.
   */
  static getToken(): string | null {
    return localStorage.getItem("access_token");
  }

  /**
   * Store JWT token in localStorage.
   */
  static setToken(token: string): void {
    localStorage.setItem("access_token", token);
  }

  /**
   * Clear JWT token and user data.
   */
  static clearToken(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  }

  /**
   * Get stored user data.
   */
  static getUser(): any {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  /**
   * Store user data in localStorage.
   */
  static setUser(user: any): void {
    localStorage.setItem("user", JSON.stringify(user));
  }

  /**
   * Helper to make HTTP requests with JWT token.
   */
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Token expired or invalid
        if (response.status === 401) {
          this.clearToken();
        }

        return {
          ok: false,
          status: response.status,
          error: data?.detail || `HTTP ${response.status}`,
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  /**
   * Upload multipart/form-data (e.g. audio blobs for Whisper transcription).
   * Does NOT set Content-Type — the browser fills in the boundary automatically.
   */
  static async postFormData<T = any>(
    endpoint: string,
    form: FormData
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) this.clearToken();
        return {
          ok: false,
          status: response.status,
          error: data?.detail || `HTTP ${response.status}`,
        };
      }
      return { ok: true, status: response.status, data };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }


  /**
   * Stream response from endpoint (for chat).
   */
  static async *stream<T>(
    endpoint: string,
    body: any = {}
  ): AsyncGenerator<string> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        for (let i = 0; i < events.length - 1; i++) {
          const event = events[i]
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          for (const line of event) {
            if (!line.startsWith("data:")) continue;
            try {
              const json = JSON.parse(line.slice(5).trim());
              if (json.token) {
                yield json.token;
              }
            } catch (_e) {
              // Ignore JSON parse errors
            }
          }
        }
        buffer = events[events.length - 1];
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const trailing = buffer
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        for (const line of trailing) {
          if (!line.startsWith("data:")) continue;
          try {
            const json = JSON.parse(line.slice(5).trim());
            if (json.token) {
              yield json.token;
            }
          } catch (_e) {
            // Ignore
          }
        }
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error("Stream error");
    }
  }

  // ===== Authentication =====

  static async loginWithGoogle(idToken: string): Promise<ApiResponse> {
    return this.request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  static async loginWithGitHub(accessToken: string): Promise<ApiResponse> {
    return this.request("/auth/github", {
      method: "POST",
      body: JSON.stringify({ access_token: accessToken }),
    });
  }

  static async loginWithDemo(email: string, name: string): Promise<ApiResponse> {
    return this.request("/auth/demo", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    });
  }

  static async verifyToken(): Promise<ApiResponse> {
    return this.request("/auth/verify");
  }

  // ===== User Profile =====

  static async getUserProfile(): Promise<ApiResponse> {
    return this.request("/user/profile");
  }

  static async updateProfile(data: any): Promise<ApiResponse> {
    return this.request("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ===== Chat / Homework =====

  static async streamHomeworkHelp(message: string, topic?: string): AsyncGenerator<string> {
    return this.stream("/agent/chat/homework", {
      message,
      topic: topic || "General",
    });
  }

  static async getChatHistory(limit: number = 10): Promise<ApiResponse> {
    return this.request(`/agent/chat/history?limit=${limit}`);
  }

  // ===== Jobs =====

  static async getJobRecommendations(): Promise<ApiResponse> {
    return this.request("/agent/jobs/recommend");
  }

  // ===== Voice =====

  static async executeVoiceCommand(text: string): Promise<ApiResponse> {
    return this.request("/agent/voice/command/enhanced", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  // ===== Attendance =====

  static async getAttendanceStats(): Promise<ApiResponse> {
    return this.request("/agent/attendance/stats");
  }

  // ===== Finance =====

  static async getFinanceInsights(): Promise<ApiResponse> {
    return this.request("/agent/finance/insights");
  }

  // ===== System =====

  static async getHealth(): Promise<ApiResponse> {
    return this.request("/health");
  }

  static async getStatus(): Promise<ApiResponse> {
    return this.request("/status");
  }

  static async getControlPanel(): Promise<ApiResponse> {
    return this.request("/control");
  }

  // ===== MVP Feature Endpoints =====

  static async getMvpDashboard(): Promise<ApiResponse> {
    return this.request("/data/dashboard");
  }

  static async getMvpSchedule(): Promise<ApiResponse> {
    return this.request("/data/schedule");
  }

  static async getMvpAssignments(): Promise<ApiResponse> {
    return this.request("/data/assignments");
  }

  static async createMvpAssignment(data: any): Promise<ApiResponse> {
    return this.request("/data/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updateMvpAssignment(assignmentId: number, data: any): Promise<ApiResponse> {
    return this.request(`/data/assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  static async getMvpPlacement(): Promise<ApiResponse> {
    return this.request("/data/placement");
  }

  static async createMvpPlacement(data: any): Promise<ApiResponse> {
    return this.request("/data/placement", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async updateMvpPlacement(applicationId: number, data: any): Promise<ApiResponse> {
    return this.request(`/data/placement/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  static async getMvpTravel(): Promise<ApiResponse> {
    return this.request("/data/travel");
  }

  static async createMvpTravel(data: any): Promise<ApiResponse> {
    return this.request("/data/travel", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async createMvpSchedule(data: any): Promise<ApiResponse> {
    return this.request("/data/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export default ApiClient;
