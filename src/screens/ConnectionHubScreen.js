import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WifiManager from 'react-native-wifi-reborn';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../components/global/Icon';
import { useTheme } from '../context/ThemeContext';

const ConnectionHubScreen = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [networks, setNetworks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [currentSSID, setCurrentSSID] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState(false);
  
  // Custom prompt state since Alert.prompt does not work on Android
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptSSID, setPromptSSID] = useState('');
  const [promptPassword, setPromptPassword] = useState('');

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
            'Permission Required',
            'Share Anywhere needs Nearby Devices and Location permissions to find other phones. Please enable them in Settings.',
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
    try {
      try {
        const ssid = await WifiManager.getCurrentWifiSSID();
        setCurrentSSID(ssid || '');
      } catch (e) {
        console.log('Error getting current SSID', e);
      }

      if (Platform.OS === 'ios') {
        // iOS does not allow Wi-Fi scanning, so we can't load a list of networks.
        setNetworks([]);
        return;
      }

      setScanning(true);
      const wifiList = await WifiManager.loadWifiList();
      setLocationError(false);
      
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
      if (Platform.OS !== 'ios') setScanning(false);
    }
  };

  const isSecure = (capabilities) => {
    return (
      capabilities &&
      (capabilities.includes('WPA') ||
        capabilities.includes('WEP') ||
        capabilities.includes('PSK'))
    );
  };

  const handleNetworkPress = async (item) => {
    const secure = isSecure(item.capabilities);
    
    if (secure) {
      setPromptSSID(item.SSID);
      setPromptPassword('');
      setPromptVisible(true);
    } else {
      setConnecting(item.SSID);
      try {
        try {
          await WifiManager.connectToSSID(item.SSID);
        } catch (e1) {
          await WifiManager.connectToProtectedSSID(item.SSID, '', false, false);
        }
        setCurrentSSID(item.SSID);
        Alert.alert('Connected!', `Successfully connected to ${item.SSID}`);
        scanNetworks();
      } catch (err) {
        Alert.alert('Failed', `Could not connect to ${item.SSID}.`);
      } finally {
        setConnecting(null);
      }
    }
  };

  const handleConnectWithPassword = async () => {
    setPromptVisible(false);
    setConnecting(promptSSID);
    try {
      if (promptPassword && promptPassword.length > 0) {
        await WifiManager.connectToProtectedSSID(promptSSID, promptPassword, false, false);
      } else {
        await WifiManager.connectToSSID(promptSSID);
      }
      setCurrentSSID(promptSSID);
      Alert.alert('Connected!', `Successfully connected to ${promptSSID}`);
      scanNetworks();
    } catch (err) {
      Alert.alert('Failed', `Could not connect to ${promptSSID}. Check password.`);
    } finally {
      setConnecting(null);
    }
  };

  const getSignalBars = level => {
    if (level >= -50) return 4;
    if (level >= -60) return 3;
    if (level >= -70) return 2;
    return 1;
  };

  const renderSignalBars = level => {
    const bars = getSignalBars(level);
    const heights = [4, 8, 12, 16];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={{
              width: 5,
              height: h,
              borderRadius: 2.5,
              backgroundColor: i < bars ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : '#fff', borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={[styles.backIconBox, { backgroundColor: colors.border }]}>
            <Icon name="chevron-back" size={20} color={colors.text} iconFamily="Ionicons" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Network Hub</Text>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={scanNetworks}
          style={styles.refreshButton}
          disabled={scanning}
        >
          <View style={[styles.backIconBox, { backgroundColor: colors.border }]}>
            {scanning ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Icon name="refresh" size={20} color={colors.text} iconFamily="Ionicons" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {scanning && networks.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.stateText, { color: colors.subtext, marginTop: 16 }]}>Searching for devices...</Text>
          </View>
        ) : networks.length === 0 ? (
          <View style={styles.centerState}>
            <View style={[styles.messageBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {Platform.OS === 'ios' ? (
                <>
                  <Icon name="logo-apple" size={48} color={colors.text} iconFamily="Ionicons" />
                  <Text style={[styles.messageTitle, { color: colors.text }]}>iOS Wi-Fi Limitation</Text>
                  <Text style={[styles.messageSub, { color: colors.subtext }]}>
                    Apple does not allow apps to automatically scan nearby Wi-Fi networks. 
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                       setPromptSSID('');
                       setPromptPassword('');
                       setPromptVisible(true);
                    }}
                    style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                  >
                    <Text style={styles.primaryBtnText}>Manual Connection</Text>
                  </TouchableOpacity>
                  <Text style={[{ color: colors.subtext, fontSize: 11, marginTop: 15, textAlign: 'center' }]}>
                    Enter the Android device's Hotspot name manually.
                  </Text>
                </>
              ) : locationError ? (
                <>
                  <Icon name="location-off" size={48} color="#F59E0B" iconFamily="MaterialIcons" />
                  <Text style={[styles.messageTitle, { color: colors.text }]}>Location is Off</Text>
                  <Text style={[styles.messageSub, { color: colors.subtext }]}>
                    Android requires Location Services to scan for nearby Wi-Fi devices.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => Linking.openSettings()}
                    style={[styles.primaryBtn, { backgroundColor: '#F59E0B' }]}
                  >
                    <Text style={styles.primaryBtnText}>Enable Location</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Icon name="wifi-outline" size={48} color={colors.accent} iconFamily="Ionicons" />
                  <Text style={[styles.messageTitle, { color: colors.text }]}>No Devices Found</Text>
                  <Text style={[styles.messageSub, { color: colors.subtext }]}>
                    Make sure the other phone has Wi-Fi or Hotspot active.
                  </Text>
                  <TouchableOpacity
                     activeOpacity={0.8}
                     onPress={scanNetworks}
                     style={[styles.primaryBtn, { backgroundColor: colors.accent, marginBottom: 10 }]}
                   >
                     <Text style={styles.primaryBtnText}>Retry Scan</Text>
                   </TouchableOpacity>
                   <TouchableOpacity
                     activeOpacity={0.8}
                     onPress={() => {
                        setPromptSSID('');
                        setPromptPassword('');
                        setPromptVisible(true);
                     }}
                     style={[styles.primaryBtn, { backgroundColor: colors.border }]}
                   >
                     <Text style={[styles.primaryBtnText, { color: colors.text }]}>Manual Connect</Text>
                   </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <FlatList
            data={networks}
            keyExtractor={(item, index) => `${item.SSID}-${index}`}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={() => (
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Devices</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => Linking.openSettings()}
                  >
                    <View style={[styles.iconCirc, { backgroundColor: '#3B82F615' }]}>
                      <Icon name="settings-outline" size={20} color="#3B82F6" iconFamily="Ionicons" />
                    </View>
                    <Text style={[styles.quickText, { color: colors.text }]}>Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => {
                        try { Linking.sendIntent('android.settings.WIFI_SETTINGS'); } 
                        catch (e) { Linking.openSettings(); }
                    }}
                  >
                    <View style={[styles.iconCirc, { backgroundColor: '#10B98115' }]}>
                      <Icon name="wifi-outline" size={20} color="#10B981" iconFamily="Ionicons" />
                    </View>
                    <Text style={[styles.quickText, { color: colors.text }]}>Wi-Fi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            renderItem={({ item }) => {
              const isConnected = item.SSID === currentSSID;
              const isConnecting = connecting === item.SSID;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => !isConnected && handleNetworkPress(item)}
                  style={[styles.networkCard, { 
                    backgroundColor: colors.surface, 
                    borderColor: isConnected ? colors.accent : colors.border,
                    borderWidth: isConnected ? 1.5 : 1,
                    marginBottom: 12 
                  }]}
                >
                  <View style={styles.networkLeft}>
                    {renderSignalBars(item.level)}
                    <View style={styles.networkInfo}>
                      <Text style={[styles.ssid, { color: colors.text }]} numberOfLines={1}>
                        {item.SSID || 'Unknown Phone'}
                      </Text>
                      <View style={styles.networkMeta}>
                        {isConnected && (
                          <View style={styles.connectedBadge}>
                            <Text style={styles.connectedText}>CONNECTED</Text>
                          </View>
                        )}
                        <Text style={[styles.freq, { color: colors.subtext }]}>
                          {item.frequency > 4000 ? '5GHz' : '2.4GHz'} • {Math.abs(item.level)}dBm
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.connectBtn, { backgroundColor: isConnected ? colors.border : colors.accent }]}
                      onPress={() => handleNetworkPress(item)}
                      disabled={isConnected}
                    >
                      <Text style={[styles.connectBtnText, { color: isConnected ? colors.text : '#fff' }]}>
                        {isConnected ? 'Active' : 'Connect'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Password Prompt Modal */}
      <Modal
        visible={promptVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.accent + '15' }]}>
              <Icon name="lock-closed-outline" size={28} color={colors.accent} iconFamily="Ionicons" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Enter Password</Text>
            <Text style={[styles.modalSub, { color: colors.subtext }]}>
              {promptSSID 
                ? `Please enter the password for "${promptSSID}"`
                : 'Please enter the exact Hotspot Name and Password of the Android device.'}
            </Text>
            
            {!promptSSID && (
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border,
                  color: colors.text,
                  marginBottom: 12
                }]}
                placeholder="Hotspot Name (SSID)"
                placeholderTextColor={colors.subtext}
                value={promptSSID}
                onChangeText={setPromptSSID}
                autoFocus
              />
            )}

            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: colors.background, 
                borderColor: colors.border,
                color: colors.text,
                marginBottom: 24
              }]}
              placeholder="Password"
              placeholderTextColor={colors.subtext}
              secureTextEntry
              value={promptPassword}
              onChangeText={setPromptPassword}
              autoFocus={!!promptSSID}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setPromptVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                onPress={handleConnectWithPassword}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  refreshButton: {
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
  content: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateText: {
    fontFamily: 'Okra-Medium',
    fontSize: 14,
  },
  messageBox: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  messageTitle: {
    fontFamily: 'Okra-Bold',
    fontSize: 17,
    marginTop: 16,
    marginBottom: 8,
  },
  messageSub: {
    fontFamily: 'Okra-Medium',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontFamily: 'Okra-Bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: 'Okra-Bold',
    fontSize: 16,
  },
  quickBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  iconCirc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickText: {
    fontFamily: 'Okra-Medium',
    fontSize: 13,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  networkInfo: {
    flex: 1,
  },
  ssid: {
    fontFamily: 'Okra-Bold',
    fontSize: 15,
  },
  networkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  connectedBadge: {
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  connectedText: {
    color: '#10B981',
    fontFamily: 'Okra-Bold',
    fontSize: 10,
  },
  freq: {
    fontFamily: 'Okra-Medium',
    fontSize: 11,
  },
  connectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  connectBtnText: {
    fontFamily: 'Okra-Bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Okra-Bold',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: 'Okra-Medium',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: 'Okra-Medium',
    fontSize: 15,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnPrimary: {
    elevation: 2,
  },
  modalBtnText: {
    fontFamily: 'Okra-Bold',
    fontSize: 15,
  },
});

export default ConnectionHubScreen;
