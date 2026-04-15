import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import Icon from '../global/Icon';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const openWifiSettings = async () => {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.WIFI_SETTINGS');
    } else {
      await Linking.openSettings();
    }
  } catch {
    Linking.openSettings();
  }
};

const openHotspotSettings = async () => {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.TETHER_SETTINGS');
    } else {
      await Linking.openSettings();
    }
  } catch {
    Linking.openSettings();
  }
};

const WiFiConnectBanner = () => {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const dismissAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
        delay: 300,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 300,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(dismissAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setDismissed(true));
  };

  if (dismissed) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: Animated.multiply(opacityAnim, dismissAnim),
        },
      ]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        {/* Left accent bar */}
        <View style={styles.accentBar} />

        {/* Icon */}
        <View style={styles.iconWrap}>
          <Icon
            name="wifi-off"
            iconFamily="MaterialCommunityIcons"
            size={22}
            color="#FF6B6B"
          />
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            No connection detected
          </Text>
          <Text style={[styles.bannerSub, { color: colors.subtext }]}>
            Enable Wi-Fi Direct or a Hotspot to share files
          </Text>

          {/* Action chips */}
          <View style={styles.chipsRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={openWifiSettings}
              style={[styles.chip, { borderColor: '#0072FF' }]}>
              <Icon
                name="wifi"
                iconFamily="Ionicons"
                size={13}
                color="#0072FF"
              />
              <Text style={[styles.chipText, { color: '#0072FF' }]}>
                Wi-Fi Direct
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={openHotspotSettings}
              style={[styles.chip, { borderColor: '#FF6B00' }]}>
              <Icon
                name="hotspot"
                iconFamily="MaterialCommunityIcons"
                size={13}
                color="#FF6B00"
              />
              <Text style={[styles.chipText, { color: '#FF6B00' }]}>
                Hotspot
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon
            name="close"
            iconFamily="Ionicons"
            size={16}
            color={colors.subtext}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default WiFiConnectBanner;

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingLeft: 0,
    paddingRight: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
    marginLeft: 4,
    marginRight: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  bannerTitle: {
    fontSize: 13,
    fontFamily: 'Okra-Bold',
    fontWeight: '700',
  },
  bannerSub: {
    fontSize: 11.5,
    fontFamily: 'Okra-Medium',
    lineHeight: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.2,
    backgroundColor: 'transparent',
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Okra-Bold',
    fontWeight: '700',
  },
  dismissBtn: {
    paddingLeft: 8,
    alignSelf: 'flex-start',
  },
});
