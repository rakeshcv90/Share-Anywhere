import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import DeviceInfo from 'react-native-device-info';
import ApiService from '../service/ApiService';
import { storage, STORAGE_KEYS, authStorage } from '../db/storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'basic' | 'pro';
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  guestLogin: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  guestLogin: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // ── Restore session on mount ──
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const hasToken = authStorage.isLoggedIn();
      if (!hasToken) {
        setIsLoading(false);
        return;
      }

      // Try to get cached user data first
      const cachedUser = authStorage.getUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Then validate with backend
      const response = await ApiService.get('/api/auth/me');
      if (response.success && response.data?.user) {
        const userData = response.data.user;
        setUser(userData);
        authStorage.setUser(userData);
      } else if (!cachedUser) {
        // No cached user and backend failed — clear session
        authStorage.clearAuth();
        setUser(null);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('🔐 Session restore error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login ──
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();

        const response = await ApiService.post(
          '/api/auth/login',
          { email, password, deviceId },
          { skipAuth: true },
        );

        if (response.success && response.data?.token) {
          const { token, refreshToken, user: userData } = response.data;

          // Store tokens
          ApiService.setTokens(token, refreshToken);

          // Store user data
          setUser(userData);
          authStorage.setUser(userData);

          // Store subscription if provided
          if (response.data.subscription) {
            storage.set(
              STORAGE_KEYS.SUBSCRIPTION,
              JSON.stringify(response.data.subscription),
            );
          }

          return { success: true };
        }

        return {
          success: false,
          error: response.error || 'Login failed. Please check your credentials.',
        };
      } catch (error: any) {
        if (__DEV__) {
          console.error('🔐 Login error:', error);
        }
        return {
          success: false,
          error: error.message || 'Something went wrong. Please try again.',
        };
      }
    },
    [],
  );

  // ── Signup ──
  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();

        const response = await ApiService.post(
          '/api/auth/signup',
          { name, email, password, deviceId },
          { skipAuth: true },
        );

        if (response.success && response.data?.token) {
          const { token, refreshToken, user: userData } = response.data;

          // Store tokens
          ApiService.setTokens(token, refreshToken);

          // Store user data
          setUser(userData);
          authStorage.setUser(userData);

          return { success: true };
        }

        return {
          success: false,
          error: response.error || 'Signup failed. Please try again.',
        };
      } catch (error: any) {
        if (__DEV__) {
          console.error('🔐 Signup error:', error);
        }
        return {
          success: false,
          error: error.message || 'Something went wrong. Please try again.',
        };
      }
    },
    [],
  );

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      // Notify backend
      await ApiService.post('/api/auth/logout');
    } catch (error) {
      if (__DEV__) {
        console.log('🔐 Logout API error (non-critical):', error);
      }
    } finally {
      // Always clear local data
      ApiService.clearTokens();
      authStorage.clearAuth();
      setUser(null);
    }
  }, []);

  // ── Refresh user data ──
  const refreshUser = useCallback(async () => {
    try {
      const response = await ApiService.get('/api/auth/me');
      if (response.success && response.data?.user) {
        const userData = response.data.user;
        setUser(userData);
        authStorage.setUser(userData);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('🔐 Refresh user error:', error);
      }
    }
  }, []);

  const guestLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      const guestUser: User = {
        id: 'guest_' + Math.random().toString(36).substring(7),
        name: 'Guest User',
        email: 'guest@shareit.io',
        plan: 'free',
      };
      setUser(guestUser);
      authStorage.setUser(guestUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        guestLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => useContext(AuthContext);
