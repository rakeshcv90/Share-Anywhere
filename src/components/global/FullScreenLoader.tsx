import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

interface FullScreenLoaderProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  visible,
  message = 'Loading...',
  transparent = true,
}) => {
  const { colors, isDark } = useTheme();

  // Animations
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Fade and scale in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Spinning ring animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();

      // Pulsing logo animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      spinAnim.setValue(0);
      pulseAnim.setValue(1);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  if (!visible) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      transparent={transparent}
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Glass Card */}
        <Animated.View
          style={[
            styles.glassCard,
            {
              backgroundColor: isDark
                ? 'rgba(30, 30, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.loaderContainer}>
            {/* Spinning Gradient Sweep (Hotstar style) */}
            <Animated.View
              style={[
                styles.gradientSpinner,
                { transform: [{ rotate: spin }] },
              ]}
            >
              <LinearGradient
                colors={['#FF6B00', '#FF9500', 'rgba(255,107,0,0)', 'rgba(255,107,0,0)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
              {/* Inner Mask to hollow out the ring */}
              <View
                style={[
                  styles.innerMask,
                  {
                    backgroundColor: isDark
                      ? 'rgba(30, 30, 30, 1)' // Matches the glass card visually to hollow it out
                      : 'rgba(255, 255, 255, 1)',
                  },
                ]}
              >
                {/* Central pulsing icon */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF9500']}
                    style={styles.iconGradient}
                  >
                    <Icon name="rocket" iconFamily="Ionicons" size={20} color="#FFF" />
                  </LinearGradient>
                </Animated.View>
              </View>
            </Animated.View>
          </View>

          {/* Message Text */}
          {message ? (
            <Animated.Text
              style={[
                styles.message,
                {
                  color: colors.text,
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.2],
                    outputRange: [0.6, 1],
                  }),
                },
              ]}
            >
              {message}
            </Animated.Text>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  glassCard: {
    width: 200,
    minHeight: 180,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  loaderContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gradientSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerMask: {
    width: 72, // Leaves a 4px gradient border
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  message: {
    marginTop: 24,
    fontSize: 15,
    fontFamily: 'Okra-Medium',
    letterSpacing: 0.5,
  },
});

export default FullScreenLoader;
