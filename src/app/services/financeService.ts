/**
 * Finance service - spending analysis and budget recommendations.
 */

import ApiClient from "./apiClient";

export interface SpendingBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
  average: number;
}

export interface FinanceStats {
  total_spent: number;
  days_analyzed: number;
  daily_average: number;
  monthly_projection: number;
  breakdown: SpendingBreakdown[];
  transaction_count: number;
}

export interface FinanceResponse {
  stats: FinanceStats;
  insights: string;
  recommendations: string[];
}

export class FinanceService {
  /**
   * Get finance insights and budget recommendations.
   */
  static async getInsights(): Promise<FinanceResponse> {
    const response = await ApiClient.getFinanceInsights();

    if (!response.ok) {
      throw new Error(response.error);
    }

    return response.data as FinanceResponse;
  }
}

export default FinanceService;
