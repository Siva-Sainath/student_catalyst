/**
 * Jobs service - job recommendations.
 */

import ApiClient from "./apiClient";

export interface JobRecommendation {
  company: string;
  role: string;
  location: string;
  stipend: string;
  deadline: string;
  skills: string[];
  match_score: number;
  reasoning: string;
  growth: "low" | "medium" | "high";
}

export interface JobsResponse {
  recommendations: JobRecommendation[];
  user_profile?: {
    major: string;
    gpa: number;
    skills: string[];
  };
  error?: string;
}

export class JobsService {
  /**
   * Get personalized job recommendations.
   */
  static async getRecommendations(): Promise<JobsResponse> {
    const response = await ApiClient.getJobRecommendations();

    if (!response.ok) {
      return {
        recommendations: [],
        error: response.error,
      };
    }

    return response.data as JobsResponse;
  }
}

export default JobsService;
