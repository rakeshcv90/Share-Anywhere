import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/global/Icon';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { goBack } from '../utils/NavigationUtil';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Plans Data ───────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '₹99',
    period: '/month',
    tagline: 'Perfect for personal use',
    gradient: ['#3B82F6', '#1D4ED8'] as const,
    accentColor: '#3B82F6',
    features: [
      { icon: 'people-outline', text: 'Up to 3 connected users' },
      { icon: 'cloud-upload-outline', text: '500 MB file size limit' },
      { icon: 'time-outline', text: 'Last 50 transfer history' },
      { icon: 'ban-outline', text: 'Ad-free experience' },
      { icon: 'color-palette-outline', text: 'All themes unlocked' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹249',
    period: '/month',
    tagline: 'Unlimited power for teams',
    gradient: ['#F59E0B', '#D97706'] as const,
    accentColor: '#F59E0B',
    isPopular: true,
    features: [
      { icon: 'infinite-outline', text: 'Unlimited connected users' },
      { icon: 'cloud-upload-outline', text: 'No file size limit' },
      { icon: 'time-outline', text: 'Unlimited transfer history' },
      { icon: 'ban-outline', text: 'Ad-free experience' },
      { icon: 'color-palette-outline', text: 'All themes unlocked' },
      { icon: 'headset-outline', text: 'Priority support' },
    ],
  },
];

const SubscriptionScreen = () => {
  const { colors, isDark } = useTheme();
  const { currentPlan } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState('pro');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-40)).current;
  const card1Slide = useRef(new Animated.Value(60)).current;
  const card2Slide = useRef(new Animated.Value(80)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const ctaSlide = useRef(new Animated.Value(60)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Header
    Animated.spring(headerSlide, {
      toValue: 0,
      friction: 7,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Cards stagger
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(card1Slide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(card1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 200);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(card2Slide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(card2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 350);

    // CTA
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(ctaSlide, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
        Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 500);

    // Shimmer loop
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const handleSubscribe = () => {
    // TODO: Integrate with actual payment gateway
    Alert.alert(
      'Subscribe',
      `Subscribe to ${selectedPlan === 'basic' ? 'Basic' : 'Pro'} plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () => {
            Alert.alert('Success', 'Payment integration coming soon!');
          },
        },
      ],
    );
  };

  const renderPlanCard = (plan: typeof PLANS[0], index: number) => {
    const isSelected = selectedPlan === plan.id;
    const slideAnim = index === 0 ? card1Slide : card2Slide;
    const opacityAnim = index === 0 ? card1Opacity : card2Opacity;
    const isCurrentPlan = currentPlan === plan.id;

    return (
      <Animated.View
        key={plan.id}
        style={{
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedPlan(plan.id)}
          style={[
            styles.planCard,
            {
              borderColor: isSelected ? plan.accentColor : 'rgba(255,255,255,0.08)',
              borderWidth: isSelected ? 2 : 1,
            },
          ]}
        >
          {/* Popular badge */}
          {plan.isPopular && (
            <LinearGradient
              colors={plan.gradient as unknown as string[]}
              style={styles.popularBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="star" iconFamily="Ionicons" size={12} color="#fff" />
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </LinearGradient>
          )}

          {/* Current plan badge */}
          {isCurrentPlan && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>CURRENT</Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.planHeader}>
            <LinearGradient
              colors={plan.gradient as unknown as string[]}
              style={styles.planIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon
                name={plan.id === 'basic' ? 'rocket-outline' : 'diamond-outline'}
                iconFamily="Ionicons"
                size={22}
                color="#fff"
              />
            </LinearGradient>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planTagline}>{plan.tagline}</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: plan.accentColor }]}>{plan.price}</Text>
            <Text style={styles.period}>{plan.period}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresList}>
            {plan.features.map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: `${plan.accentColor}15` },
                  ]}
                >
                  <Icon
                    name={feat.icon}
                    iconFamily="Ionicons"
                    size={14}
                    color={plan.accentColor}
                  />
                </View>
                <Text style={styles.featureText}>{feat.text}</Text>
              </View>
            ))}
          </View>

          {/* Select indicator */}
          <View
            style={[
              styles.radioOuter,
              isSelected && { borderColor: plan.accentColor },
            ]}
          >
            {isSelected && (
              <View
                style={[styles.radioInner, { backgroundColor: plan.accentColor }]}
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={['#0A1628', '#1B2B4B', '#1E3A5F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.flex}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <TouchableOpacity onPress={() => goBack()} style={styles.closeBtn}>
            <Icon name="close" iconFamily="Ionicons" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.restoreText} onPress={() => Alert.alert('Restore', 'Restore purchase coming soon!')}>
            Restore
          </Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <Animated.View
            style={[
              styles.titleSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: headerSlide }],
              },
            ]}
          >
            <LinearGradient
              colors={['#0072FF', '#00D2FF']}
              style={styles.crownBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="shield-checkmark" iconFamily="Ionicons" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Unlock Full Power</Text>
            <Text style={styles.subtitle}>
              Choose a plan that fits your needs and enjoy unlimited file sharing
            </Text>
          </Animated.View>

          {/* Plan Cards */}
          {PLANS.map((plan, i) => renderPlanCard(plan, i))}

          {/* CTA Button */}
          <Animated.View
            style={{
              opacity: ctaOpacity,
              transform: [{ translateY: ctaSlide }],
              marginTop: 24,
            }}
          >
            <TouchableOpacity activeOpacity={0.85} onPress={handleSubscribe}>
              <LinearGradient
                colors={
                  selectedPlan === 'pro'
                    ? ['#F59E0B', '#D97706']
                    : ['#3B82F6', '#1D4ED8']
                }
                style={styles.ctaBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>
                  Subscribe to {selectedPlan === 'pro' ? 'Pro' : 'Basic'}
                </Text>
                <Icon name="arrow-forward" iconFamily="Ionicons" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Free comparison */}
            <View style={styles.freeCompare}>
              <View style={styles.freeDot} />
              <Text style={styles.freeText}>
                Free plan: 1 file transfer, 1 user, limited features
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Header ──
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    color: '#00D2FF',
    fontSize: 14,
    fontFamily: 'Okra-Bold',
  },

  // ── Title ──
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  crownBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Okra-Bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // ── Plan Card ──
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopRightRadius: 24,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Okra-Bold',
    letterSpacing: 1,
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'Okra-Bold',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planInfo: {
    marginLeft: 14,
  },
  planName: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Okra-Bold',
  },
  planTagline: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    marginTop: 2,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  price: {
    fontSize: 32,
    fontFamily: 'Okra-Bold',
  },
  period: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    marginLeft: 4,
  },

  // Features
  featuresList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    flex: 1,
  },

  // Radio
  radioOuter: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // CTA
  ctaBtn: {
    height: 58,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Okra-Bold',
    letterSpacing: 0.5,
  },

  // Free compare
  freeCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  freeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  freeText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontFamily: 'Okra-Medium',
  },
});

export default SubscriptionScreen;
