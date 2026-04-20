import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
  StatusBar,
  Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { navigate } from '../utils/NavigationUtil';
import DeviceInfo from 'react-native-device-info';
import { authStorage } from '../db/storage';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Dot positions on the rings (angle in degrees)
const RING_DOTS = [
  { ring: 1, angle: 45, size: 5 },
  { ring: 1, angle: 200, size: 4 },
  { ring: 2, angle: 90, size: 6 },
  { ring: 2, angle: 270, size: 5 },
  { ring: 3, angle: 30, size: 4 },
  { ring: 3, angle: 150, size: 7 },
  { ring: 3, angle: 300, size: 5 },
  { ring: 4, angle: 60, size: 4 },
  { ring: 4, angle: 180, size: 6 },
  { ring: 4, angle: 330, size: 5 },
];

const RING_RADII = { 1: 85, 2: 130, 3: 175, 4: 220 };

const SplashScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [appVersion] = useState(DeviceInfo.getVersion());

  // Core animations
  const logoScale = useRef(new Animated.Value(0.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  // Ring animations
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0)).current;
  const ring4Scale = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(40)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(25)).current;
  const versionOpacity = useRef(new Animated.Value(0)).current;

  // Loading bar
  const loadingWidth = useRef(new Animated.Value(0)).current;
  const loadingGlow = useRef(new Animated.Value(0)).current;

  // Floating dot animations
  const dotAnims = useRef(
    [...Array(6)].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    // Phase 1: Rings expand with stagger
    Animated.stagger(100, [
      Animated.spring(ring1Scale, {
        toValue: 1,
        friction: 7,
        tension: 25,
        useNativeDriver: true,
      }),
      Animated.spring(ring2Scale, {
        toValue: 1,
        friction: 7,
        tension: 25,
        useNativeDriver: true,
      }),
      Animated.spring(ring3Scale, {
        toValue: 1,
        friction: 7,
        tension: 25,
        useNativeDriver: true,
      }),
      Animated.spring(ring4Scale, {
        toValue: 1,
        friction: 7,
        tension: 25,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Logo entrance (300ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Phase 3: Title slides in (700ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 700);

    // Phase 4: Tagline (950ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(taglineSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 950);

    // Phase 5: Version text (1200ms delay)
    setTimeout(() => {
      Animated.timing(versionOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1200);

    // Loading bar
    Animated.timing(loadingWidth, {
      toValue: 1,
      duration: 3000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // Loading bar glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingGlow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(loadingGlow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Ring rotation
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.08,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Logo float
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -5,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 5,
          duration: 3000,
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

   
    const timeout = setTimeout(() => {
      if (authStorage.isLoggedIn()) {
        navigate('HomeScreen');
      } else {
        navigate('LoginScreen');
      }
    }, 3500);

    return () => clearTimeout(timeout);
  }, []);

  const rotate = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateReverse = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  const rotateSlow = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const loadingBarWidth = loadingWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient

      colors={['#0F1E3A', '#1B2D50', '#1E3A5F']}

      style={styles.container}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
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

      {/* Outermost ring 4 - thin solid */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring4,
          {
            opacity: ring4Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
            transform: [{ scale: ring4Scale }, { rotate: rotateSlow }],
          },
        ]}
      />

      {/* Ring 3 - dashed */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring3,
          {
            opacity: ring3Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.25],
            }),
            transform: [{ scale: ring3Scale }, { rotate: rotateReverse }],
          },
        ]}
      />

      {/* Ring 2 - solid with pulse */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring2,
          {
            opacity: ring2Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.35],
            }),
            transform: [
              { scale: Animated.multiply(ring2Scale, glowPulse) },
              { rotate },
            ],
          },
        ]}
      />

      {/* Ring 1 - inner glow ring */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring1,
          {
            opacity: ring1Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.45],
            }),
            transform: [{ scale: Animated.multiply(ring1Scale, glowPulse) }],
          },
        ]}
      />

      {/* Decorative dots on rings */}
      {RING_DOTS.map((dot, i) => {
        const radius = RING_RADII[dot.ring];
        const angleRad = (dot.angle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;
        const ringScale =
          dot.ring === 1
            ? ring1Scale
            : dot.ring === 2
            ? ring2Scale
            : dot.ring === 3
            ? ring3Scale
            : ring4Scale;

        return (
          <Animated.View
            key={`ring-dot-${i}`}
            style={[
              styles.ringDot,
              {
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                opacity: ringScale.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0, 0.6],
                }),
                transform: [
                  { translateX: x },
                  { translateY: y },
                  { scale: ringScale },
                  { rotate },
                ],
              },
            ]}
          />
        );
      })}

      {/* Logo area glow - outer soft */}
      <Animated.View
        style={[
          styles.logoGlowOuter,
          {
            opacity: logoOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
            transform: [{ scale: glowPulse }],
          },
        ]}
      />

      {/* Logo area glow - inner */}
      <Animated.View
        style={[
          styles.logoGlowInner,
          {
            opacity: logoOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.35],
            }),
            transform: [{ scale: glowPulse }],
          },
        ]}
      />

      {/* Logo container with icon */}
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
          style={styles.logoOuterRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoBg}>
            <Image
              source={require('../assets/icons/new.png')}
              style={styles.logo}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* App Name */}
      <Animated.Text
        style={[
          styles.appName,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleSlide }],
          },
        ]}
      >
        TransferQueen
      </Animated.Text>

      {/* Tagline with dots */}
      <Animated.View
        style={[
          styles.taglineRow,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineSlide }],
          },
        ]}
      >
        <Text style={styles.taglineText}>Lightning fast</Text>
        <View style={styles.taglineDot} />
        <Text style={styles.taglineText}>Secure</Text>
        <View style={styles.taglineDot} />
        <Text style={styles.taglineText}>Offline</Text>
      </Animated.View>

      {/* Loading section */}
      <View style={styles.loadingSection}>
        {/* Loading bar */}
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[styles.loadingBar, { width: loadingBarWidth }]}
          >
            <LinearGradient
              colors={['#FF6B00', '#FF9500', '#FFB800']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>

        {/* Version text - always visible */}
        <Animated.Text style={[styles.version, { opacity: versionOpacity }]}>
          v{appVersion}
        </Animated.Text>
      </View>
    </LinearGradient>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },

  floatingDot: {
    position: 'absolute',
    backgroundColor: '#FF8C00',
  },

  ringBase: {
    position: 'absolute',
    borderWidth: 1,
  },

  ring1: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderColor: '#FF6B00',
    borderWidth: 1.5,
  },

  ring2: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderColor: '#FF8C00',
  },

  ring3: {
    width: 350,
    height: 350,
    borderRadius: 175,
    borderStyle: 'dashed',
    borderColor: '#FF6B00',
  },

  ring4: {
    width: 440,
    height: 440,
    borderRadius: 220,
    borderColor: '#FF8C00',
  },

  ringDot: {
    position: 'absolute',
    backgroundColor: '#FF9500',
  },

  logoGlowOuter: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FF6B00',
  },

  logoGlowInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FF6B00',
  },

  logoWrap: {
    marginBottom: 28,
    zIndex: 10,
  },

  logoOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.25)',
  },

  logoBg: {
    width: 108,
    height: 108,
    borderRadius: 26,
    overflow: 'hidden',
    // Android shadow
    elevation: 20,
    // iOS shadow
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },

  logo: {
    width: 108,
    height: 108,
    resizeMode: 'cover',
  },

  appName: {
    color: colors.text,
    fontSize: 34,
    fontFamily: 'Okra-Bold',
    letterSpacing: 1.5,
    textShadowColor: isDark ? 'rgba(255,107,0,0.35)' : 'rgba(255,107,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 25,
  },

  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },

  taglineText: {
    color: colors.subtext,
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    letterSpacing: 1.5,
  },

  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B00',
    marginHorizontal: 10,
    opacity: 0.6,
  },

  loadingSection: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },

  loadingTrack: {
    width: width * 0.45,
    height: 3,
    borderRadius: 2,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    overflow: 'visible',
  },

  loadingBar: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },

  loadingBarGlow: {
    position: 'absolute',
    top: -4,
    height: 11,
    borderRadius: 6,
    overflow: 'hidden',
  },

  version: {
    marginTop: 14,
    color: colors.subtext,
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    letterSpacing: 1.5,
  },
});

export default React.memo(SplashScreen);
