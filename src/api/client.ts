/**
 * Base API Client for React Native
 * Matches pharma-collect-ui web client exactly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://pharmacy-backend-dusky.vercel.app/api';

// Storage keys (matching web cookies)
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
  total?: number;
}

export interface ApiError {
  status: number;
  message: string;
  error?: string;
}

export interface UserData {
  user: {
    id: string;
    email: string;
    name: string;
    pharmacy_name: string;
    phone?: string;
  };
  pharmacyId?: string;
}

// Storage utility functions (equivalent to web cookies)
export const storage = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async setRefreshToken(refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async removeRefreshToken(): Promise<void> {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  async setUserData(userData: UserData): Promise<void> {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  },

  async getUserData(): Promise<UserData | null> {
    const data = await AsyncStorage.getItem(USER_DATA_KEY);
    if (data) {
      try {
        return JSON.parse(data) as UserData;
      } catch {
        return null;
      }
    }
    return null;
  },

  async removeUserData(): Promise<void> {
    await AsyncStorage.removeItem(USER_DATA_KEY);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_DATA_KEY]);
  },

  async getPharmacyId(): Promise<string | null> {
    const userData = await this.getUserData();
    return userData?.user?.id || userData?.pharmacyId || null;
  },
};

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private log(method: string, url: string, data?: any, response?: any, error?: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 API ${method}:`, url);
    if (data) {
      console.log('📤 Request:', JSON.stringify(data, null, 2));
    }
    console.log('⏱️  Time:', new Date().toLocaleTimeString());
    if (error) {
      console.log('❌ Error:', error);
    } else if (response) {
      console.log('✅ Status:', response.status);
      console.log('📥 Response:', JSON.stringify(response.data || response, null, 2));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Process queued requests after token refresh
   */
  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  /**
   * Handle token refresh for 401 errors
   */
  private async handleTokenRefresh<T>(retryRequest: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T> | null> {
    if (this.isRefreshing) {
      return new Promise<ApiResponse<T> | null>((resolve, reject) => {
        this.failedQueue.push({
          resolve: (value) => resolve(value as ApiResponse<T> | null),
          reject,
        });
      }).then(() => {
        return retryRequest();
      }).catch((error) => {
        throw error;
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await storage.getRefreshToken();
      
      if (!refreshToken) {
        await storage.clearAll();
        this.processQueue(new Error('No refresh token'), null);
        return null;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        await storage.setToken(data.data.token);
        if (data.data.refreshToken) {
          await storage.setRefreshToken(data.data.refreshToken);
        }
        this.processQueue(null, data.data.token);
        return await retryRequest();
      } else {
        await storage.clearAll();
        this.processQueue(new Error('Token refresh failed'), null);
        return null;
      }
    } catch (error) {
      await storage.clearAll();
      this.processQueue(error, null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Build headers for API requests
   */
  private async getHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = await storage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<ApiError> {
    let errorMessage = 'An error occurred';
    let errorData: any = {};

    try {
      const text = await response.text();
      if (text && text.trim().length > 0) {
        try {
          errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = text || response.statusText || errorMessage;
        }
      } else {
        errorMessage = response.statusText || errorMessage;
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    return {
      status: response.status,
      message: errorMessage,
      error: errorData.error,
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    // Add pharmacy_id to params if available and auth is included
    if (includeAuth) {
      const pharmacyId = await storage.getPharmacyId();
      if (pharmacyId) {
        url.searchParams.append('pharmacy_id', pharmacyId);
      }
    }

    // Add other params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    this.log('GET', url.toString());

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth) {
          const token = await storage.getToken();
          if (token) {
            const retryResponse = await this.handleTokenRefresh<T>(() =>
              this.get<T>(endpoint, params, includeAuth)
            );
            if (retryResponse) {
              return retryResponse;
            }
          }
        }

        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          await storage.clearAll();
        }

        const error = await this.handleError(response);
        this.log('GET', url.toString(), null, null, error);
        throw error;
      }

      const data = await response.json();
      this.log('GET', url.toString(), null, data);
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      const apiError = {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
      this.log('GET', url.toString(), null, null, apiError);
      throw apiError;
    }
  }

  /**
   * Make a GET request without pharmacy_id
   */
  async getWithoutPharmacyId<T>(
    endpoint: string,
    params?: Record<string, any>,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    this.log('GET', url.toString());

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        this.log('GET', url.toString(), null, null, error);
        throw error;
      }

      const data = await response.json();
      this.log('GET', url.toString(), null, data);
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    // Add pharmacy_id to body if available and auth is included
    const requestBody = body || {};
    if (includeAuth && typeof requestBody === 'object' && !Array.isArray(requestBody)) {
      const pharmacyId = await storage.getPharmacyId();
      if (pharmacyId) {
        requestBody.pharmacy_id = pharmacyId;
      }
    }

    this.log('POST', url, requestBody);

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const isAuthEndpoint = endpoint.includes('/auth/');
        if (response.status === 401 && !isAuthEndpoint && includeAuth) {
          const token = await storage.getToken();
          if (token) {
            const retryResponse = await this.handleTokenRefresh<T>(() =>
              this.post<T>(endpoint, body, includeAuth)
            );
            if (retryResponse) {
              return retryResponse;
            }
          }
        }

        if ((response.status === 401 || response.status === 403) && !isAuthEndpoint && includeAuth) {
          await storage.clearAll();
        }

        const error = await this.handleError(response);
        this.log('POST', url, requestBody, null, error);
        throw error;
      }

      const text = await response.text();
      if (!text || text.trim().length === 0) {
        return { status: 'success' } as ApiResponse<T>;
      }

      try {
        const data = JSON.parse(text);
        this.log('POST', url, requestBody, data);
        return data;
      } catch {
        throw {
          status: 500,
          message: `Server returned non-JSON response: ${text.substring(0, 200)}`,
        } as ApiError;
      }
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    endpoint: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const requestBody = body || {};
    if (includeAuth && typeof requestBody === 'object' && !Array.isArray(requestBody)) {
      const pharmacyId = await storage.getPharmacyId();
      if (pharmacyId) {
        requestBody.pharmacy_id = pharmacyId;
      }
    }

    this.log('PUT', url, requestBody);

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        this.log('PUT', url, requestBody, null, error);
        throw error;
      }

      const text = await response.text();
      if (!text || text.trim().length === 0) {
        return { status: 'success' } as ApiResponse<T>;
      }

      const data = JSON.parse(text);
      this.log('PUT', url, requestBody, data);
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const requestBody = body || {};
    if (includeAuth && typeof requestBody === 'object' && !Array.isArray(requestBody)) {
      const pharmacyId = await storage.getPharmacyId();
      if (pharmacyId) {
        requestBody.pharmacy_id = pharmacyId;
      }
    }

    this.log('PATCH', url, requestBody);

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        this.log('PATCH', url, requestBody, null, error);
        throw error;
      }

      const data = await response.json();
      this.log('PATCH', url, requestBody, data);
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(
    endpoint: string,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    this.log('DELETE', url);

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await this.handleError(response);
        this.log('DELETE', url, null, null, error);
        throw error;
      }

      if (response.status === 204) {
        return { status: 'success' } as ApiResponse<T>;
      }

      const data = await response.json();
      this.log('DELETE', url, null, data);
      return data;
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 500,
        message: error.message || 'Network error occurred',
      } as ApiError;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
