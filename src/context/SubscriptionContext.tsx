import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import ApiService from '../service/ApiService';
import { subscriptionStorage, authStorage } from '../db/storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PlanType = 'free' | 'basic' | 'pro';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxUsers: number; // -1 = unlimited
    maxFileSize: number; // bytes, -1 = unlimited
    maxTransferHistory: number; // -1 = unlimited
  };
}

export interface Subscription {
  planId: string;
  planName: string;
  planType: PlanType;
  expiresAt: string;
  isActive: boolean;
  limits: {
    maxUsers: number;
    maxFileSize: number;
    maxTransferHistory: number;
  };
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  currentPlan: PlanType;
  isSubscribed: boolean;
  hasFreeTransferRemaining: boolean;
  canTransferFile: () => boolean;
  canConnectUser: (currentConnectedCount: number) => boolean;
  markFreeTransferUsed: () => void;
  fetchSubscriptionStatus: () => Promise<void>;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;
  upgradePromptMessage: string;
  setUpgradePromptMessage: (msg: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  currentPlan: 'free',
  isSubscribed: false,
  hasFreeTransferRemaining: true,
  canTransferFile: () => true,
  canConnectUser: () => true,
  markFreeTransferUsed: () => {},
  fetchSubscriptionStatus: async () => {},
  showUpgradePrompt: false,
  setShowUpgradePrompt: () => {},
  upgradePromptMessage: '',
  setUpgradePromptMessage: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [freeTransferUsed, setFreeTransferUsed] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptMessage, setUpgradePromptMessage] = useState('');

  // Derived state
  const currentPlan: PlanType = subscription?.isActive
    ? (subscription.planType || 'free')
    : 'free';

  const isSubscribed = currentPlan !== 'free';
  const hasFreeTransferRemaining = !freeTransferUsed;

  // ── Load cached data on mount ──
  useEffect(() => {
    const cachedSub = subscriptionStorage.getSubscription();
    if (cachedSub) {
      setSubscription(cachedSub);
    }
    setFreeTransferUsed(subscriptionStorage.isFreeTransferUsed());
  }, []);

  // ── Fetch subscription from backend ──
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      if (!authStorage.isLoggedIn()) return;

      const response = await ApiService.get('/api/subscription/status');
      if (response.success && response.data?.subscription) {
        const sub = response.data.subscription;
        setSubscription(sub);
        subscriptionStorage.setSubscription(sub);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('💎 Subscription fetch error:', error);
      }
    }
  }, []);

  // ── Can transfer file? ──
  const canTransferFile = useCallback((): boolean => {
    // Pro plan: always allowed
    if (currentPlan === 'pro') return true;

    // Basic plan: always allowed (within file size limits — handled separately)
    if (currentPlan === 'basic') return true;

    // Free plan: only if first file hasn't been used
    if (!freeTransferUsed) return true;

    return false;
  }, [currentPlan, freeTransferUsed]);

  // ── Can connect user? (Basic plan: max 3) ──
  const canConnectUser = useCallback(
    (currentConnectedCount: number): boolean => {
      // Pro plan: unlimited
      if (currentPlan === 'pro') return true;

      // Basic plan: max 3 users
      if (currentPlan === 'basic') {
        const maxUsers = subscription?.limits?.maxUsers ?? 3;
        return currentConnectedCount < maxUsers;
      }

      // Free: allow at least 1 connection (self)
      return currentConnectedCount < 1;
    },
    [currentPlan, subscription],
  );

  // ── Mark free transfer as used ──
  const markFreeTransferUsed = useCallback(() => {
    setFreeTransferUsed(true);
    subscriptionStorage.markFreeTransferUsed();
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        currentPlan,
        isSubscribed,
        hasFreeTransferRemaining,
        canTransferFile,
        canConnectUser,
        markFreeTransferUsed,
        fetchSubscriptionStatus,
        showUpgradePrompt,
        setShowUpgradePrompt,
        upgradePromptMessage,
        setUpgradePromptMessage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSubscription = () => useContext(SubscriptionContext);
