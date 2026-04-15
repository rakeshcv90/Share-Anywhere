import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/global/Icon';
import { useTheme } from '../context/ThemeContext';
import { useTCP } from '../service/TCPProvider';
import { NetworkInfo } from 'react-native-network-info';
import { useNavigation } from '@react-navigation/native';
import { formatFileSize } from '../utils/libraryHelpers';
import ThemePickerModal from '../components/home/ThemePickerModal';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { sentFiles, receivedFiles, totalSentBytes, totalReceivedBytes } = useTCP();

  const [networkName, setNetworkName] = useState('Checking Network...');
  const [networkType, setNetworkType] = useState('none');
  const [isThemeModalVisible, setThemeModalVisible] = useState(false);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={[styles.backIconBox, { backgroundColor: colors.border }]}>
            <Icon name="chevron-back" size={20} color={colors.text} iconFamily="Ionicons" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.placeholderBox} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <LinearGradient
          colors={[isDark ? '#2A2D3E' : '#FFFFFF', isDark ? '#1C1E2B' : '#F8F9FA']}
          style={[styles.profileCard, { borderColor: colors.border }]}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/images/profile.jpg')}
              style={styles.avatarImage}
            />
            <View style={styles.editBadge}>
              <Icon name="pencil" iconFamily="Ionicons" size={14} color="#FFF" />
            </View>
          </View>
          
          <Text style={[styles.userName, { color: colors.text }]}>Guest User</Text>
          <Text style={[styles.deviceId, { color: colors.subtext }]}>ID: ShareAnywhere-9A2E</Text>

          {/* Network Status Badge */}
          <View style={styles.networkBadgeWrapper}>
            <View style={[styles.networkBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Icon name={getNetworkIcon()} iconFamily="MaterialCommunityIcons" size={16} color={networkIconColor} />
              <Text style={[styles.networkText, { color: colors.text }]} numberOfLines={1}>
                {networkName}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Transfer Statistics Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transfer Statistics</Text>

        <View style={styles.statsGrid}>
          {/* Total Sent */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient colors={['#DCFCE7', '#BBF7D0']} style={styles.statIconBadge}>
              <Icon name="arrow-up-outline" iconFamily="Ionicons" size={20} color="#16A34A" />
            </LinearGradient>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{sentFiles?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Files Sent</Text>
              <Text style={[styles.statSubText, { color: colors.subtext }]}>{formatFileSize(totalSentBytes || 0)} Total</Text>
            </View>
          </View>

          {/* Total Received */}
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient colors={['#E0F2FE', '#BAE6FD']} style={styles.statIconBadge}>
              <Icon name="arrow-down-outline" iconFamily="Ionicons" size={20} color="#0284C7" />
            </LinearGradient>
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: colors.text }]}>{receivedFiles?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.subtext }]}>Files Received</Text>
              <Text style={[styles.statSubText, { color: colors.subtext }]}>{formatFileSize(totalReceivedBytes || 0)} Total</Text>
            </View>
          </View>
        </View>

        {/* Real Functional Preferences */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Preferences</Text>
        
        <View style={[styles.actionList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.actionItem} 
            activeOpacity={0.7}
            onPress={() => setThemeModalVisible(true)}
          >
            <View style={[styles.actionIconArea, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Icon name="color-palette-outline" iconFamily="Ionicons" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Theme & Appearance</Text>
            <Icon name="chevron-forward" iconFamily="Ionicons" size={20} color={colors.subtext} />
          </TouchableOpacity>
          
          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity 
            style={styles.actionItem} 
            activeOpacity={0.7}
            onPress={async () => {
               if (Platform.OS === 'android') {
                 Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(
                   () => Linking.openSettings(),
                 );
               } else {
                 Linking.openSettings();
               }
            }}
          >
            <View style={[styles.actionIconArea, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Icon name="notifications-outline" iconFamily="Ionicons" size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>System & Notifications</Text>
            <Icon name="chevron-forward" iconFamily="Ionicons" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      <ThemePickerModal
        visible={isThemeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
  },
  backIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Okra-Bold',
  },
  placeholderBox: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E5E7EB',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0072FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Okra-Bold',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 13,
    fontFamily: 'Okra-Medium',
    marginBottom: 20,
  },
  networkBadgeWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  networkText: {
    fontSize: 14,
    fontFamily: 'Okra-Medium',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Okra-Bold',
    marginBottom: 16,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'Okra-Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Okra-Bold',
    marginBottom: 4,
  },
  statSubText: {
    fontSize: 10,
    fontFamily: 'Okra-Medium',
    opacity: 0.6,
  },
  actionList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIconArea: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Okra-Medium',
  },
  actionDivider: {
    height: 1,
    marginLeft: 70,
  },
});

export default ProfileScreen;
