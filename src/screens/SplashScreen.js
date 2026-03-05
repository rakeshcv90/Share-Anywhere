import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { navigate } from '../utils/NavigationUtil';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  // Core animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  // Ring animations
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  // Text animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;

  // Loading bar
  const loadingWidth = useRef(new Animated.Value(0)).current;

  // Particle animations
  const particleAnims = useRef(
    [...Array(10)].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    // Phase 1: Rings expand outward (0 → 600ms)
    Animated.stagger(150, [
      Animated.spring(ring1Scale, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
      Animated.spring(ring2Scale, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
      Animated.spring(ring3Scale, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Logo pops in (400ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Phase 3: Text slides in (800ms delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Tagline slightly after title
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(taglineSlide, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);
    }, 800);

    // Loading bar animation
    Animated.timing(loadingWidth, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Continuous animations
    // Ring rotation
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Glow pulse
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
          toValue: -8,
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

    // Rising particles
    particleAnims.forEach((particle, i) => {
      const delay = i * 300;
      const loop = () => {
        particle.opacity.setValue(0);
        particle.translateY.setValue(0);
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.6,
            duration: 1000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateY, {
            toValue: -height * 0.3,
            duration: 3000,
            delay,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => loop());
      };
      loop();
    });

    // Navigate to home
    const timeout = setTimeout(() => {
      navigate('HomeScreen');
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

  const loadingBarWidth = loadingWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={['#0A1628', '#1B2B4B', '#1E3A5F']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Rising particles */}
      {particleAnims.map((particle, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: 30 + Math.random() * (width - 60),
              bottom: 40 + Math.random() * 60,
              width: 3 + Math.random() * 4,
              height: 3 + Math.random() * 4,
              borderRadius: 3,
              opacity: particle.opacity,
              transform: [{ translateY: particle.translateY }],
            },
          ]}
        />
      ))}

      {/* Outer rotating ring 3 */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring3,
          {
            opacity: ring3Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
            transform: [{ scale: ring3Scale }, { rotate }],
          },
        ]}
      />

      {/* Middle rotating ring 2 */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring2,
          {
            opacity: ring2Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.25],
            }),
            transform: [
              { scale: Animated.multiply(ring2Scale, glowPulse) },
              { rotate: rotateReverse },
            ],
          },
        ]}
      />

      {/* Inner pulsing ring 1 */}
      <Animated.View
        style={[
          styles.ringBase,
          styles.ring1,
          {
            opacity: ring1Scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.35],
            }),
            transform: [{ scale: Animated.multiply(ring1Scale, glowPulse) }],
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
            transform: [{ scale: logoScale }, { translateY: logoFloat }],
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
            source={require('../assets/images/logo.png')}
            style={styles.logo}
          />
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
        ShareIt
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineSlide }],
          },
        ]}
      >
        Lightning fast • Secure • Offline
      </Animated.Text>

      {/* Loading bar */}
      <View style={styles.loadingTrack}>
        <Animated.View style={[styles.loadingBar, { width: loadingBarWidth }]}>
          <LinearGradient
            colors={['#00D2FF', '#0072FF']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>

      {/* Bottom version text */}
      <Animated.Text style={[styles.version, { opacity: taglineOpacity }]}>
        v1.0
      </Animated.Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  particle: {
    position: 'absolute',
    backgroundColor: '#42D5FC',
  },

  ringBase: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#42D5FC',
  },

  ring1: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderColor: '#0072FF',
  },

  ring2: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderStyle: 'dashed',
  },

  ring3: {
    width: 340,
    height: 340,
    borderRadius: 170,
    borderColor: '#42D5FC',
  },

  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0,114,255,0.12)',
  },

  logoWrap: {
    marginBottom: 20,
    zIndex: 10,
  },

  logoBg: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66,213,252,0.2)',
  },

  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },

  appName: {
    color: '#fff',
    fontSize: 40,
    fontFamily: 'Okra-Bold',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,114,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },

  tagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    letterSpacing: 1.5,
    marginTop: 8,
    marginBottom: 40,
  },

  loadingTrack: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.5,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  loadingBar: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },

  version: {
    position: 'absolute',
    bottom: 50,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    letterSpacing: 1,
  },
});

export default React.memo(SplashScreen);