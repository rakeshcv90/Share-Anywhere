import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import Icon from '../global/Icon';
import { useTheme } from '../../context/ThemeContext';

const WiFiScanner = () => {
  const { colors, isDark } = useTheme();
  const [networks, setNetworks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(null); // ssid of network being connected
  const [currentSSID, setCurrentSSID] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestAndScan();
    }
  }, []);

  const requestAndScan = async () => {
    try {
      if (Platform.OS !== 'android') return;

      let granted = false;
      let blocked = false;

      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        granted =
          result[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          
        blocked =
          result[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        granted = result === PermissionsAndroid.RESULTS.GRANTED;
        blocked = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      }

      if (granted) {
        setPermissionDenied(false);
        scanNetworks();
      } else {
        setPermissionDenied(true);
        if (blocked) {
          Alert.alert(
            'Permission Blocked',
            'You have permanently denied the required permissions. Please open Settings, go to Permissions, and enable Location/Nearby Devices.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }
    } catch (e) {
      console.log('WiFi permission error:', e);
      setPermissionDenied(true);
    }
  };

  const scanNetworks = async () => {
    setScanning(true);
    try {
      // Get current SSID so we can highlight the active one
      try {
        const ssid = await WifiManager.getCurrentWifiSSID();
        setCurrentSSID(ssid || '');
      } catch (_) {}

      const wifiList = await WifiManager.loadWifiList();
      setLocationError(false); // Reset location error upon success
      
      // Sort: connected first, then by signal strength
      const sorted = (wifiList || [])
        .filter(n => n.SSID && n.SSID.trim() !== '')
        .sort((a, b) => b.level - a.level);
      setNetworks(sorted);
    } catch (e) {
      console.log('WiFi scan error:', e);
      const errMsg = String(e).toLowerCase();
      if (errMsg.includes('location service') || errMsg.includes('location provider')) {
        setLocationError(true);
      } else {
        setLocationError(false);
      }
      setNetworks([]);
    } finally {
      setScanning(false);
    }
  };

  const connectToNetwork = async ssid => {
    setConnecting(ssid);
    try {
      if (Platform.OS === 'android') {
        Alert.prompt(
          `Connect to "${ssid}"`,
          'Enter password (leave empty for open networks)',
          async password => {
            try {
              if (password && password.length > 0) {
                await WifiManager.connectToProtectedSSID(
                  ssid,
                  password,
                  false,
                  false,
                );
              } else {
                await WifiManager.connectToSSID(ssid);
              }
              setCurrentSSID(ssid);
              Alert.alert('Connected!', `Successfully connected to ${ssid}`);
              scanNetworks();
            } catch (err) {
              Alert.alert(
                'Failed',
                `Could not connect to ${ssid}. Check password and try again.`,
              );
            } finally {
              setConnecting(null);
            }
          },
          'secure-text',
          '',
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to initiate connection.');
      setConnecting(null);
    }
  };

  const getSignalBars = level => {
    // level ranges from -100 (weak) to 0 (strong)
    if (level >= -50) return 4;
    if (level >= -60) return 3;
    if (level >= -70) return 2;
    return 1;
  };

  const getSignalColor = level => {
    if (level >= -50) return '#10B981';
    if (level >= -60) return '#F59E0B';
    if (level >= -70) return '#FF6B6B';
    return '#94A3B8';
  };

  const renderSignalBars = level => {
    const bars = getSignalBars(level);
    const color = getSignalColor(level);
    const heights = [4, 8, 12, 16];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={{
              width: 4,
              height: h,
              borderRadius: 2,
              backgroundColor: i < bars ? color : colors.border,
            }}
          />
        ))}
      </View>
    );
  };

  const isSecure = capabilities => {
    return (
      capabilities &&
      (capabilities.includes('WPA') ||
        capabilities.includes('WEP') ||
        capabilities.includes('PSK'))
    );
  };

  if (Platform.OS === 'ios') {
    return (
      <View
        style={[
          styles.iosNote,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Icon
          name="information-circle-outline"
          iconFamily="Ionicons"
          size={20}
          color={colors.accent}
        />
        <Text style={[styles.iosNoteText, { color: colors.subtext }]}>
          iOS doesn't allow apps to scan or connect to Wi-Fi networks. Use
          Settings to connect.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          style={[styles.settingsBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View
        style={[
          styles.permDenied,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Icon
          name="wifi-off"
          iconFamily="MaterialCommunityIcons"
          size={28}
          color="#FF6B6B"
        />
        <Text style={[styles.permDeniedTitle, { color: colors.text }]}>
          Location Permission Required
        </Text>
        <Text style={[styles.permDeniedSub, { color: colors.subtext }]}>
          Android requires Nearby Devices (or Location) permission to scan for Wi-Fi networks.
        </Text>
        <TouchableOpacity
          onPress={requestAndScan}
          style={[
            styles.settingsBtn,
            { backgroundColor: colors.accent, marginTop: 12 },
          ]}
        >
          <Text style={styles.settingsBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon
            name="wifi"
            iconFamily="Ionicons"
            size={18}
            color={colors.accent}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Available Networks
          </Text>
        </View>
        <TouchableOpacity
          onPress={scanNetworks}
          disabled={scanning}
          style={[styles.refreshBtn, { borderColor: colors.border }]}
        >
          {scanning ? (
            <ActivityIndicator size={14} color={colors.accent} />
          ) : (
            <Icon
              name="refresh"
              iconFamily="Ionicons"
              size={16}
              color={colors.accent}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Network List */}
      {scanning && networks.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            Scanning for networks...
          </Text>
        </View>
      ) : networks.length === 0 ? (
        <View style={styles.emptyState}>
          {locationError ? (
            <>
              <Icon
                name="location-off"
                iconFamily="MaterialIcons"
                size={34}
                color="#F59E0B"
              />
              <Text style={[styles.emptyText, { color: colors.text, marginTop: 10, marginBottom: 12, fontFamily: 'Okra-Bold', fontSize: 13 }]}>
                Location is Turned Off
              </Text>
              <Text style={[styles.emptyText, { color: colors.subtext, marginBottom: 16 }]}>
                Android requires Location Services (GPS) to be ON in order to scan for nearby Wi-Fi networks.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  try {
                    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                  } catch (e) {
                    Linking.openSettings();
                  }
                }}
                style={[styles.settingsBtn, { backgroundColor: '#F59E0B' }]}
              >
                <Text style={styles.settingsBtnText}>Turn On Location</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.emptyText, { color: colors.subtext, marginBottom: 12 }]}>
                No networks found. Ensure Location Services (GPS) are turned ON, then tap refresh.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  try {
                    Linking.sendIntent('android.settings.WIFI_SETTINGS');
                  } catch (e) {
                    Linking.openSettings();
                  }
                }}
                style={[styles.settingsBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.settingsBtnText}>Open Wi-Fi Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={networks}
          keyExtractor={(item, i) => `${item.SSID}-${i}`}
          scrollEnabled={false}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
          renderItem={({ item }) => {
            const isConnected = item.SSID === currentSSID;
            const isConnecting = connecting === item.SSID;
            const secure = isSecure(item.capabilities);
            return (
              <TouchableOpacity
                style={[
                  styles.networkRow,
                  isConnected && { backgroundColor: colors.accent + '14' },
                ]}
                onPress={() => !isConnected && connectToNetwork(item.SSID)}
                activeOpacity={0.75}
              >
                <View style={styles.networkLeft}>
                  {renderSignalBars(item.level)}
                  <View style={styles.networkInfo}>
                    <Text
                      style={[styles.ssid, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.SSID}
                    </Text>
                    <View style={styles.networkMeta}>
                      {isConnected && (
                        <View style={styles.connectedBadge}>
                          <Text style={styles.connectedText}>Connected</Text>
                        </View>
                      )}
                      {secure && (
                        <Icon
                          name="lock-closed"
                          iconFamily="Ionicons"
                          size={10}
                          color={colors.subtext}
                        />
                      )}
                      <Text style={[styles.freq, { color: colors.subtext }]}>
                        {item.frequency > 5000 ? '5 GHz' : '2.4 GHz'}
                      </Text>
                    </View>
                  </View>
                </View>

                {!isConnected &&
                  (isConnecting ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <View
                      style={[
                        styles.connectBtn,
                        {
                          backgroundColor: colors.accent + '22',
                          borderColor: colors.accent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.connectBtnText,
                          { color: colors.accent },
                        ]}
                      >
                        Connect
                      </Text>
                    </View>
                  ))}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

export default WiFiScanner;

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Okra-Bold',
    fontWeight: '700',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Okra-Medium',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  networkInfo: {
    flex: 1,
  },
  ssid: {
    fontSize: 13.5,
    fontFamily: 'Okra-Bold',
    fontWeight: '600',
  },
  networkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  connectedBadge: {
    backgroundColor: '#10B98122',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  connectedText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'Okra-Bold',
  },
  freq: {
    fontSize: 10.5,
    fontFamily: 'Okra-Medium',
  },
  connectBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  connectBtnText: {
    fontSize: 12,
    fontFamily: 'Okra-Bold',
    fontWeight: '700',
  },
  iosNote: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  iosNoteText: {
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
  },
  permDenied: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    marginHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  permDeniedTitle: {
    fontSize: 14,
    fontFamily: 'Okra-Bold',
    marginTop: 4,
  },
  permDeniedSub: {
    fontSize: 12,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
  },
  settingsBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  settingsBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Okra-Bold',
    fontWeight: '700',
  },
});
