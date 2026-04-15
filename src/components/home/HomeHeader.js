import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import React, { useRef, useEffect, useState } from 'react';
import { screenWidth } from '../../utils/Constants';
import Icon from '../global/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import ThemePickerModal from './ThemePickerModal';

const HomeHeader = ({ onPressProfile }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);

  // Subtle pulse animation on wifi icon
  const wifiPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiPulse, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(wifiPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <>
      <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={colors.headerGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradientBg}
        >
          <View style={[styles.headerRow, { marginTop: 10, marginBottom: 15 }]}>
            {/* Branding Section */}
            <View style={[styles.brandingContainer, { zIndex: 10 }]}>
              <View style={styles.logoStack}>
                <View style={styles.saContainer}>
                  <LinearGradient
                    colors={['#003366', '#0072FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saBox}
                  >
                    <Text style={styles.logoText}>SA</Text>
                  </LinearGradient>
                  {/* Animated wave icon */}
                  <Animated.View
                    style={[
                      styles.waveIconWrapper,
                      { transform: [{ scale: wifiPulse }, { rotate: '45deg' }] },
                    ]}
                  >
                    <Icon
                      name="wifi"
                      iconFamily="Ionicons"
                      size={16}
                      color="#00E5FF"
                    />
                  </Animated.View>
                </View>
              </View>

              <View style={styles.titleColumn}>
                <Text style={[styles.appName, { color: colors.text }]}>Share</Text>
                <Text style={[styles.anywhereText, { color: colors.subtext }]}>
                  Anywhere
                </Text>
              </View>
            </View>

            {/* Removed headerRight (moved to ProfileScreen) */}
          </View>
        </LinearGradient>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: 'transparent',
  },
  gradientBg: {
    paddingBottom: 12,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerRow: {
    width: '100%',
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoStack: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  saContainer: {
    position: 'relative',
    padding: 2,
  },
  saBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0072FF',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    fontFamily: 'Okra-Bold',
  },
  waveIconWrapper: {
    position: 'absolute',
    top: -5,
    right: -4,
    zIndex: 20,
  },
  titleColumn: {
    marginLeft: 10,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Okra-Bold',
    lineHeight: 24,
    fontWeight: '800',
  },
  anywhereText: {
    fontSize: 14,
    fontFamily: 'Okra-Medium',
    lineHeight: 16,
    marginTop: -2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default HomeHeader;
