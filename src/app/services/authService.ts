/**
 * Authentication service - OAuth and token management.
 */

import ApiClient from "./apiClient";

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  major?: string;
  gpa?: number;
  skills?: string[];
  is_new?: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export class AuthService {
  /**
   * Check if user is logged in.
   */
  static isAuthenticated(): boolean {
    const token = ApiClient.getToken();
    return !!token;
  }

  /**
   * Get current user from localStorage.
   */
  static getCurrentUser(): User | null {
    return ApiClient.getUser();
  }

  /**
   * Login with Google OAuth.
   * Frontend passes ID token from Google Sign-In.
   */
  static async loginWithGoogle(idToken: string): Promise<{ user: User; error?: string }> {
    const response = await ApiClient.loginWithGoogle(idToken);

    if (!response.ok) {
      return { user: null as any, error: response.error };
    }

    const data = response.data as LoginResponse;

    // Store token and user
    ApiClient.setToken(data.access_token);
    ApiClient.setUser(data.user);

    return { user: data.user };
  }

  /**
   * Login with GitHub OAuth.
   */
  static async loginWithGitHub(accessToken: string): Promise<{ user: User; error?: string }> {
    const response = await ApiClient.loginWithGitHub(accessToken);

    if (!response.ok) {
      return { user: null as any, error: response.error };
    }

    const data = response.data as LoginResponse;

    // Store token and user
    ApiClient.setToken(data.access_token);
    ApiClient.setUser(data.user);

    return { user: data.user };
  }

  /**
   * Verify token is still valid.
   */
  static async verifyToken(): Promise<boolean> {
    const response = await ApiClient.verifyToken();
    return response.ok;
  }

  /**
   * Logout - clear token and user data.
   */
  static logout(): void {
    ApiClient.clearToken();
  }

  /**
   * Check if user needs to complete onboarding.
   */
  static needsOnboarding(): boolean {
    const user = this.getCurrentUser();
    return user?.is_new ?? false;
  }
}

export type { User };
