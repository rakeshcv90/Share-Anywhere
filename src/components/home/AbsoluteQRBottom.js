import {
  View,
  TouchableOpacity,
  Text,
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
import { useTheme } from '../../context/ThemeContext';
import { useTCP } from '../../service/TCPProvider';

const { width } = Dimensions.get('window');
const isTablet = width > 600;
const qrSize = isTablet ? 100 : 50;
const AbsoluteQRBottom = ({ onScanQR, onShareQR }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isConnected } = useTCP();
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
            bottom: insets.bottom ? insets.bottom + 10 : 20,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        <View style={[styles.glassBg, { backgroundColor: colors.navBg }]}>
          {/* Item 1: Home (Active) */}
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
            <Icon name="home" iconFamily="Ionicons" color="#0072FF" size={24} />
            <Text style={[styles.navText, { color: '#0072FF' }]}>Home</Text>
          </TouchableOpacity>

          {/* Item 2: Files */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigate('ReceivedFileScreen')}
            activeOpacity={0.7}
          >
            <Icon
              name="folder-outline"
              iconFamily="Ionicons"
              color={colors.subtext}
              size={24}
            />
            <Text style={[styles.navText, { color: colors.subtext }]}>
              Files
            </Text>
          </TouchableOpacity>

          {/* Item 3: Connections */}
          {Platform.OS !== 'ios' && (
            <TouchableOpacity
              style={styles.navItem}
              onPress={() =>
                navigate(
                  isConnected ? 'ConnectionScreen' : 'ConnectionHubScreen',
                )
              }
              activeOpacity={0.7}
            >
              <Icon
                name="people-outline"
                iconFamily="Ionicons"
                color={colors.subtext}
                size={24}
              />
              <Text style={[styles.navText, { color: colors.subtext }]}>
                Network
              </Text>
            </TouchableOpacity>
          )}

          {/* Item: Subscription */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigate('SubscriptionScreen')}
          >
            <Icon
              name="diamond-outline"
              iconFamily="Ionicons"
              color={colors.subtext}
              size={24}
            />
            <Text style={[styles.navText, { color: colors.subtext }]}>
              Premium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigate('ProfileScreen')}
          >
            <Icon
              name="person-outline"
              iconFamily="Ionicons"
              color={colors.subtext}
              size={24}
            />
            <Text style={[styles.navText, { color: colors.subtext }]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: width,
    alignItems: 'center',
  },
  glassBg: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: isTablet ? 800 : width - 36,
    height: 62,
    borderRadius: 31,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2, // Tighter gap for shorter bar
  },
  navText: {
    fontSize: 10.5,
    color: '#718096',
    fontWeight: '600',
    fontFamily: 'Okra-Medium',
    includeFontPadding: false,
    marginTop: 0, // Perfectly centered
  },
});

export default AbsoluteQRBottom;
