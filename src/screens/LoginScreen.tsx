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
import { navigate } from '../utils/NavigationUtil';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const { colors, isDark } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
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
    }, 400);

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

    // Logo float
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

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setHasSubmitted(true);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('HomeScreen');
      } else {
        Alert.alert(
          'Login Failed',
          result.error || 'Please check your credentials.',
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#0F1E3A', '#1B2D50', '#1E3A5F']}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Area */}
          <View style={styles.logoSection}>
            {/* Outer ring */}
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
            {/* Inner ring */}
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

            {/* Logo with actual image */}
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }, { translateY: logoFloat }],
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
              Welcome back! Sign in to continue
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
                    onChangeText={t => {
                      setEmail(t);
                      if (hasSubmitted && errors.email)
                        setErrors(e => ({ ...e, email: undefined }));
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
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={password}
                    onChangeText={t => {
                      setPassword(t);
                      if (hasSubmitted && errors.password)
                        setErrors(e => ({ ...e, password: undefined }));
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
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
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={
                    isLoading ? ['#4A5568', '#2D3748'] : ['#FF6B00', '#FF9500']
                  }
                  style={styles.loginBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>Sign In</Text>
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
                  <Icon
                    name="logo-google"
                    iconFamily="Ionicons"
                    size={22}
                    color="#DB4437"
                  />
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.socialBtn}>
                    <Icon
                      name="logo-apple"
                      iconFamily="Ionicons"
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Sign up link */}
          <Animated.View style={[styles.signupLink, { opacity: formOpacity }]}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigate('SignupScreen')}>
              <Text style={styles.signupBold}>Sign Up</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
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

  // ── Logo ──
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
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Okra-Bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(255,107,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    marginTop: 6,
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
    padding: 24,
  },
  inputGroup: {
    marginBottom: 18,
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
    height: 54,
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

  // ── Forgot ──
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 22,
    marginTop: -4,
  },
  forgotText: {
    color: '#FF9500',
    fontSize: 13,
    fontFamily: 'Okra-Medium',
  },

  // ── Login Button ──
  loginBtn: {
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
  loginBtnText: {
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

  // ── Signup Link ──
  signupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    paddingBottom: 20,
  },
  signupText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
  },
  signupBold: {
    color: '#FF9500',
    fontSize: 14,
    fontFamily: 'Okra-Bold',
  },
});

export default React.memo(LoginScreen);
