/* eslint-disable react-native/no-inline-styles */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/global/Icon';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import FullScreenLoader from '../components/global/FullScreenLoader';
import { goBack, resetAndNavigate } from '../utils/NavigationUtil';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useIAP } from 'react-native-iap';

const { width, height } = Dimensions.get('window');

// IAP product IDs — must match App Store Connect
const productIds = ['basic_99', 'pro_249'];

// Visual styling per product (things Apple doesn't provide)
const PLAN_STYLES: Record<
  string,
  {
    color: string;
    gradient: [string, string];
    icon: string;
    features: string[];
    isPopular?: boolean;
  }
> = {
  basic_99: {
    color: '#3B82F6',
    gradient: ['#3B82F6', '#60A5FA'],
    icon: 'rocket',
    features: [
      'Unlimited transfers',
      '3 connected users',
      '500 MB max file size',
      'No ads experience',
    ],
  },
  pro_249: {
    color: '#FF6B00',
    gradient: ['#FF6B00', '#FF9500'],
    icon: 'diamond',
    isPopular: true,
    features: [
      'Unlimited EVERYTHING',
      'Advanced Analytics UI',
      'Cloud Management',
      'Priority 24/7 Support',
    ],
  },
};

const SubscriptionScreen = () => {
  const { colors, isDark } = useTheme();
  const { currentPlan, purchasePlan, restorePurchase } = useSubscription();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ─── IAP with purchase listeners ──────────────────────────────────────────
  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async purchase => {
      console.log('✅ Purchase success:', purchase.productId);
      try {
        // Send receipt to backend for validation
        const result = await purchasePlan(purchase.productId, {
          purchaseToken: purchase.purchaseToken || '',
          transactionId: purchase.id,
          productId: purchase.productId,
          platform: 'ios',
        });

        // Finish the transaction with Apple
        await finishTransaction({ purchase });

        if (result.success) {
          Alert.alert(
            '🎉 Welcome to Premium!',
            'Your subscription is now active. Enjoy unlimited features!',
            [{ text: 'Awesome!', onPress: () => goBack() }],
          );
        } else {
          Alert.alert(
            'Verification Failed',
            result.error || 'Please contact support.',
          );
        }
      } catch (error: any) {
        console.error('❌ Post-purchase error:', error);
        Alert.alert(
          'Error',
          error.message || 'Something went wrong after purchase.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    onPurchaseError: error => {
      console.error('❌ Purchase error:', error);
      setIsLoading(false);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', error.message || 'Please try again.');
      }
    },
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const cardAnims = useRef(productIds.map(() => new Animated.Value(0))).current;

  // ─── Build plans purely from IAP subscriptions ────────────────────────────
  const plans = useMemo(() => {
    return (subscriptions || []).map(sub => {
      const style = PLAN_STYLES[sub.id] || {
        color: '#8B5CF6',
        gradient: ['#8B5CF6', '#A78BFA'] as [string, string],
        icon: 'star',
        features: [],
      };
      return {
        id: sub.id,
        name: sub.displayName || sub.title,
        description: sub.description || '',
        price: sub.displayPrice,
        period: '/month',
        ...style,
      };
    });
  }, [subscriptions]);

  // Fetch products when connected
  useEffect(() => {
    if (connected) {
      console.log('IAP connected');
      fetchProducts({ skus: productIds, type: 'subs' });
    }
  }, [connected]);

  // Auto-select most premium plan when subscriptions load
  useEffect(() => {
    if (subscriptions?.length > 0) {
      console.log('🔥 SUBSCRIPTIONS:', subscriptions);
      const lastSub = subscriptions[subscriptions.length - 1];
      setSelectedPlan(lastSub.id);

      // Stagger card entrance animations
      cardAnims.forEach((anim, i) => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          delay: i * 120,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [subscriptions]);

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!selectedPlan || selectedPlan === currentPlan) return;

    if (user?.id?.startsWith('guest_') || user?.email === 'guest@shareit.io') {
      Alert.alert(
        'Account Required',
        'You need to create an account to purchase a subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Up / Log In',
            onPress: () => resetAndNavigate('LoginScreen'),
          },
        ],
      );
      return;
    }

    setIsLoading(true);
    try {
      // Trigger Apple's payment sheet
      await requestPurchase({
        request: {
          apple: { sku: selectedPlan },
        },
        type: 'subs',
      });
      // onPurchaseSuccess / onPurchaseError will handle the rest
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Could not initiate purchase.');
    }
  }, [selectedPlan, currentPlan, user]);

  const handleRestore = useCallback(async () => {
    if (user?.id?.startsWith('guest_') || user?.email === 'guest@shareit.io') {
      Alert.alert(
        'Account Required',
        'You need to be logged in to restore purchases.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => resetAndNavigate('LoginScreen') },
        ],
      );
      return;
    }

    setIsLoading(true);
    try {
      // Get all previous purchases from Apple
      await getAvailablePurchases();

      // Also call backend restore
      const result = await restorePurchase();
      if (result.success) {
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert(
          'No Subscription',
          result.error || 'No active subscription found.',
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const renderPlanCard = (plan: any, index: number) => {
    const isSelected = selectedPlan === plan.id;
    const isCurrent = plan.id === currentPlan;
    const animValue = cardAnims[index] || new Animated.Value(1);

    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [60, 0],
    });

    return (
      <Animated.View
        key={plan.id}
        style={{
          opacity: animValue,
          transform: [{ translateY }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedPlan(plan.id)}
          style={[
            styles.planCard,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.95)',
              borderColor: isSelected ? plan.color : colors.border,
              borderWidth: isSelected ? 2 : 1,
              shadowColor: isSelected ? plan.color : '#000',
              shadowOpacity: isSelected ? 0.25 : 0.05,
              shadowRadius: isSelected ? 20 : 6,
              elevation: isSelected ? 10 : 2,
            },
          ]}
        >
          {plan.isPopular && (
            <LinearGradient
              colors={plan.gradient}
              style={styles.popularBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.popularText}>BEST VALUE</Text>
            </LinearGradient>
          )}

          {/* Selection indicator */}
          <View
            style={[
              styles.radioOuter,
              { borderColor: isSelected ? plan.color : colors.border },
            ]}
          >
            {isSelected && (
              <View
                style={[styles.radioInner, { backgroundColor: plan.color }]}
              />
            )}
          </View>

          {/* Plan header */}
          <View style={styles.planHeader}>
            <LinearGradient colors={plan.gradient} style={styles.planIconWrap}>
              <Icon
                name={plan.icon}
                iconFamily="Ionicons"
                size={22}
                color="#fff"
              />
            </LinearGradient>

            <View style={styles.planTitleWrap}>
              <Text style={[styles.planName, { color: colors.text }]}>
                {plan.name}
              </Text>
              <Text style={[styles.planDesc, { color: colors.subtext }]}>
                {plan.description}
              </Text>
            </View>

            <View style={styles.priceWrap}>
              <Text style={[styles.price, { color: plan.color }]}>
                {plan.price}
              </Text>
              <Text style={[styles.period, { color: colors.subtext }]}>
                {plan.period}
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresWrap}>
            {plan.features.map((feat: string, i: number) => (
              <View key={i} style={styles.featureRow}>
                <Icon
                  name="checkmark-circle"
                  iconFamily="Ionicons"
                  size={16}
                  color={plan.color}
                />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>

          {/* Current plan badge */}
          {isCurrent && (
            <View
              style={[
                styles.currentBadge,
                { backgroundColor: `${plan.color}15` },
              ]}
            >
              <Text style={[styles.currentBadgeText, { color: plan.color }]}>
                Current Plan
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* Background */}
      <LinearGradient
        colors={colors.gradientBg}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Ambient glow */}
      <Animated.View
        style={[styles.ambientGlow, { transform: [{ scale: glowPulse }] }]}
      />

      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: headerSlide }] },
          ]}
        >
          <TouchableOpacity
            onPress={() => goBack()}
            style={[
              styles.closeBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <Icon
              name="close"
              iconFamily="Ionicons"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={[styles.restoreText, { color: colors.accent }]}>
              Restore
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.View
            style={[
              styles.titleSection,
              { opacity: fadeAnim, transform: [{ translateY: headerSlide }] },
            ]}
          >
            <LinearGradient
              colors={['#FF6B00', '#FF9500']}
              style={styles.crownBadge}
            >
              <Icon
                name="shield-checkmark"
                iconFamily="Ionicons"
                size={28}
                color="#fff"
              />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.text }]}>
              Unlock Full Power
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              Choose the plan that fits you best
            </Text>
          </Animated.View>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            {plans.length > 0 ? (
              plans.map((plan, i) => renderPlanCard(plan, i))
            ) : (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.subtext }]}>
                  Loading plans...
                </Text>
              </View>
            )}
          </View>

          {/* Subscribe Button */}
          {plans.length > 0 && selectedPlan && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity
                onPress={handleSubscribe}
                activeOpacity={0.85}
                disabled={isLoading || selectedPlan === currentPlan}
                style={styles.subscribeBtn}
              >
                <LinearGradient
                  colors={
                    plans.find(p => p.id === selectedPlan)?.gradient || [
                      '#FF6B00',
                      '#FF9500',
                    ]
                  }
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <Text style={styles.subscribeBtnText}>
                  {selectedPlan === currentPlan
                    ? 'Current Plan'
                    : 'Subscribe Now'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Footer */}
          <View style={styles.footerInfo}>
            <Text style={[styles.footerText, { color: colors.subtext }]}>
              Cancel anytime · Billed through Apple · 256-bit encryption
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <FullScreenLoader visible={isLoading} message="Processing..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: { fontSize: 14, fontFamily: 'Okra-Bold' },

  // Ambient
  ambientGlow: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255,107,0,0.08)',
  },

  // Title
  titleSection: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  crownBadge: {
    width: 60,
    height: 60,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  title: { fontSize: 28, fontFamily: 'Okra-Bold', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
    marginTop: 4,
  },

  // Plans
  plansContainer: { gap: 16, marginBottom: 24 },

  planCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },

  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Okra-Bold',
    letterSpacing: 1,
  },

  radioOuter: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    gap: 12,
    marginBottom: 16,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitleWrap: { flex: 1 },
  planName: { fontSize: 18, fontFamily: 'Okra-Bold' },
  planDesc: { fontSize: 11, fontFamily: 'Okra-Medium', marginTop: 2 },

  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: 22, fontFamily: 'Okra-Bold' },
  period: { fontSize: 10, fontFamily: 'Okra-Medium' },

  // Features
  featuresWrap: {
    marginLeft: 32,
    gap: 8,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, fontFamily: 'Okra-Medium' },

  // Current badge
  currentBadge: {
    marginTop: 12,
    marginLeft: 32,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: { fontSize: 11, fontFamily: 'Okra-Bold' },

  // Subscribe button
  subscribeBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Okra-Bold',
    letterSpacing: 0.5,
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: 'Okra-Medium' },

  // Footer
  footerInfo: { alignItems: 'center', paddingHorizontal: 20 },
  footerText: {
    fontSize: 11,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default SubscriptionScreen;
