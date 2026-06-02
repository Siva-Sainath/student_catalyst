/**
 * Attendance service - attendance statistics and insights.
 */

import ApiClient from "./apiClient";

export interface AttendanceStats {
  courses: Array<{
    course: string;
    course_code?: string;
    professor?: string;
    attended: number;
    total: number;
    late: number;
    percentage: number;
    safe_bunks: number;
  }>;
  overall: {
    attended: number;
    total: number;
    percentage: number;
    risk_level: "safe" | "caution" | "danger";
  };
}

export interface AttendanceResponse {
  stats: AttendanceStats;
  insights: string;
  recommendations: string[];
}

export class AttendanceService {
  /**
   * Get attendance statistics and insights.
   */
  static async getStats(): Promise<AttendanceResponse> {
    const response = await ApiClient.getAttendanceStats();

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data as AttendanceResponse;
  }
}

export default AttendanceService;
