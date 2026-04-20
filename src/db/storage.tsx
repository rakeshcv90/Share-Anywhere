import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'my-app-storage',
  encryptionKey: 'some-secret-key',
});

// ─── Storage Keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',

  // Subscription
  SUBSCRIPTION: 'subscription_data',
  FREE_TRANSFER_USED: 'free_transfer_used',

  // Transfer tracking
  TOTAL_TRANSFERS: 'total_transfers_count',
} as const;

export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },

  getItem: (key: string) => {
    const value = storage.getString(key);
    return value ?? null;
  },

  removeItem: (key: string) => {
    storage.delete(key);
  },

  clearAll: () => {
    storage.clearAll();
  },
};

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
export const authStorage = {
  getUser: () => {
    const data = storage.getString(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  setUser: (user: any) => {
    storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  clearAuth: () => {
    storage.delete(STORAGE_KEYS.AUTH_TOKEN);
    storage.delete(STORAGE_KEYS.REFRESH_TOKEN);
    storage.delete(STORAGE_KEYS.USER_DATA);
    storage.delete(STORAGE_KEYS.SUBSCRIPTION);
  },

  isLoggedIn: (): boolean => {
    return !!storage.getString(STORAGE_KEYS.AUTH_TOKEN);
  },
};

// ─── Subscription Helpers ─────────────────────────────────────────────────────
export const subscriptionStorage = {
  getSubscription: () => {
    const data = storage.getString(STORAGE_KEYS.SUBSCRIPTION);
    return data ? JSON.parse(data) : null;
  },

  setSubscription: (sub: any) => {
    storage.set(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(sub));
  },

  isFreeTransferUsed: (): boolean => {
    return storage.getBoolean(STORAGE_KEYS.FREE_TRANSFER_USED) ?? false;
  },

  markFreeTransferUsed: () => {
    storage.set(STORAGE_KEYS.FREE_TRANSFER_USED, true);
  },
};
