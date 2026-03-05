import {
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  StyleSheet,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useTCP } from '../service/TCPProvider';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/global/Icon';
import CustomeText from '../components/global/CustomeText';
import { Colors } from '../utils/Constants';
import QRScannerModal from '../components/modals/QRScannerModal';
import LottieView from 'lottie-react-native';
import { goBack, navigate } from '../utils/NavigationUtil';
import dgram from 'react-native-udp';

const { width, height } = Dimensions.get('window');

const SendScreen = () => {
  const { isConnected, connectToServer } = useTCP();
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

  const listenForDevices = async () => {
    const server = dgram.createSocket({
      type: 'udp4',
      reusePort: true,
    });

    const port = 57143;

    server.bind(port, () => { });

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
            distance:
              Math.random() * (lottieSize * 0.35) + lottieSize * 0.15,
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
        udpServer.close(() => { });
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
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={['#0A1628', '#1B2B4B', '#1E3A5F']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <Animated.View
            style={[styles.content, { opacity: fadeAnim }]}
          >
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                { transform: [{ translateY: headerSlide }] },
              ]}
            >
              <TouchableOpacity
                onPress={handleGoBack}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <Icon
                  name="arrow-back"
                  iconFamily="Ionicons"
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>

              <CustomeText fontFamily="Okra-Bold" color="#fff" fontSize={18}>
                Send Files
              </CustomeText>

              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Info Card */}
            <Animated.View
              style={[
                styles.infoCard,
                { transform: [{ translateY: cardSlide }] },
              ]}
            >
              <View style={styles.infoIconWrap}>
                <LinearGradient
                  colors={['#0072FF', '#42D5FC']}
                  style={styles.infoIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon
                    name="radar"
                    iconFamily="MaterialCommunityIcons"
                    color="#fff"
                    size={24}
                  />
                </LinearGradient>
              </View>

              <CustomeText
                fontFamily="Okra-Bold"
                color="#fff"
                fontSize={17}
                style={{ marginTop: 10 }}
              >
                Searching for devices...
              </CustomeText>

              <CustomeText
                color="rgba(255,255,255,0.55)"
                fontSize={12}
                fontFamily="Okra-Medium"
                style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}
              >
                Ensure receiver is connected to your hotspot
              </CustomeText>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <CustomeText color="rgba(255,255,255,0.3)" fontSize={11}>
                  or
                </CustomeText>
                <View style={styles.dividerLine} />
              </View>

              {/* QR Button */}
              <TouchableOpacity
                style={styles.qrBtn}
                onPress={() => setIsScannerVisible(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                  style={styles.qrBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon
                    name="qrcode-scan"
                    iconFamily="MaterialCommunityIcons"
                    color="#42D5FC"
                    size={18}
                  />
                  <CustomeText
                    fontFamily="Okra-Bold"
                    color="#42D5FC"
                    fontSize={14}
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
                {nearbyDevices.map((device) => {
                  const cx = lottieSize / 2;
                  const cy = lottieSize / 2;
                  const x =
                    Math.cos((device.angle * Math.PI) / 180) * device.distance;
                  const y =
                    Math.sin((device.angle * Math.PI) / 180) * device.distance;

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
                            color="#fff"
                            fontFamily="Okra-Bold"
                            fontSize={10}
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
          </Animated.View>
        </SafeAreaView>

        {isScannerVisible && (
          <QRScannerModal
            visible={isScannerVisible}
            onClose={() => setIsScannerVisible(false)}
            onScan={handleScan}
          />
        )}
      </LinearGradient>
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
    paddingHorizontal: 20,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Info Card */
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  infoIconWrap: {
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
    borderWidth: 1,
    borderColor: 'rgba(66,213,252,0.3)',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitDot: {
    position: 'absolute',
    backgroundColor: '#42D5FC',
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
