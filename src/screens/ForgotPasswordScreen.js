import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/global/Icon';
import { useTheme } from '../context/ThemeContext';
import { navigate, goBack } from '../utils/NavigationUtil';

const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const backBtnOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(60)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  // Floating dot animations
  const dotAnims = useRef(
    [...Array(6)].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    // Back button
    Animated.timing(backBtnOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Logo
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Rings
    Animated.stagger(200, [
      Animated.spring(ring1, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
      Animated.spring(ring2, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();

    // Form
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(formSlide, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 350);

    // Glow loop
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Floating dots
    dotAnims.forEach((dot, i) => {
      const delay = i * 500 + 800;
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot.opacity, {
              toValue: 0.8,
              duration: 1500,
              delay: i === 0 ? delay : 0,
              useNativeDriver: true,
            }),
            Animated.timing(dot.scale, {
              toValue: 1,
              duration: 1500,
              delay: i === 0 ? delay : 0,
              useNativeDriver: true,
            }),
            Animated.timing(dot.translateY, {
              toValue: -height * 0.15,
              duration: 3500,
              delay: i === 0 ? delay : 0,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dot.opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(dot.translateY, {
              toValue: -height * 0.2,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(dot.translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(dot.scale, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    setHasSubmitted(true);
    if (!validate()) return;

    setIsLoading(true);
    
    // Simulate network delay for sending password reset email
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      Alert.alert(
        'Email Sent',
        'If an account exists, a password reset link has been sent to your email address.',
        [{ text: 'OK', onPress: () => goBack() }]
      );
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={colors.gradientBg}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowCenter} />

      {dotAnims.map((dot, i) => (
        <Animated.View
          key={`dot-${i}`}
          style={[
            styles.floatingDot,
            {
              left: width * 0.15 + ((i * 73) % (width * 0.7)),
              bottom: height * 0.35 + ((i * 37) % 80),
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              borderRadius: 4,
              opacity: dot.opacity,
              transform: [{ translateY: dot.translateY }, { scale: dot.scale }],
            },
          ]}
        />
      ))}

      <Animated.View style={[styles.backBtnFixed, { opacity: backBtnOpacity }]}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <View style={styles.backBtnInner}>
            <Icon name="chevron-back" iconFamily="Ionicons" size={20} color={colors.icon} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <Animated.View
              style={[
                styles.ring,
                styles.ring2,
                {
                  opacity: ring2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.2],
                  }),
                  transform: [{ scale: ring2 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                styles.ring1,
                {
                  opacity: ring1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.3],
                  }),
                  transform: [{ scale: Animated.multiply(ring1, glowPulse) }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: glowPulse }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  opacity: logoOpacity,
                  transform: [
                    { scale: logoScale },
                    { translateY: logoFloat },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,107,0,0.15)', 'rgba(255,149,0,0.05)']}
                style={styles.logoBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require('../assets/icons/new.png')}
                  style={styles.logoImage}
                />
              </LinearGradient>
            </Animated.View>

            <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
              TransferQueen
            </Animated.Text>
            <Animated.Text style={[styles.tagline, { opacity: logoOpacity }]}>
              Enter your email to reset password
            </Animated.Text>
          </View>

          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: formOpacity,
                transform: [{ translateY: formSlide }],
              },
            ]}
          >
            <View style={styles.formInner}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    hasSubmitted && errors.email && styles.inputError,
                    focusedInput === 'email' && styles.inputFocused,
                  ]}
                >
                  <Icon
                    name="mail-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color={focusedInput === 'email' ? colors.accent : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                    value={email}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (hasSubmitted && errors.email) setErrors((e) => ({ ...e, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {hasSubmitted && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleReset}
                disabled={isLoading || isSuccess}
                style={{ marginTop: 10 }}
              >
                <LinearGradient
                  colors={(isLoading || isSuccess) ? ['#4A5568', '#2D3748'] : ['#FF6B00', '#FF9500']}
                  style={styles.actionBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : isSuccess ? (
                     <>
                      <Text style={styles.actionBtnText}>Link Sent!</Text>
                      <Icon
                        name="checkmark"
                        iconFamily="Ionicons"
                        size={20}
                        color="#10B981"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.actionBtnText}>Send Reset Link</Text>
                      <Icon
                        name="paper-plane-outline"
                        iconFamily="Ionicons"
                        size={20}
                        color="#fff"
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 50,
  },
  
  ambientGlowTop: {
    position: 'absolute',
    top: -height * 0.15,
    right: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
  ambientGlowCenter: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(255,107,0,0.06)',
    top: '30%',
    left: '-10%',
  },
  floatingDot: {
    position: 'absolute',
    backgroundColor: '#FF8C00',
  },

  backBtnFixed: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: 20,
    zIndex: 100,
  },
  backBtn: {},
  backBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.surface,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: isDark ? 8 : 4,
    elevation: isDark ? 6 : 2,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  ring1: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderColor: '#FF6B00',
  },
  ring2: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderStyle: 'dashed',
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,107,0,0.15)',
  },
  logoWrap: {
    marginBottom: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logoBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.25)',
  },
  logoImage: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
    borderRadius: 26,
  },
  appName: {
    color: colors.text,
    fontSize: 26,
    fontFamily: 'Okra-Bold',
    letterSpacing: 2,
    textShadowColor: isDark ? 'rgba(255,107,0,0.5)' : 'rgba(255,107,0,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: colors.subtext,
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    marginTop: 6,
  },

  formCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 28,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 24,
    elevation: isDark ? 4 : 8,
  },
  formInner: {
    padding: 22,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    color: colors.subtext,
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
  },
  inputFocused: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: isDark ? 'rgba(255,107,0,0.05)' : 'rgba(255,107,0,0.03)',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Okra-Medium',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    marginTop: 6,
    marginLeft: 4,
  },
  actionBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Okra-Bold',
    letterSpacing: 0.5,
  },
});

export default React.memo(ForgotPasswordScreen);
