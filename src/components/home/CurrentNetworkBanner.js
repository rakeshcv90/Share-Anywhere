import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from '../global/Icon';
import { useTheme } from '../../context/ThemeContext';
import { NetworkInfo } from 'react-native-network-info';

const { width } = Dimensions.get('window');

const CurrentNetworkBanner = () => {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const [networkName, setNetworkName] = useState('Checking Network...');
  const [networkType, setNetworkType] = useState('wifi'); // 'wifi' | 'hotspot' | 'none'
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const ipAddress = await NetworkInfo.getIPV4Address();
      const ssid = await NetworkInfo.getSSID();
      
      // Standard Android default Hotspot subnet is usually 192.168.43.x or 192.168.49.x
      if (ipAddress && (ipAddress.startsWith('192.168.43.') || ipAddress.startsWith('192.168.49.'))) {
        setNetworkName('Hotspot Active');
        setNetworkType('hotspot');
      } else if (ssid && ssid !== '<unknown ssid>' && ssid !== 'unknown' && ssid !== 'error') {
        // We strip quotes if they exist around the SSID
        setNetworkName(ssid.replace(/^"(.*)"$/, '$1'));
        setNetworkType('wifi');
      } else if (ipAddress && ipAddress !== '0.0.0.0' && !ipAddress.startsWith('127.')) {
        // Connected but SSID hidden due to permission or Android 10+ location rules
        setNetworkName('Connected to Wi-Fi');
        setNetworkType('wifi');
      } else {
        setNetworkName('No Network Connection');
        setNetworkType('none');
      }
    } catch (e) {
      setNetworkName('No Network Connection');
      setNetworkType('none');
    }
  };

  const getIconData = () => {
    switch(networkType) {
      case 'hotspot':
        return { name: 'hotspot', family: 'MaterialCommunityIcons', color: '#FF6B00' };
      case 'wifi':
        return { name: 'wifi', family: 'Ionicons', color: '#0072FF' };
      default:
        return { name: 'wifi-off', family: 'MaterialCommunityIcons', color: '#FF6B6B' };
    }
  };

  const iconData = getIconData();

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
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
        <View style={[styles.accentBar, { backgroundColor: iconData.color }]} />

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconData.color + '1A' }]}>
          <Icon
            name={iconData.name}
            iconFamily={iconData.family}
            size={22}
            color={iconData.color}
          />
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            Current Network
          </Text>
          <Text style={[styles.bannerSub, { color: colors.subtext }]} numberOfLines={1}>
            {networkName}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default CurrentNetworkBanner;

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
    paddingVertical: 12,
    paddingLeft: 0,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 4,
    marginRight: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  bannerTitle: {
    fontSize: 11.5,
    fontFamily: 'Okra-Medium',
  },
  bannerSub: {
    fontSize: 14,
    fontFamily: 'Okra-Bold',
    fontWeight: '700',
  },
});
