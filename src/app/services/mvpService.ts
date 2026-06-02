import ApiClient from "./apiClient";

type AnyObject = Record<string, any>;

export class MvpService {
  private static initialized = false;

  static async ensureSession(): Promise<void> {
    if (this.initialized && ApiClient.getToken()) return;

    const existingToken = ApiClient.getToken();
    if (existingToken) {
      const verify = await ApiClient.verifyToken();
      if (verify.ok) {
        this.initialized = true;
        return;
      }
    }

    const result = await ApiClient.loginWithDemo("student@vit.ac.in", "Rahul Sharma");
    if (!result.ok) {
      throw new Error(result.error || "Failed to initialize demo session");
    }
    ApiClient.setToken(result.data.access_token);
    ApiClient.setUser(result.data.user);
    this.initialized = true;
  }

  private static async authedGet(fetcher: () => Promise<{ ok: boolean; data?: AnyObject; error?: string }>) {
    await this.ensureSession();
    const response = await fetcher();
    if (!response.ok) {
      throw new Error(response.error || "Request failed");
    }
    return response.data as AnyObject;
  }

  static async getDashboard() {
    return this.authedGet(() => ApiClient.getMvpDashboard());
  }

  static async getSchedule() {
    return this.authedGet(() => ApiClient.getMvpSchedule());
  }

  static async getAssignments() {
    return this.authedGet(() => ApiClient.getMvpAssignments());
  }

  static async createAssignment(payload: {
    title: string;
    subject: string;
    type: string;
    priority: string;
    due_at: string;
  }) {
    return this.authedGet(() => ApiClient.createMvpAssignment(payload));
  }

  static async updateAssignment(assignmentId: number, payload: { status?: string; priority?: string }) {
    return this.authedGet(() => ApiClient.updateMvpAssignment(assignmentId, payload));
  }

  static async getPlacement() {
    return this.authedGet(() => ApiClient.getMvpPlacement());
  }

  static async createPlacement(payload: { company: string; role: string; stage: string }) {
    return this.authedGet(() => ApiClient.createMvpPlacement(payload));
  }

  static async updatePlacement(applicationId: number, payload: { stage: string }) {
    return this.authedGet(() => ApiClient.updateMvpPlacement(applicationId, payload));
  }

  static async getTravel() {
    return this.authedGet(() => ApiClient.getMvpTravel());
  }

  static async createTravel(payload: {
    mode: string;
    source: string;
    destination: string;
    eta_min: number;
    notes: string;
  }) {
    return this.authedGet(() => ApiClient.createMvpTravel(payload));
  }

  static async createSchedule(payload: {
    day: string;
    date: string;
    subject: string;
    start_time: string;
    end_time: string;
    room: string;
    faculty: string;
  }) {
    return this.authedGet(() => ApiClient.createMvpSchedule(payload));
  }

  // ===== Attendance =====

  static async getAttendance() {
    return this.authedGet(() => ApiClient.getAttendanceStats());
  }

  // ===== Finance =====

  static async getBunkBudget() {
    return this.authedGet(() => ApiClient.getFinanceInsights());
  }

  static async getExpenses() {
    return this.authedGet(() => ApiClient.getFinanceInsights());
  }
}

export default MvpService;
