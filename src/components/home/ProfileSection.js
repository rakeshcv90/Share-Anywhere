import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../global/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useTCP } from '../../service/TCPProvider';
import { NetworkInfo } from 'react-native-network-info';
import { formatFileSize } from '../../utils/libraryHelpers';

const { width } = Dimensions.get('window');

const ProfileSection = () => {
  const { colors, isDark } = useTheme();
  const { sentFiles, receivedFiles, totalSentBytes, totalReceivedBytes } = useTCP();

  const [networkName, setNetworkName] = useState('Checking Network...');
  const [networkType, setNetworkType] = useState('none');

  useEffect(() => {
    fetchNetworkInfo();
    const interval = setInterval(fetchNetworkInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const ipAddress = await NetworkInfo.getIPV4Address();
      const ssid = await NetworkInfo.getSSID();

      if (ipAddress && (ipAddress.startsWith('192.168.43.') || ipAddress.startsWith('192.168.49.'))) {
        setNetworkName('Hotspot Active');
        setNetworkType('hotspot');
      } else if (ssid && ssid !== '<unknown ssid>' && ssid !== 'unknown' && ssid !== 'error') {
        setNetworkName(ssid.replace(/^"(.*)"$/, '$1'));
        setNetworkType('wifi');
      } else if (ipAddress && ipAddress !== '0.0.0.0' && !ipAddress.startsWith('127.')) {
        setNetworkName('Connected to Wi-Fi');
        setNetworkType('wifi');
      } else {
        setNetworkName('No Connection');
        setNetworkType('none');
      }
    } catch (e) {
      setNetworkName('No Connection');
      setNetworkType('none');
    }
  };

  const getNetworkIcon = () => {
    switch (networkType) {
      case 'hotspot': return 'hotspot';
      case 'wifi': return 'wifi';
      default: return 'wifi-off';
    }
  };

  const networkIconColor = networkType === 'hotspot' ? '#FF6B00' : networkType === 'wifi' ? '#0072FF' : '#FF6B6B';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[isDark ? '#2A2D3E' : '#FFFFFF', isDark ? '#1C1E2B' : '#F8F9FA']}
        style={[styles.card, { borderColor: colors.border }]}
      >
        {/* Top Profile Area */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix&backgroundColor=b6e3f4' }}
              style={styles.avatarImage}
            />
            <View style={[styles.statusDot, { backgroundColor: '#10B981', borderColor: colors.surface }]} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>Guest User</Text>
            
            <View style={styles.networkBadge}>
              <Icon name={getNetworkIcon()} iconFamily="MaterialCommunityIcons" size={14} color={networkIconColor} />
              <Text style={[styles.networkText, { color: colors.subtext }]} numberOfLines={1}>
                {networkName}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statBox}>
            <LinearGradient colors={['#E0F2FE', '#BAE6FD']} style={styles.statIconBadge}>
              <Icon name="arrow-down-outline" iconFamily="Ionicons" size={16} color="#0284C7" />
            </LinearGradient>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{receivedFiles?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Received</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statBox}>
            <LinearGradient colors={['#DCFCE7', '#BBF7D0']} style={styles.statIconBadge}>
              <Icon name="arrow-up-outline" iconFamily="Ionicons" size={16} color="#16A34A" />
            </LinearGradient>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{sentFiles?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Sent</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: -8, // Pulls it slightly up towards the header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Okra-Bold',
    marginBottom: 6,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  networkText: {
    fontSize: 12,
    fontFamily: 'Okra-Medium',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Okra-Bold',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Okra-Medium',
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 10,
  },
});

export default ProfileSection;
