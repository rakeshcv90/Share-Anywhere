import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { navigate } from '../../utils/NavigationUtil';
import Icon from '../global/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRScannerModal from '../modals/QRScannerModal';
import LinearGradient from 'react-native-linear-gradient';

const AbsoluteQRBottom = () => {
  const [isVisible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const slideUp = useRef(new Animated.Value(80)).current;
  const qrScale = useRef(new Animated.Value(0)).current;
  const qrPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide in from bottom
    Animated.spring(slideUp, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
      delay: 400,
    }).start();

    // QR button pop
    Animated.spring(qrScale, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
      delay: 700,
    }).start();

    // QR pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(qrPulse, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(qrPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            bottom: insets.bottom || 1,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        {/* Glass background */}
        <View style={styles.glassBg}>
          {/* Left button */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => navigate('ReceivedFileScreen')}
            activeOpacity={0.7}
          >
            <Icon
              name="apps-sharp"
              iconFamily="Ionicons"
              color="#4A5568"
              size={22}
            />
          </TouchableOpacity>

          {/* Center QR button */}
          <Animated.View
            style={{
              transform: [{ scale: Animated.multiply(qrScale, qrPulse) }],
            }}
          >
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => setVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00D2FF', '#0072FF']}
                style={styles.qrGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon
                  name="qrcode-scan"
                  iconFamily="MaterialCommunityIcons"
                  color="#fff"
                  size={24}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Right button */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => { }}
            activeOpacity={0.7}
          >
            <Icon
              name="beer-sharp"
              iconFamily="Ionicons"
              color="#4A5568"
              size={22}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {isVisible && (
        <QRScannerModal visible={isVisible} onClose={() => setVisible(false)} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingBottom: 0,
  },

  glassBg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 12,

    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,

    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },

  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrButton: {
    marginTop: -30,
  },

  qrGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
});

export default AbsoluteQRBottom;
