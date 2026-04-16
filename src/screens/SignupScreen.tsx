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
import { useAuth } from '../context/AuthContext';
import { navigate, goBack } from '../utils/NavigationUtil';

const { width, height } = Dimensions.get('window');

const SignupScreen = () => {
  const { colors, isDark } = useTheme();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
  }, []);

  // Password strength
  const getPasswordStrength = (): { level: number; color: string; label: string } => {
    if (!password) return { level: 0, color: '#4A5568', label: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, color: '#FF6B6B', label: 'Weak' };
    if (score <= 2) return { level: 2, color: '#F59E0B', label: 'Fair' };
    if (score <= 3) return { level: 3, color: '#00D2FF', label: 'Good' };
    return { level: 4, color: '#10B981', label: 'Strong' };
  };

  const strength = getPasswordStrength();

  const validate = () => {
    const newErrors: Record<string, string> = {};
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
    try {
      const result = await signup(name.trim(), email.trim(), password);
      if (result.success) {
        navigate('HomeScreen');
      } else {
        Alert.alert('Signup Failed', result.error || 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field: string) => {
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

      <LinearGradient
        colors={['#0A1628', '#1B2B4B', '#1E3A5F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Fixed Back Button */}
      <Animated.View style={[styles.backBtnFixed, { opacity: backBtnOpacity }]}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <View style={styles.backBtnInner}>
            <Icon name="chevron-back" iconFamily="Ionicons" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
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
                colors={['rgba(0,114,255,0.3)', 'rgba(0,210,255,0.1)']}
                style={styles.logoBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require('../assets/icons/app_logo.png')}
                  style={styles.logoImage}
                />
              </LinearGradient>
            </Animated.View>

            <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
              Create Account
            </Animated.Text>
            <Animated.Text style={[styles.tagline, { opacity: logoOpacity }]}>
              Join Share Anywhere • Start sharing instantly
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
                  ]}
                >
                  <Icon
                    name="person-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      clearError('name');
                    }}
                    autoCapitalize="words"
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
                  ]}
                >
                  <Icon
                    name="mail-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      clearError('email');
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

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    hasSubmitted && errors.password && styles.inputError,
                  ]}
                >
                  <Icon
                    name="lock-closed-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      clearError('password');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      iconFamily="Ionicons"
                      size={20}
                      color="rgba(255,255,255,0.4)"
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
                  ]}
                >
                  <Icon
                    name="shield-checkmark-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      clearError('confirmPassword');
                    }}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Icon
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      iconFamily="Ionicons"
                      size={20}
                      color="rgba(255,255,255,0.4)"
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
                  colors={isLoading ? ['#4A5568', '#2D3748'] : ['#0072FF', '#00D2FF']}
                  style={styles.signupBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.signupBtnText}>Create Account</Text>
                      <Icon
                        name="arrow-forward"
                        iconFamily="Ionicons"
                        size={20}
                        color="#fff"
                      />
                    </>
                  )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 50,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Logo ──
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#42D5FC',
  },
  ring1Style: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderColor: '#0072FF',
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
    backgroundColor: 'rgba(0,114,255,0.15)',
  },
  logoWrap: {
    marginBottom: 14,
    shadowColor: '#0072FF',
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
    borderColor: 'rgba(66,213,252,0.25)',
  },
  logoImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
    borderRadius: 12,
  },
  appName: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Okra-Bold',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,114,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // ── Form ──
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  formInner: {
    padding: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  input: {
    flex: 1,
    color: '#fff',
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
    backgroundColor: '#0072FF',
    borderColor: '#0072FF',
  },
  checkboxError: {
    borderColor: '#FF6B6B',
  },
  termsText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    lineHeight: 19,
  },
  termsLink: {
    color: '#00D2FF',
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
    shadowColor: '#0072FF',
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
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.3)',
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
    marginTop: 24,
    paddingBottom: 20,
  },
  loginText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
  },
  loginBold: {
    color: '#00D2FF',
    fontSize: 14,
    fontFamily: 'Okra-Bold',
  },
});

export default SignupScreen;
