import {
  View,
  ScrollView,
  StatusBar,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, Text, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HomeHeader from '../components/home/HomeHeader';
import { useTCP } from '../service/TCPProvider';
import { navigate } from '../utils/NavigationUtil';
import Icon from '../components/global/Icon';
import Options from '../components/home/Options';
import SendReceiveButton from '../components/home/SendReceiveButton';
import AbsoluteQRBottom from '../components/home/AbsoluteQRBottom';
import CurrentNetworkBanner from '../components/home/CurrentNetworkBanner';
import QRScannerModal from '../components/modals/QRScannerModal';
import QRGenerateModal from '../components/modals/QRGenerateModal';
import ExitModal from '../components/modals/ExitModal';

import ThemePickerModal from '../components/home/ThemePickerModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { moderateScale } from 'react-native-size-matters';
import { useTheme } from '../context/ThemeContext';
import SpInAppUpdates, {
  IAUUpdateKind,
  IAUInstallStatus,
} from 'sp-react-native-in-app-updates';

const HomeScreen = () => {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isThemeVisible, setThemeVisible] = useState(false);
  const [isExitVisible, setExitVisible] = useState(false);
  const { colors } = useTheme();
  const { checkSharedFiles, pendingSharedFiles, isConnected, connectedDevice } =
    useTCP();

  // 🚀 Handle incoming share URL with a delay for UserDefaults sync
  const handleShareURL = useCallback(
    url => {
      if (
        url &&
        typeof url === 'string' &&
        url.startsWith('shareanywhere://')
      ) {
        console.log('--- iOS Share: Received deep link:', url);
        // Delay to allow UserDefaults to sync between extension and main app processes
        setTimeout(() => {
          checkSharedFiles();
        }, 500);
      }
    },
    [checkSharedFiles],
  );

  // Request Location permissions on mount for Wi-Fi SSID detection
  useEffect(() => {
    import('../utils/Constants').then(({ requestLocationPermission }) => {
      requestLocationPermission();
    });
  }, []);

  // 🚀 Direct Share Monitor
  useEffect(() => {
    // Check on initial mount
    checkSharedFiles();

    // Handle cold launch via URL scheme (app was killed, opened via share extension)
    if (Platform.OS === 'ios') {
      Linking.getInitialURL().then(url => {
        if (url) {
          console.log('--- iOS Share: Cold launch URL:', url);
          handleShareURL(url);
        }
      });
    }

    // Handle URL when app is already running (background or foreground)
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleShareURL(url);
    });

    // Check whenever app returns to foreground (fallback for non-URL opens)
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          console.log('--- App Resumed: Checking for shared files...');
          // Small delay for UserDefaults sync
          setTimeout(() => {
            checkSharedFiles();
          }, 300);
        }
      },
    );

    return () => {
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, [checkSharedFiles, handleShareURL]);

  // 🚀 Auto-Navigate if files are found
  useEffect(() => {
    if (pendingSharedFiles.length > 0 && !isConnected) {
      console.log(
        `--- TCP: ${pendingSharedFiles.length} files pending! Navigating to Send radar.`,
      );
      navigate('SendScreen');
    }
  }, [pendingSharedFiles.length, isConnected]);

  const inAppUpdates = React.useRef(null);
  // Removed static bgAnim for theme compatibility
  useEffect(() => {
    // ... any other mount logic if needed
  }, []);

  useEffect(() => {
    inAppUpdates.current = new SpInAppUpdates(false);
    // Add listener immediately to catch "already downloaded" status
    inAppUpdates.current.addStatusUpdateListener(onStatusUpdate);
    checkForUpdate();

    return () => {
      if (inAppUpdates.current) {
        inAppUpdates.current.removeStatusUpdateListener(onStatusUpdate);
      }
    };
  }, [onStatusUpdate]);

  const onStatusUpdate = useCallback(event => {
    const { status, bytesDownloaded, totalBytesToDownload } = event;
    console.log(`Update Status: ${status}`, event);

    if (status === IAUInstallStatus.DOWNLOADING && totalBytesToDownload > 0) {
      const progress = Math.round(
        (bytesDownloaded / totalBytesToDownload) * 100,
      );
      setDownloadProgress(progress);
      console.log(`Downloading: ${progress}%`);
    }

    if (status === IAUInstallStatus.DOWNLOADED) {
      setDownloadProgress(100);
      console.log('Update Downloaded: Showing installation prompt');
      Alert.alert(
        'Update Ready',
        'The update has been downloaded. Restart the app to apply it?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Restart Now',
            onPress: () => {
              console.log('User clicked Restart Now: Installing update...');
              inAppUpdates.current?.installUpdate();
            },
          },
        ],
        { cancelable: false },
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        setExitVisible(true);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  const checkForUpdate = async () => {
    try {
      const result = await inAppUpdates.current.checkNeedsUpdate(
        Platform.select({
          ios: {
            appleId: '6759137017',
            country: 'in', // Using 'in' since you're in India, helps App Store API
          },
          android: undefined,
        }),
      );

      console.log('Update Check Result:', result);

      if (result.shouldUpdate) {
        const updateOptions = Platform.select({
          ios: {
            title: 'Update Available',
            message:
              'A new version of the app is available. Please update for the best experience.',
            buttonUpgradeText: 'Update Now',
            buttonCancelText: 'Later',
          },
          android: {
            updateType: IAUUpdateKind.IMMEDIATE,
          },
        });

        await inAppUpdates.current.startUpdate(updateOptions);
      }
    } catch (error) {
      if (error?.message?.includes('-10')) {
        console.log('In-app update: App not owned (expected in dev builds)');
      } else {
        console.log('In-app update check error:', error);
      }
    }
  };
  return (
    <View style={styles.baseContainer}>
      <StatusBar
        translucent={true}
        backgroundColor={'transparent'}
        barStyle={colors.statusBarStyle}
      />

      <LinearGradient
        colors={colors.gradientBg}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <HomeHeader onPressProfile={() => setShareVisible(true)} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current network details */}
        {!isConnected && <CurrentNetworkBanner />}

        {isConnected && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigate('ConnectionScreen')}
            style={styles.activeConnectionBanner}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerContentInner}>
                <View style={styles.bannerIconWrap}>
                  <Icon
                    name="swap-horizontal"
                    iconFamily="Ionicons"
                    size={20}
                    color="#fff"
                  />
                </View>

                {/* TEXT */}
                <View style={styles.bannerTextWrap}>
                  <Text style={styles.bannerTitle}>Active Connection</Text>

                  <Text
                    style={styles.bannerSubtext}
                    numberOfLines={2} // ✅ prevents overflow
                    ellipsizeMode="tail"
                  >
                    Tap to view transfer with {connectedDevice}
                  </Text>
                </View>

                {/* RIGHT ICON */}
                <View style={styles.arrowWrap}>
                  <Icon
                    name="chevron-forward"
                    iconFamily="Ionicons"
                    size={20}
                    color="rgba(255,255,255,0.7)"
                  />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <SendReceiveButton />
        </View>

        <View style={styles.section}>
          <Options isHome onAppearancePress={() => setThemeVisible(true)} />
        </View>
      </ScrollView>

      <AbsoluteQRBottom
        onScanQR={() => setScannerVisible(true)}
        onShareQR={() => setShareVisible(true)}
      />

      {/* Modals rendered at root level to cover entire screen */}
      <QRScannerModal
        visible={isScannerVisible}
        onClose={() => setScannerVisible(false)}
      />
      <QRGenerateModal
        visible={isShareVisible}
        onClose={() => setShareVisible(false)}
      />
      <ThemePickerModal
        visible={isThemeVisible}
        onClose={() => setThemeVisible(false)}
      />
      <ExitModal
        visible={isExitVisible}
        onClose={() => setExitVisible(false)}
        onConfirm={() => BackHandler.exitApp()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: moderateScale(160), // Space for bottom bar
    paddingTop: moderateScale(10),
  },
  section: {
    marginBottom: moderateScale(24),
  },
  activeConnectionBanner: {
    marginHorizontal: moderateScale(16),
    marginBottom: moderateScale(20),
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  bannerGradient: {
    padding: moderateScale(16),
  },
  bannerContentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  bannerIconWrap: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    color: '#fff',
    fontFamily: 'Okra-Bold',
    fontSize: moderateScale(16),
  },
  bannerSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Okra-Medium',
    fontSize: moderateScale(12),
    marginTop: 2,
  },
  arrowWrap: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miscWrapper: {
    marginTop: moderateScale(10),
  },
});

export default HomeScreen;
