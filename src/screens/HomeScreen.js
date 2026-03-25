import {
  View,
  ScrollView,
  StatusBar,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  Platform,
} from 'react-native';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import HomeHeader from '../components/home/HomeHeader';
import { useTCP } from '../service/TCPProvider';
import { navigate } from '../utils/NavigationUtil';
import Icon from '../components/global/Icon';
import Misc from '../components/home/Misc';
import Options from '../components/home/Options';
import SendReceiveButton from '../components/home/SendReceiveButton';
import AbsoluteQRBottom from '../components/home/AbsoluteQRBottom';
import QRScannerModal from '../components/modals/QRScannerModal';
import QRGenerateModal from '../components/modals/QRGenerateModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { moderateScale } from 'react-native-size-matters';
import SpInAppUpdates, {
  IAUUpdateKind,
  IAUInstallStatus,
} from 'sp-react-native-in-app-updates';

const HomeScreen = () => {
  const bgAnim = useRef(new Animated.Value(0)).current;
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const { isConnected, connectedDevice } = useTCP();

  const inAppUpdates = React.useRef(null);
  useEffect(() => {
    Animated.loop(
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ).start();
  }, []);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#F0F4FF', '#F5F0FF', '#F0F4FF'],
  });

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

  const checkForUpdate = async () => {
    try {
      // For Android, comparing version codes is the most reliable method
      // For iOS, provide the Apple ID and country to ensure the version can be fetched
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
    <>
      <StatusBar
        translucent={false}
        backgroundColor={'#1B2B4B'}
        barStyle="light-content"
      />

      <HomeHeader onPressProfile={() => setShareVisible(true)} />

      <Animated.View
        style={[styles.baseContainer, { backgroundColor: bgColor }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          <SendReceiveButton />
          <Options isHome />
          <View style={styles.miscWrapper}>
            <Misc />
          </View>
        </ScrollView>

        <AbsoluteQRBottom
          onScanQR={() => setScannerVisible(true)}
          onShareQR={() => setShareVisible(true)}
        />
      </Animated.View>

      {/* Modals rendered at root level to cover entire screen */}
      <QRScannerModal
        visible={isScannerVisible}
        onClose={() => setScannerVisible(false)}
      />
      <QRGenerateModal
        visible={isShareVisible}
        onClose={() => setShareVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: 8,
  },
  activeConnectionBanner: {
    marginHorizontal: moderateScale(12),

    marginBottom: moderateScale(16),
    borderRadius: 16,

    // shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },

  bannerGradient: {
    borderRadius: 16,
  },
  bannerContentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(16),
  },

  bannerIconWrap: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },

  bannerTextWrap: {
    flex: 1,
    marginRight: moderateScale(10), // ✅ space before arrow
  },

  bannerTitle: {
    color: '#fff',
    fontSize: moderateScale(16), // ✅ responsive font
    fontWeight: '800',
  },

  bannerSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateScale(12), // ✅ responsive font
    marginTop: 2,
    flexWrap: 'wrap', // ✅ FIX: no cut text
  },

  arrowWrap: {
    marginLeft: moderateScale(6), // ✅ spacing for arrow
  },
  miscWrapper: {
    marginTop: 16,
  },
});

export default HomeScreen;
