import { storage } from '../db/storage';


const BASE_URL = 'https://api.shareanywhere.com';


export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_DATA_KEY = 'user_data';
export const SUBSCRIPTION_KEY = 'subscription_data';
export const FREE_TRANSFER_USED_KEY = 'free_transfer_used';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface RequestConfig {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}


const getAuthToken = (): string | null => {
  return storage.getString(AUTH_TOKEN_KEY) ?? null;
};

const getRefreshToken = (): string | null => {
  return storage.getString(REFRESH_TOKEN_KEY) ?? null;
};

const setTokens = (token: string, refreshToken: string): void => {
  storage.set(AUTH_TOKEN_KEY, token);
  storage.set(REFRESH_TOKEN_KEY, refreshToken);
};

const clearTokens = (): void => {
  storage.delete(AUTH_TOKEN_KEY);
  storage.delete(REFRESH_TOKEN_KEY);
  storage.delete(USER_DATA_KEY);
  storage.delete(SUBSCRIPTION_KEY);
};

// ─── Token Refresh ────────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const refreshAuthToken = async (): Promise<boolean> => {
  // Prevent concurrent refresh calls
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return false;
      }

      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.success && data.token && data.refreshToken) {
        setTokens(data.token, data.refreshToken);
        return true;
      }

      clearTokens();
      return false;
    } catch (error) {
      if (__DEV__) {
        console.log('🔑 Token refresh failed:', error);
      }
      clearTokens();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─── Core Request Method ──────────────────────────────────────────────────────
const request = async <T = any>(
  method: string,
  endpoint: string,
  body?: any,
  config?: RequestConfig,
): Promise<ApiResponse<T>> => {
  const url = `${BASE_URL}${endpoint}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config?.headers,
  };

  // Attach auth token unless skipped
  if (!config?.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (__DEV__) {
    console.log(`📡 API ${method} ${endpoint}`, body ? JSON.stringify(body).substring(0, 200) : '');
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    let response = await fetch(url, fetchOptions);

    // Handle 401 — attempt token refresh and retry once
    if (response.status === 401 && !config?.skipAuth) {
      if (__DEV__) {
        console.log('🔁 401 received, attempting token refresh...');
      }
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        // Retry the original request with new token
        const newToken = getAuthToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
        }
        response = await fetch(url, { ...fetchOptions, headers });
      } else {
        return {
          success: false,
          error: 'Session expired. Please login again.',
        };
      }
    }

    const data = await response.json();

    if (__DEV__) {
      console.log(`📡 API Response ${response.status}:`, JSON.stringify(data).substring(0, 300));
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      data,
      ...data,
    };
  } catch (error: any) {
    if (__DEV__) {
      console.error(`❌ API Error ${method} ${endpoint}:`, error);
    }
    return {
      success: false,
      error: error.message || 'Network error. Please check your connection.',
    };
  }
};

// ─── Public API Methods ───────────────────────────────────────────────────────
const ApiService = {
  get: <T = any>(endpoint: string, config?: RequestConfig) =>
    request<T>('GET', endpoint, undefined, config),

  post: <T = any>(endpoint: string, body?: any, config?: RequestConfig) =>
    request<T>('POST', endpoint, body, config),

  put: <T = any>(endpoint: string, body?: any, config?: RequestConfig) =>
    request<T>('PUT', endpoint, body, config),

  delete: <T = any>(endpoint: string, config?: RequestConfig) =>
    request<T>('DELETE', endpoint, undefined, config),

  // ── Token utilities ──
  getAuthToken,
  getRefreshToken,
  setTokens,
  clearTokens,

  // ── Subscription API ──
  subscription: {
    getStatus: () => request('GET', '/api/subscription/status'),
    purchase: (planId: string) =>
      request('POST', '/api/subscription/purchase', { planId }),
    restore: () => request('POST', '/api/subscription/restore'),
    cancel: () => request('POST', '/api/subscription/cancel'),
  },

  // ── Config ──
  BASE_URL,
};

export default ApiService;
