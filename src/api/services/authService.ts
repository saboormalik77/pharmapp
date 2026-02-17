/**
 * Authentication API Service
 * Matches pharma-collect-ui authService exactly
 */

import { apiClient, storage, UserData } from '../client';

export interface SignupData {
  email: string;
  password: string;
  name: string;
  pharmacyName: string;
  npiNumber: string;
  deaNumber: string;
  phone?: string;
  physicalAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface SigninData {
  email: string;
  password: string;
  fcmToken?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    pharmacy_name: string;
    phone?: string;
  };
  token: string;
  refreshToken: string;
  session: any;
}

export const authService = {
  /**
   * Sign up a new user
   * POST /auth/signup
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 AUTH SIGNUP:', '/auth/signup');
    console.log('📤 Request:', JSON.stringify({ email: data.email, name: data.name, pharmacyName: data.pharmacyName }, null, 2));
    console.log('⏱️  Time:', new Date().toLocaleTimeString());

    const response = await apiClient.post<AuthResponse>('/auth/signup', data, false);
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(response, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (response.status === 'success' && response.data) {
      // Store token, refresh token, and user data
      await storage.setToken(response.data.token);
      if (response.data.refreshToken) {
        await storage.setRefreshToken(response.data.refreshToken);
      }
      await storage.setUserData({
        user: response.data.user,
        pharmacyId: response.data.user.id,
      });
      return response.data;
    }
    throw new Error(response.message || 'Signup failed');
  },

  /**
   * Sign in an existing user
   * POST /auth/signin
   */
  async signin(data: SigninData): Promise<AuthResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 AUTH SIGNIN:', '/auth/signin');
    console.log('📤 Request:', JSON.stringify({ email: data.email, fcmToken: data.fcmToken ? data.fcmToken.substring(0, 20) + '...' : null }, null, 2));
    console.log('⏱️  Time:', new Date().toLocaleTimeString());

    const response = await apiClient.post<AuthResponse>('/auth/signin', data, false);
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(response, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (response.status === 'success' && response.data) {
      // Store token, refresh token, and user data
      await storage.setToken(response.data.token);
      if (response.data.refreshToken) {
        await storage.setRefreshToken(response.data.refreshToken);
      }
      await storage.setUserData({
        user: response.data.user,
        pharmacyId: response.data.user.id,
      });
      return response.data;
    }
    throw new Error(response.message || 'Signin failed');
  },

  /**
   * Sign out current user
   */
  async signout(): Promise<void> {
    await storage.clearAll();
  },

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<AuthResponse['user'] | null> {
    const userData = await storage.getUserData();
    return userData?.user || null;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },

  /**
   * Request a password reset email
   * POST /auth/forgot-password
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/forgot-password',
      { email },
      false
    );
    if (response.status === 'success') {
      return { message: response.message || 'Password reset email sent' };
    }
    throw new Error(response.message || 'Failed to send password reset email');
  },

  /**
   * Reset password using access token from email link
   * POST /auth/reset-password
   */
  async resetPassword(accessToken: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/auth/reset-password',
      { accessToken, newPassword },
      false
    );
    if (response.status === 'success') {
      return { message: response.message || 'Password reset successfully' };
    }
    throw new Error(response.message || 'Failed to reset password');
  },

  /**
   * Refresh access token using refresh token
   * POST /auth/refresh
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await storage.getRefreshToken();

    if (!refreshToken) {
      await storage.clearAll();
      return null;
    }

    try {
      const response = await apiClient.post<{ token: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
        false
      );

      if (response.status === 'success' && response.data) {
        await storage.setToken(response.data.token);
        if (response.data.refreshToken) {
          await storage.setRefreshToken(response.data.refreshToken);
        }
        return response.data.token;
      }

      await storage.clearAll();
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await storage.clearAll();
      return null;
    }
  },
};

