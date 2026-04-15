import {
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useTCP } from '../service/TCPProvider';
import LinearGradient from 'react-native-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from '../components/global/Icon';
import CustomeText from '../components/global/CustomeText';
import { Colors } from '../utils/Constants';
import QRScannerModal from '../components/modals/QRScannerModal';
import LottieView from 'lottie-react-native';
import { goBack, navigate } from '../utils/NavigationUtil';
import DeviceInfo from 'react-native-device-info';
import dgram from 'react-native-udp';
import {
  getBroadcastIPAddress,
  getLocalIPAddress,
} from '../utils/networkUtils';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const SendScreen = () => {
  const { isConnected, connectToServer } = useTCP();
  const { colors, isDark } = useTheme();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [nearbyDevices, setNearbyDevices] = useState([]);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const scannerScale = useRef(new Animated.Value(0.8)).current;
  const ring1Pulse = useRef(new Animated.Value(0.6)).current;
  const ring2Pulse = useRef(new Animated.Value(0.6)).current;
  const ring3Pulse = useRef(new Animated.Value(0.6)).current;
  const dotFloat = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const wifiPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiPulse, {
          toValue: 1.2,
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

  const lottieSize = Math.min(width * 0.65, 280);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scannerScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Profile pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Ring rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Radar pulse rings
    const pulseRing = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.5,
            duration: 2500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    pulseRing(ring1Pulse, 0);
    pulseRing(ring2Pulse, 800);
    pulseRing(ring3Pulse, 1600);

    // Floating dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotFloat, {
          toValue: -6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotFloat, {
          toValue: 6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleScan = data => {
    const [connectionData, deviceName] = data.replace('tcp://', '').split('|');
    const [host, port] = connectionData.split(':');
    connectToServer(host, parseInt(port, 10), deviceName);
  };

  const handleGoBack = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => goBack());
  };

  useEffect(() => {
    if (isConnected) {
      navigate('ConnectionScreen');
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      navigate('ConnectionScreen');
    }
  }, []);

  const listenForDevices = async () => {
    const server = dgram.createSocket({
      type: 'udp4',
      reusePort: true,
    });

    server.on('error', err => {
      console.log('UDP listener error:', err?.message || err);
    });

    const port = 57143;

    server.bind(port, () => {
      try {
        server.setBroadcast(true);
      } catch (e) {
        console.log('setBroadcast skipped:', e?.message);
      }
    });

    server.on('message', (msg, rinfo) => {
      const messageStr = msg?.toString() || '';
      const [connectionData, otherDevice] = messageStr
        .replace('tcp://', '')
        .split('|');

      if (!otherDevice) return;

      setNearbyDevices(prevDevices => {
        const deviceExists = prevDevices?.some(
          device => device?.name === otherDevice,
        );

        if (!deviceExists) {
          const newDevice = {
            id: `${Date.now()}_${Math.random()}`,
            name: otherDevice,
            image: require('../assets/icons/device.jpeg'),
            fullAddress: messageStr,
            angle: Math.random() * 360,
            distance: Math.random() * (lottieSize * 0.35) + lottieSize * 0.15,
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
          };

          Animated.parallel([
            Animated.timing(newDevice.scale, {
              toValue: 1,
              duration: 800,
              easing: Easing.elastic(1),
              useNativeDriver: true,
            }),
            Animated.timing(newDevice.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();

          return [...prevDevices, newDevice];
        }
        return prevDevices;
      });
    });

    return server;
  };

  useEffect(() => {
    let udpServer;

    const setupServer = async () => {
      udpServer = await listenForDevices();
    };

    setupServer();

    return () => {
      if (udpServer) {
        udpServer.close(() => {});
      }
      setNearbyDevices([]);
    };
  }, [lottieSize]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spinReverse = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={colors.gradientBg}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <Animated.View
            style={[
              styles.headerContainer,
              { transform: [{ translateY: headerSlide }] },
            ]}
          >
            <View style={styles.headerGradient}>
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.headerLeft,
                    { flexDirection: 'row', alignItems: 'center' },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => goBack()}
                    style={[
                      styles.backBtn,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                        marginRight: 15,
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

                  <View style={styles.brandingContainer}>
                    <View style={styles.saContainer}>
                      <LinearGradient
                        colors={['#003366', '#0072FF']}
                        style={[
                          styles.saBox,
                          {
                            width: 40,
                            height: 40,
                            justifyContent: 'center',
                            alignItems: 'center',
                          },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <CustomeText
                          fontFamily="Okra-Bold"
                          fontSize={16}
                          color="#fff"
                          variant="h6"
                          style={{ textAlign: 'center' }}
                          onLayout={() => {}}
                          numberOfLines={1}
                        >
                          SA
                        </CustomeText>
                      </LinearGradient>
                      <Animated.View
                        style={[
                          styles.waveIconWrapper,
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
                    <View style={styles.titleColumn}>
                      <CustomeText
                        variant="h6"
                        fontSize={14}
                        fontFamily="Okra-Bold"
                        color={colors.text}
                        onLayout={() => {}}
                        numberOfLines={1}
                        style={{}}
                      >
                        Send
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
                    styles.iconButton,
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
          </Animated.View>

          <View style={styles.content}>
            <View style={styles.scrollContent}>
              <Animated.View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    transform: [{ translateY: cardSlide }],
                  },
                ]}
              >
                <View style={styles.infoIconWrap}>
                  <LinearGradient
                    colors={['#00D2FF', '#3a7bd5']}
                    style={styles.infoIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon
                      name="cloud-upload-outline"
                      iconFamily="Ionicons"
                      size={28}
                      color="#fff"
                    />
                  </LinearGradient>
                </View>

                <CustomeText
                  variant="h5"
                  fontSize={16}
                  fontFamily="Okra-Bold"
                  color={colors.text}
                  style={{ marginTop: 12 }}
                  onLayout={() => {}}
                  numberOfLines={1}
                >
                  Nearby Discovery Active
                </CustomeText>
                <CustomeText
                  variant="body2"
                  fontSize={13}
                  color={colors.subtext}
                  style={{ textAlign: 'center', marginTop: 4 }}
                  onLayout={() => {}}
                  numberOfLines={2}
                >
                  Searching for compatible devices...
                </CustomeText>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <CustomeText color="rgba(255,255,255,0.3)" fontSize={10}>
                    OR
                  </CustomeText>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.qrBtn}
                  activeOpacity={0.8}
                  onPress={() => setIsScannerVisible(true)}
                >
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.12)',
                      'rgba(255,255,255,0.05)',
                    ]}
                    style={styles.qrBtnGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon
                      name="qr-code-outline"
                      iconFamily="Ionicons"
                      size={18}
                      color="#00D2FF"
                    />
                    <CustomeText
                      variant="h6"
                      fontSize={14}
                      fontFamily="Okra-Bold"
                      color={colors.text}
                      onLayout={() => {}}
                      numberOfLines={1}
                      style={{}}
                    >
                      Scan QR Code
                    </CustomeText>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Scanner Area */}
              <View style={styles.scannerArea}>
                {/* Radar pulse rings */}
                {[ring1Pulse, ring2Pulse, ring3Pulse].map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.radarRing,
                      {
                        width: lottieSize * (0.5 + i * 0.25),
                        height: lottieSize * (0.5 + i * 0.25),
                        borderRadius: lottieSize * (0.25 + i * 0.125),
                        opacity: anim.interpolate({
                          inputRange: [0.6, 1.5],
                          outputRange: [0.4, 0],
                        }),
                        transform: [{ scale: anim }],
                      },
                    ]}
                  />
                ))}

                {/* Rotating outer ring with dots */}
                <Animated.View
                  style={[
                    styles.orbitRing,
                    {
                      width: lottieSize * 1.1,
                      height: lottieSize * 1.1,
                      borderRadius: lottieSize * 0.55,
                      transform: [{ rotate: spin }],
                    },
                  ]}
                >
                  {[...Array(12)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.orbitDot,
                        {
                          transform: [
                            { rotate: `${i * 30}deg` },
                            { translateY: -(lottieSize * 0.55) },
                          ],
                          opacity: i % 3 === 0 ? 0.8 : 0.3,
                          width: i % 3 === 0 ? 6 : 3,
                          height: i % 3 === 0 ? 6 : 3,
                          borderRadius: i % 3 === 0 ? 3 : 1.5,
                        },
                      ]}
                    />
                  ))}
                </Animated.View>

                {/* Inner dashed ring */}
                <Animated.View
                  style={[
                    styles.dashedRing,
                    {
                      width: lottieSize * 0.75,
                      height: lottieSize * 0.75,
                      borderRadius: lottieSize * 0.375,
                      transform: [{ rotate: spinReverse }],
                    },
                  ]}
                />

                {/* Lottie scanner animation */}
                <Animated.View
                  style={[
                    styles.lottieWrap,
                    {
                      width: lottieSize,
                      height: lottieSize,
                      transform: [{ scale: scannerScale }],
                    },
                  ]}
                >
                  <LottieView
                    style={styles.lottie}
                    source={require('../assets/animations/scanner.json')}
                    autoPlay
                    loop={true}
                    hardwareAccelerationAndroid
                  />

                  {/* Center profile */}
                  <View style={styles.profileCenter}>
                    <Animated.View
                      style={[
                        styles.profileGlow,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    />
                    <View style={styles.profileRing}>
                      <Image
                        source={require('../assets/images/profile.jpg')}
                        style={styles.profileImg}
                      />
                    </View>
                  </View>

                  {/* Nearby device bubbles */}
                  {nearbyDevices.map(device => {
                    const cx = lottieSize / 2;
                    const cy = lottieSize / 2;
                    const x =
                      Math.cos((device.angle * Math.PI) / 180) *
                      device.distance;
                    const y =
                      Math.sin((device.angle * Math.PI) / 180) *
                      device.distance;

                    return (
                      <Animated.View
                        key={device.id}
                        style={[
                          styles.deviceBubble,
                          {
                            left: cx + x - 42,
                            top: cy + y - 24,
                            opacity: device.opacity,
                            transform: [
                              { scale: device.scale },
                              { translateY: dotFloat },
                            ],
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.deviceCard}
                          onPress={() => handleScan(device.fullAddress)}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={device.image}
                            style={styles.deviceImg}
                          />
                          <View>
                            <CustomeText
                              numberOfLines={1}
                              color={colors.text}
                              fontFamily="Okra-Bold"
                              fontSize={10}
                              onLayout={() => {}}
                              variant="body2"
                              style={{}}
                            >
                              {device.name}
                            </CustomeText>
                            <View style={styles.signalRow}>
                              {[4, 6, 8, 10].map((h, j) => (
                                <View
                                  key={j}
                                  style={[styles.signalBar, { height: h }]}
                                />
                              ))}
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </Animated.View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isScannerVisible && (
        <QRScannerModal
          visible={isScannerVisible}
          onClose={() => setIsScannerVisible(false)}
          onScan={handleScan}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    width: '100%',
    zIndex: 100,
  },
  headerGradient: {
    paddingBottom: 15,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
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
    // width: 40,
    // height: 40,
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

  /* Info Card */
  infoCard: {
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 15,
  },
  infoIconWrap: {
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginVertical: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  qrBtn: {
    width: '70%',
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  qrBtnGrad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(66,213,252,0.2)',
    borderRadius: 14,
  },

  /* Scanner Area */
  scannerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0,210,255,0.25)',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitDot: {
    position: 'absolute',
    backgroundColor: '#00D2FF',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  dashedRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  lottieWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },

  /* Profile */
  profileCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderRadius: 35,
  },
  profileGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,114,255,0.2)',
  },
  profileRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: 'rgba(66,213,252,0.6)',
    overflow: 'hidden',
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },

  /* Device Bubbles */
  deviceBubble: {
    position: 'absolute',
    zIndex: 40,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  deviceImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(66,213,252,0.5)',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: 2,
  },
  signalBar: {
    width: 2.5,
    backgroundColor: '#42D5FC',
    borderRadius: 1,
  },
});

export default SendScreen;
