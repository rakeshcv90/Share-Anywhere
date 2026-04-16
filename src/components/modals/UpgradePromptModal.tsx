import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../global/Icon';
import { navigate } from '../../utils/NavigationUtil';

const { height: screenHeight } = Dimensions.get('window');

interface UpgradePromptModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  type?: 'transfer_limit' | 'user_limit';
}

const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'transfer_limit',
}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const lockPulse = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Open
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Lock pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(lockPulse, {
            toValue: 1.15,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lockPulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Shake icon
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(iconRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(iconRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    } else {
      // Close
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleViewPlans = () => {
    onClose();
    setTimeout(() => {
      navigate('SubscriptionScreen');
    }, 300);
  };

  const defaultTitle =
    type === 'user_limit' ? 'User Limit Reached' : 'Upgrade to Continue';

  const defaultMessage =
    type === 'user_limit'
      ? 'Your Basic plan allows up to 3 connected users. Upgrade to Pro for unlimited connections.'
      : 'You\'ve used your free file transfer. Subscribe to a plan for unlimited transfers.';

  const rotate = iconRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Content */}
      <Animated.View
        style={[
          styles.contentWrap,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.card}>
          {/* Lock Icon */}
          <Animated.View
            style={[
              styles.lockWrap,
              { transform: [{ scale: lockPulse }, { rotate }] },
            ]}
          >
            <LinearGradient
              colors={type === 'user_limit' ? ['#F59E0B', '#D97706'] : ['#FF6B6B', '#EF4444']}
              style={styles.lockGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon
                name={type === 'user_limit' ? 'people' : 'lock-closed'}
                iconFamily="Ionicons"
                size={32}
                color="#fff"
              />
            </LinearGradient>
          </Animated.View>

          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: type === 'user_limit' ? '#F59E0B' : '#FF6B6B',
                transform: [{ scale: lockPulse }],
              },
            ]}
          />

          {/* Text */}
          <Text style={styles.title}>{title || defaultTitle}</Text>
          <Text style={styles.message}>{message || defaultMessage}</Text>

          {/* CTA */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleViewPlans} style={styles.ctaWrap}>
            <LinearGradient
              colors={['#0072FF', '#00D2FF']}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="diamond-outline" iconFamily="Ionicons" size={18} color="#fff" />
              <Text style={styles.ctaText}>View Plans</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1A1F2E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 0,
  },

  // Lock
  lockWrap: {
    marginBottom: 20,
    zIndex: 2,
  },
  lockGradient: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  glowRing: {
    position: 'absolute',
    top: 20,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    opacity: 0.2,
    alignSelf: 'center',
  },

  // Text
  title: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Okra-Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 10,
  },

  // CTA
  ctaWrap: {
    width: '100%',
  },
  ctaBtn: {
    height: 54,
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
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Okra-Bold',
    letterSpacing: 0.5,
  },

  // Dismiss
  dismissBtn: {
    marginTop: 16,
    paddingVertical: 10,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
    fontFamily: 'Okra-Medium',
  },
});

export default UpgradePromptModal;
