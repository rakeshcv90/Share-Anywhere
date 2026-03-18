import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import React, { useRef, useEffect } from 'react';
import { navigate } from '../../utils/NavigationUtil';
import Icon from '../global/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const isTablet = width > 600;
const qrSize = isTablet ? 100 : 50;
const AbsoluteQRBottom = ({ onScanQR, onShareQR }) => {
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
              onPress={onScanQR}
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
                  size={isTablet ? 25 : 20}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Right button - Show own QR code */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={onShareQR}
            activeOpacity={0.7}
          >
            <Icon
              name="share-social"
              iconFamily="Ionicons"
              color="#4A5568"
              size={22}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    paddingBottom: 0,
  },

  glassBg: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    width: isTablet ? 800 : '100%', // ⭐ FIXED WIDTH FOR iPAD

    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    paddingHorizontal: isTablet ? 40 : 28,
    paddingVertical: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,

    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },

  sideButton: {
    width: isTablet ? 52 : 44,
    height: isTablet ? 52 : 44,
    borderRadius: 16,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrButton: {
    marginTop: isTablet ? -70 : -30, // ⭐ more pop on iPad

    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrGradient: {
    width: qrSize,
    height: qrSize,
    borderRadius: qrSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  qrWrapper: {
    position: 'absolute',
    alignSelf: 'center',

    top: -(qrSize / 2), // ⭐ PERFECT CENTER POP
  },
});

export default AbsoluteQRBottom;
