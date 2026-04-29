import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import ApiService from '../service/ApiService';
import { subscriptionStorage, authStorage } from '../db/storage';

const PLAN_LIMITS = {
  free: {
    maxTransfersPerDay: 5,
    maxConnectedUsers: 3,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    maxTransferHistory: 5,
    adsEnabled: true,
  },
  basic: {
    maxTransfersPerDay: -1, // unlimited
    maxConnectedUsers: 3,
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    maxTransferHistory: 50,
    adsEnabled: false,
  },
  pro: {
    maxTransfersPerDay: -1, // unlimited
    maxConnectedUsers: -1, // unlimited
    maxFileSize: -1, // unlimited
    maxTransferHistory: -1, // unlimited
    adsEnabled: false,
  },
};
const SubscriptionContext = createContext({
  subscription: null,
  currentPlan: 'free',
  isSubscribed: false,
  canTransferFile: () => true,
  canConnectUser: () => true,
  canSendFileSize: () => true,
  dailyTransferCount: 0,
  maxTransfersPerDay: 5,
  remainingTransfers: 5,
  maxConnectedUsers: 1,
  maxFileSize: 50 * 1024 * 1024,
  maxHistoryCount: 5,
  adsEnabled: true,
  markTransferUsed: () => {},
  fetchSubscriptionStatus: async () => {},
  purchasePlan: async () => ({ success: false }),
  restorePurchase: async () => ({ success: false }),
  showUpgradePrompt: false,
  setShowUpgradePrompt: () => {},
  upgradePromptMessage: '',
  setUpgradePromptMessage: () => {},
  upgradePromptType: 'transfer_limit',
  setUpgradePromptType: () => {},
});

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [dailyTransferCount, setDailyTransferCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptMessage, setUpgradePromptMessage] = useState('');
  const [upgradePromptType, setUpgradePromptType] = useState('transfer_limit');

  // Derived state
  const currentPlan = subscription?.isActive
    ? subscription.planType || 'free'
    : 'free';

  const isSubscribed = currentPlan !== 'free';
  const limits = PLAN_LIMITS[currentPlan];

  const maxTransfersPerDay = limits.maxTransfersPerDay;
  const maxConnectedUsers = limits.maxConnectedUsers;
  const maxFileSize = limits.maxFileSize;
  const maxHistoryCount = limits.maxTransferHistory;
  const adsEnabled = limits.adsEnabled;

  const remainingTransfers =
    maxTransfersPerDay === -1
      ? -1 // unlimited
      : Math.max(0, maxTransfersPerDay - dailyTransferCount);

  // ── Load cached data on mount ──
  useEffect(() => {
    const cachedSub = subscriptionStorage.getSubscription();
    if (cachedSub) {
      setSubscription(cachedSub);
    }
    // Load today's transfer count
    setDailyTransferCount(subscriptionStorage.getDailyTransferCount());
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

  // ── Can transfer file? (daily limit check) ──
  const canTransferFile = useCallback(() => {
    // Pro/Basic: always allowed (unlimited transfers)
    if (currentPlan === 'pro' || currentPlan === 'basic') return true;

    // Free plan: check daily limit
    const currentCount = subscriptionStorage.getDailyTransferCount();
    return currentCount < PLAN_LIMITS.free.maxTransfersPerDay;
  }, [currentPlan]);

  // ── Can connect user? (connected user limit) ──
  const canConnectUser = useCallback(
    currentConnectedCount => {
      // Pro plan: unlimited
      if (currentPlan === 'pro') return true;

      // Basic plan: max 3 users
      if (currentPlan === 'basic') {
        return currentConnectedCount < PLAN_LIMITS.basic.maxConnectedUsers;
      }

      // Free: allow 1 connection
      return currentConnectedCount < PLAN_LIMITS.free.maxConnectedUsers;
    },
    [currentPlan],
  );

  // ── Can send file of given size? ──
  const canSendFileSize = useCallback(
    fileSizeBytes => {
      // Pro: unlimited
      if (currentPlan === 'pro') return true;

      // Basic: 500 MB
      if (currentPlan === 'basic') {
        return fileSizeBytes <= PLAN_LIMITS.basic.maxFileSize;
      }

      // Free: 50 MB
      return fileSizeBytes <= PLAN_LIMITS.free.maxFileSize;
    },
    [currentPlan],
  );

  // ── Mark transfer as used (increment daily counter) ──
  const markTransferUsed = useCallback(() => {
    const newCount = subscriptionStorage.incrementDailyTransfer();
    setDailyTransferCount(newCount);
  }, []);

  // ── Purchase Plan ──
  const purchasePlan = useCallback(async (planId, receipt) => {
    try {
      if (!authStorage.isLoggedIn()) {
        return { success: false, error: 'Please login to subscribe.' };
      }

      const response = await ApiService.post('/api/subscription/purchase', {
        planId,
        ...(receipt && {
          purchaseToken: receipt.purchaseToken,
          transactionId: receipt.transactionId,
          productId: receipt.productId,
          platform: receipt.platform,
        }),
      });

      if (response.success && response.data?.subscription) {
        const sub = response.data.subscription;
        setSubscription(sub);
        subscriptionStorage.setSubscription(sub);
        return { success: true };
      }

      return {
        success: false,
        error:
          response.error || 'Purchase verification failed. Please try again.',
      };
    } catch (error) {
      if (__DEV__) {
        console.error('💎 Purchase error:', error);
      }
      return {
        success: false,
        error: error.message || 'Something went wrong. Please try again.',
      };
    }
  }, []);

  // ── Restore Purchase ──
  const restorePurchase = useCallback(async () => {
    try {
      if (!authStorage.isLoggedIn()) {
        return { success: false, error: 'Please login to restore purchases.' };
      }

      const response = await ApiService.post('/api/subscription/restore');

      if (response.success && response.data?.subscription) {
        const sub = response.data.subscription;
        setSubscription(sub);
        subscriptionStorage.setSubscription(sub);
        return { success: true };
      }

      return {
        success: false,
        error: response.error || 'No active subscription found to restore.',
      };
    } catch (error) {
      if (__DEV__) {
        console.error('💎 Restore error:', error);
      }
      return {
        success: false,
        error: error.message || 'Something went wrong. Please try again.',
      };
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        currentPlan,
        isSubscribed,
        canTransferFile,
        canConnectUser,
        canSendFileSize,
        dailyTransferCount,
        maxTransfersPerDay,
        remainingTransfers,
        maxConnectedUsers,
        maxFileSize,
        maxHistoryCount,
        adsEnabled,
        markTransferUsed,
        fetchSubscriptionStatus,
        purchasePlan,
        restorePurchase,
        showUpgradePrompt,
        setShowUpgradePrompt,
        upgradePromptMessage,
        setUpgradePromptMessage,
        upgradePromptType,
        setUpgradePromptType,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSubscription = () => useContext(SubscriptionContext);

// ─── Export Plan Limits for external use ──────────────────────────────────────
export { PLAN_LIMITS };
