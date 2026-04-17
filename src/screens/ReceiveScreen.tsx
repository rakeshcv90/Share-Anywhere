import {
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/global/Icon';
import CustomeText from '../components/global/CustomeText';
import QRGenerateModal from '../components/modals/QRGenerateModal';
import LottieView from 'lottie-react-native';
import BreakerText from '../components/ui/BreakerText';
import { Colors } from '../utils/Constants';
import { goBack, navigate } from '../utils/NavigationUtil';
import { useTCP } from '../service/TCPProvider';
import DeviceInfo from 'react-native-device-info';
import {
  getBroadcastIPAddress,
  getLocalIPAddress,
} from '../utils/networkUtils';
import dgram from 'react-native-udp';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const ReceiveScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { startServer, server, isConnected } = useTCP();

  const [qrValue, setQRValue] = useState('');
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const wifiPulse = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiPulse, {
          toValue: 1.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(wifiPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Dynamic sizing
  const lottieSize = Math.min(width * 0.6, 260);
  const ringSize = lottieSize * 1.2;
  const innerRingSize = lottieSize * 0.8;

  useEffect(() => {
    // Pulse animation for the center profile
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Rotation animation for the outer ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Wave animation for receiving effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const setupServer = async () => {
    const deviceName = await DeviceInfo.getDeviceName();
    const ip = await getLocalIPAddress();
    const port = 4000;

    if (!server) {
      startServer(port);
    }

    setQRValue(`tcp://${ip}:${port}|${deviceName}`);
    console.log(`Server Info: ${ip}:${port}`);
  };

  const sendDiscoverySignal = async () => {
    const deviceName = await DeviceInfo.getDeviceName();
    const broadcastAddress = await getBroadcastIPAddress();
    const targetAddress = broadcastAddress || '255.255.255.255';
    const port = 57143;

    const client = dgram.createSocket({
      type: 'udp4',
      reusePort: true,
    });

    // Prevent unhandled error events from crashing the app
    (client as any).on('error', (err: any) => {
      console.log('Discovery socket error:', err?.message || err);
      try {
        client.close();
      } catch (_) {}
    });

    client.bind(() => {
      try {
        if (Platform.OS === 'ios') {
          client.setBroadcast(true);
        }

        client.send(
          `${qrValue}`,
          0,
          `${qrValue}`.length,
          port,
          targetAddress,
          err => {
            if (err) {
              console.log('Error sending discovery signal ', err);
            } else {
              console.log(
                `${deviceName} Discovery Signal sent to ${targetAddress}`,
              );
            }
            client.close();
          },
        );
      } catch (error) {
        console.error('Failed to set broadcast or send', error);
        try {
          client.close();
        } catch (_) {}
      }
    });
  };

  useEffect(() => {
    if (!qrValue || isScannerVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    sendDiscoverySignal();
    intervalRef.current = setInterval(sendDiscoverySignal, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [qrValue, isScannerVisible]);

  const handleGoBack = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      goBack();
    });
  };

  useEffect(() => {
    if (isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      navigate('ConnectionScreen');
    }
  }, [isConnected]);

  // If already connected when screen mounts, redirect immediately
  useEffect(() => {
    if (isConnected) {
      navigate('ConnectionScreen');
    }
  }, []);

  useEffect(() => {
    setupServer();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.5, 2],
  });

  const waveScaleInner = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 1.6],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.3, 0],
  });

  const waveOpacityInner = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.21, 0], // 0.7 * waveOpacity
  });

  return (
    <>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={colors.gradientBg}
        style={receiveStyles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <Animated.View
            style={[
              receiveStyles.mainContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={receiveStyles.headerContainer}>
              <View style={receiveStyles.headerGradient}>
                <View style={receiveStyles.headerRow}>
                  <View style={receiveStyles.headerLeft}>
                    <TouchableOpacity
                      onPress={handleGoBack}
                      style={[
                        receiveStyles.backButton,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name="chevron-back"
                        iconFamily="Ionicons"
                        size={24}
                        color={colors.icon}
                      />
                    </TouchableOpacity>

                    <View style={receiveStyles.brandingContainer}>
                      <View style={receiveStyles.saContainer}>
                        <LinearGradient
                          colors={['#003366', '#0072FF']}
                          style={receiveStyles.saBox}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <CustomeText
                            fontFamily="Okra-Bold"
                            fontSize={16}
                            color="#fff"
                            variant="h6"
                            style={{}}
                            onLayout={() => {}}
                            numberOfLines={1}
                          >
                            TQ
                          </CustomeText>
                        </LinearGradient>
                        <Animated.View
                          style={[
                            receiveStyles.waveIconWrapper,
                            {
                              transform: [
                                { scale: wifiPulse },
                                { rotate: '45deg' },
                              ],
                            },
                          ]}
                        >
                          <Icon
                            name="wifi"
                            iconFamily="Ionicons"
                            size={12}
                            color="#00E5FF"
                          />
                        </Animated.View>
                      </View>
                      <View style={receiveStyles.titleColumn}>
                        <CustomeText
                          variant="h6"
                          fontSize={14}
                          fontFamily="Okra-Bold"
                          color={colors.text}
                          style={{}}
                          onLayout={() => {}}
                          numberOfLines={1}
                        >
                          Receive
                        </CustomeText>
                        <CustomeText
                          variant="body2"
                          fontSize={10}
                          fontFamily="Okra-Medium"
                          color={colors.subtext}
                          style={{ marginTop: -2 }}
                          onLayout={() => {}}
                          numberOfLines={1}
                        >
                          Anywhere
                        </CustomeText>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      receiveStyles.iconButton,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setIsScannerVisible(true)}
                  >
                    <Icon
                      name="qr-code-outline"
                      iconFamily="Ionicons"
                      size={20}
                      color={colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={receiveStyles.scrollContent}>
              <View
                style={[
                  receiveStyles.infoContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={receiveStyles.searchIconContainer}>
                  <LinearGradient
                    colors={['#00D2FF', '#3a7bd5']}
                    style={receiveStyles.searchIconInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon
                      name="cloud-download-outline"
                      iconFamily="Ionicons"
                      color="#fff"
                      size={28}
                    />
                  </LinearGradient>
                </View>

                <CustomeText
                  fontFamily="Okra-Bold"
                  color={colors.text}
                  fontSize={16}
                  style={receiveStyles.title}
                  variant="h5"
                  onLayout={() => {}}
                  numberOfLines={1}
                >
                  Nearby Visibility On
                </CustomeText>

                <CustomeText
                  color={colors.subtext}
                  fontSize={13}
                  fontFamily="Okra-Medium"
                  style={receiveStyles.subtitle}
                  variant="body2"
                  onLayout={() => {}}
                  numberOfLines={2}
                >
                  Visible to nearby senders. Ensure you're on the same network.
                </CustomeText>

                <View style={receiveStyles.breakerContainer}>
                  <View style={receiveStyles.breakerLine} />
                  <CustomeText
                    color="rgba(255,255,255,0.5)"
                    fontSize={12}
                    variant="body2"
                    style={{}}
                    onLayout={() => {}}
                    numberOfLines={1}
                  >
                    or
                  </CustomeText>
                  <View style={receiveStyles.breakerLine} />
                </View>

                <TouchableOpacity
                  style={receiveStyles.qrButton}
                  onPress={() => setIsScannerVisible(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.12)',
                      'rgba(255,255,255,0.05)',
                    ]}
                    style={receiveStyles.qrButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon
                      name="qr-code-outline"
                      iconFamily="Ionicons"
                      color="#00D2FF"
                      size={18}
                    />
                    <CustomeText
                      fontFamily="Okra-Bold"
                      color={colors.text}
                      fontSize={14}
                      variant="h6"
                      style={{}}
                      onLayout={() => {}}
                      numberOfLines={1}
                    >
                      Show QR Code
                    </CustomeText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Animation Container */}
              <View style={receiveStyles.animationContainer}>
                {/* Wave Effect Rings */}
                <Animated.View
                  style={[
                    receiveStyles.waveRing,
                    {
                      width: lottieSize,
                      height: lottieSize,
                      borderRadius: lottieSize / 2,
                      transform: [{ scale: waveScale }],
                      opacity: waveOpacity,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    receiveStyles.waveRing,
                    {
                      width: lottieSize,
                      height: lottieSize,
                      borderRadius: lottieSize / 2,
                      transform: [{ scale: waveScaleInner }],
                      opacity: waveOpacityInner,
                    },
                  ]}
                />

                {/* Rotating Ring */}
                <Animated.View
                  style={[
                    receiveStyles.outerRing,
                    {
                      width: ringSize,
                      height: ringSize,
                      borderRadius: ringSize / 2,
                      transform: [{ rotate: spin }],
                    },
                  ]}
                >
                  {[...Array(8)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        receiveStyles.ringDot,
                        {
                          transform: [
                            { rotate: `${i * 45}deg` },
                            { translateY: -(ringSize / 2.5) },
                          ],
                        },
                      ]}
                    />
                  ))}
                </Animated.View>

                {/* Inner Ring */}
                <Animated.View
                  style={[
                    receiveStyles.innerRing,
                    {
                      width: innerRingSize,
                      height: innerRingSize,
                      borderRadius: innerRingSize / 2,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />

                {/* Lottie Container */}
                <View
                  style={[
                    receiveStyles.lottieContainer,
                    { width: lottieSize, height: lottieSize },
                  ]}
                >
                  {!isScannerVisible && (
                    <LottieView
                      style={receiveStyles.lottie}
                      source={require('../assets/animations/scan2.json')}
                      autoPlay
                      loop={true}
                      hardwareAccelerationAndroid
                    />
                  )}

                  {/* Center Profile */}
                  <View style={receiveStyles.profileContainer}>
                    <Animated.View
                      style={[
                        receiveStyles.profileGlow,
                        {
                          width: lottieSize * 0.3,
                          height: lottieSize * 0.3,
                          borderRadius: (lottieSize * 0.3) / 2,
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    />
                    <View style={receiveStyles.profileImageContainer}>
                      <Image
                        source={require('../assets/images/profile.jpg')}
                        style={receiveStyles.profileImage}
                      />
                    </View>
                  </View>

                  {/* Receiving Signal Dots */}
                  {[...Array(4)].map((_, i) => {
                    const angle = (i * 90 + Date.now() * 0.01) % 360;
                    const distance = lottieSize * 0.25;
                    const x = Math.cos((angle * Math.PI) / 180) * distance;
                    const y = Math.sin((angle * Math.PI) / 180) * distance;
                    const dotScale = pulseAnim.interpolate({
                      inputRange: [1, 1.15],
                      outputRange: [0.8, 1.2],
                    });

                    return (
                      <Animated.View
                        key={i}
                        style={[
                          receiveStyles.signalDot,
                          {
                            left: lottieSize / 2 - 4 + x,
                            top: lottieSize / 2 - 4 + y,
                            transform: [{ scale: dotScale }],
                            opacity: pulseAnim,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>

      <QRGenerateModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
      />
    </>
  );
};

const receiveStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    // paddingHorizontal: 10,
  },
  headerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 15,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saContainer: {
    position: 'relative',
    padding: 2,
  },
  saBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveIconWrapper: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  titleColumn: {
    marginLeft: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoContainer: {
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  searchIconContainer: {
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  searchIconInner: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 4,
  },
  breakerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginVertical: 8,
  },
  breakerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  qrButton: {
    width: '70%',
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
  },
  qrButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(66,213,252,0.2)',
    borderRadius: 14,
  },
  animationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -width * 0.25,
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
  },
  lottieContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lottie: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  profileContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  signalDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});

export default ReceiveScreen;
