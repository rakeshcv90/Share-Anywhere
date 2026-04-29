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
import FullScreenLoader from '../components/global/FullScreenLoader';

const { width, height } = Dimensions.get('window');

const SignupScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const backBtnOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(60)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  // Floating dot animations
  const dotAnims = useRef(
    [...Array(6)].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    // Back button fade in
    Animated.timing(backBtnOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Logo entrance
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

    // Form slides in
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

    // Footer
    setTimeout(() => {
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 600);

    // Glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.12,
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

    // Floating dots animation
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

  // Password strength
  const getPasswordStrength = () => {
    if (!password) return { level: 0, color: '#4A5568', label: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, color: '#FF6B6B', label: 'Weak' };
    if (score <= 2) return { level: 2, color: '#FF9500', label: 'Fair' };
    if (score <= 3) return { level: 3, color: '#FF6B00', label: 'Good' };
    return { level: 4, color: '#10B981', label: 'Strong' };
  };

  const strength = getPasswordStrength();

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedTerms) {
      newErrors.terms = 'Please agree to the Terms & Privacy Policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    setHasSubmitted(true);
    if (!validate()) return;

    setIsLoading(true);
    // Simulated network delay
    setTimeout(() => {
      setIsLoading(false);
      navigate('HomeScreen');
    }, 1500);
  };

  const clearError = (field) => {
    if (hasSubmitted && errors[field]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[field];
        return next;
      });
    }
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

      {/* Ambient background glow - top */}
      <View style={styles.ambientGlowTop} />

      {/* Ambient background glow - center */}
      <View style={styles.ambientGlowCenter} />

      {/* Floating dots */}
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

      {/* Fixed Back Button */}
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
          {/* Logo Area — consistent with Login */}
          <View style={styles.logoSection}>
            {/* Outer ring */}
            <Animated.View
              style={[
                styles.ring,
                styles.ring2Style,
                {
                  opacity: ring2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.15],
                  }),
                  transform: [{ scale: ring2 }],
                },
              ]}
            />
            {/* Inner ring */}
            <Animated.View
              style={[
                styles.ring,
                styles.ring1Style,
                {
                  opacity: ring1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.25],
                  }),
                  transform: [{ scale: Animated.multiply(ring1, glowPulse) }],
                },
              ]}
            />

            {/* Logo glow */}
            <Animated.View
              style={[
                styles.logoGlow,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: glowPulse }],
                },
              ]}
            />

            {/* Logo */}
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
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
              Create Account
            </Animated.Text>
            <Animated.Text style={[styles.tagline, { opacity: logoOpacity }]}>
              Join TransferQueen • Start sharing instantly
            </Animated.Text>
          </View>

          {/* Form */}
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
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View
                  style={[
                    styles.inputContainer,
                    hasSubmitted && errors.name && styles.inputError,
                    focusedInput === 'name' && styles.inputFocused,
                  ]}
                >
                  <Icon
                    name="person-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color={focusedInput === 'name' ? colors.accent : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                    value={name}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setName(t);
                      clearError('name');
                    }}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
                {hasSubmitted && errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              {/* Email */}
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
                    ref={emailRef}
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                    value={email}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setEmail(t);
                      clearError('email');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
                {hasSubmitted && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    hasSubmitted && errors.password && styles.inputError,
                    focusedInput === 'password' && styles.inputFocused,
                  ]}
                >
                  <Icon
                    name="lock-closed-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color={focusedInput === 'password' ? colors.accent : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                    value={password}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setPassword(t);
                      clearError('password');
                    }}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      iconFamily="Ionicons"
                      size={20}
                      color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
                    />
                  </TouchableOpacity>
                </View>
                {hasSubmitted && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                {/* Strength meter */}
                {password.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthSegment,
                            {
                              backgroundColor:
                                i <= strength.level ? strength.color : 'rgba(255,255,255,0.08)',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: strength.color }]}>
                      {strength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    hasSubmitted && errors.confirmPassword && styles.inputError,
                    focusedInput === 'confirmPassword' && styles.inputFocused,
                  ]}
                >
                  <Icon
                    name="shield-checkmark-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color={focusedInput === 'confirmPassword' ? colors.accent : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
                  />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                    value={confirmPassword}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      clearError('confirmPassword');
                    }}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      iconFamily="Ionicons"
                      size={20}
                      color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
                    />
                  </TouchableOpacity>
                </View>
                {hasSubmitted && errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Terms */}
              <TouchableOpacity
                style={styles.termsRow}
                activeOpacity={0.7}
                onPress={() => {
                  setAgreedTerms(!agreedTerms);
                  clearError('terms');
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedTerms && styles.checkboxChecked,
                    hasSubmitted && errors.terms && styles.checkboxError,
                  ]}
                >
                  {agreedTerms && (
                    <Icon name="checkmark" iconFamily="Ionicons" size={14} color="#fff" />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {hasSubmitted && errors.terms && (
                <Text style={[styles.errorText, { marginTop: -6, marginBottom: 12 }]}>
                  {errors.terms}
                </Text>
              )}

              {/* Signup Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#FF6B00', '#FF9500']}
                  style={styles.signupBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.signupBtnText}>Create Account</Text>
                  <Icon
                    name="arrow-forward"
                    iconFamily="Ionicons"
                    size={20}
                    color="#fff"
                  />
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialBtn}>
                  <Icon name="logo-google" iconFamily="Ionicons" size={22} color="#DB4437" />
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.socialBtn}>
                    <Icon name="logo-apple" iconFamily="Ionicons" size={22} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Login link */}
          <Animated.View style={[styles.loginLink, { opacity: footerOpacity }]}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => goBack()}>
              <Text style={styles.loginBold}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FullScreenLoader visible={isLoading} message="Creating account..." />
    </View>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 50,
  },

  // ── Ambient Space Pattern ──
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

  // ── Back Button (fixed at top) ──
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

  // ── Logo ──
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  ring1Style: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderColor: '#FF6B00',
  },
  ring2Style: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderStyle: 'dashed',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,107,0,0.15)',
  },
  logoWrap: {
    marginBottom: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.25)',
  },
  logoImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
    borderRadius: 12,
  },
  appName: {
    color: colors.text,
    fontSize: 24,
    fontFamily: 'Okra-Bold',
    letterSpacing: 1.5,
    textShadowColor: isDark ? 'rgba(255,107,0,0.5)' : 'rgba(255,107,0,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: colors.subtext,
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // ── Form ──
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
    marginBottom: 16,
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
    height: 52,
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

  // ── Strength ──
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontFamily: 'Okra-Bold',
  },

  // ── Terms ──
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  checkboxError: {
    borderColor: '#FF6B6B',
  },
  termsText: {
    flex: 1,
    color: colors.subtext,
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    lineHeight: 19,
  },
  termsLink: {
    color: '#FF9500',
    fontFamily: 'Okra-Bold',
  },

  // ── Signup Button ──
  signupBtn: {
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
  signupBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Okra-Bold',
    letterSpacing: 0.5,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: colors.subtext,
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    marginHorizontal: 12,
  },

  // ── Social ──
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Login Link ──
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  loginText: {
    color: colors.subtext,
    fontSize: 14,
    fontFamily: 'Okra-Medium',
  },
  loginBold: {
    color: '#FF9500',
    fontSize: 14,
    fontFamily: 'Okra-Bold',
  },
});

export default React.memo(SignupScreen);
