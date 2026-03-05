// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Image,
//   Platform,
//   StatusBar,
// } from 'react-native';
// import React, { useEffect, useRef, useState } from 'react';
// import LinearGradient from 'react-native-linear-gradient';
// import { sendStyles } from '../styles/sendStyles';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Icon from '../components/global/Icon';
// import CustomeText from '../components/global/CustomeText';
// import QRGenerateModal from '../components/modals/QRGenerateModal';
// import LottieView from 'lottie-react-native';
// import BreakerText from '../components/ui/BreakerText';
// import { Colors } from '../utils/Constants';
// import { goBack, navigate } from '../utils/NavigationUtil';
// import { useTCP } from '../service/TCPProvider';
// import DeviceInfo from 'react-native-device-info';
// import {
//   getBroadcastIPAddress,
//   getLocalIPAddress,
// } from '../utils/networkUtils';
// import dgram from 'react-native-udp';

// const ReceiveScreen = () => {
//   const { startServer, server, isConnected } = useTCP();
//   const [qrValue, setQRValue] = useState('');
//   const [isScannerVisible, setIsScannerVisible] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const setupServer = async () => {
//     const deviceName = await DeviceInfo.getDeviceName();
//     const ip = await getLocalIPAddress();
//     const port = 4000;

//     if (!server) {
//       startServer(port);
//     }

//     setQRValue(`tcp://${ip}:${port}|${deviceName}`);
//     console.log(`Server Info: ${ip}:${port}`);
//   };

//   const sendDiscoverySignal = async () => {
//     const deviceName = await DeviceInfo.getDeviceName();
//     const broadcastAddress = await getBroadcastIPAddress();
//     const targetAddress = broadcastAddress || '255.255.255.255';
//     const port = 57143;

//     const client = dgram.createSocket({
//       type: 'udp4',
//       reusePort: true,
//     });

//     client.bind(() => {
//       try {
//         if (Platform.OS === 'ios') {
//           client.setBroadcast(true);
//         }

//         client.send(
//           `${qrValue}`,
//           0,
//           `${qrValue}`.length,
//           port,
//           targetAddress,
//           err => {
//             if (err) {
//               console.log('Error sending discovery signal ', err);
//             } else {
//               console.log(
//                 `${deviceName} Discovery Signal sent to ${targetAddress}`,
//               );
//             }
//             client.close();
//           },
//         );
//       } catch (error) {
//         console.error('Failed to set broadcast or send', error);
//         client.close();
//       }
//     });
//   };

//   useEffect(() => {
//     if (!qrValue) return;

//     sendDiscoverySignal();
//     intervalRef.current = setInterval(sendDiscoverySignal, 3000);

//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//     };
//   }, [qrValue]);
//   const handleGoBack = () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }
//     goBack();
//   };
//   useEffect(() => {
//     if (isConnected) {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//       }
//       navigate('ConnectionScreen');
//     }
//   }, [isConnected]);
//   useEffect(() => {
//     setupServer();
//   }, []);
//   return (
//     <>
//       <StatusBar backgroundColor="#3387C5" />
//       <LinearGradient
//         colors={['#FFFFFF', '#4DA0DE', '#3387C5']}
//         style={sendStyles.container}
//         start={{ x: 0, y: 1 }}
//         end={{ x: 0, y: 0 }}
//       >
//         <SafeAreaView style={{ flex: 1 }}>
//           <View style={sendStyles.mainContainer}>
//             <View style={sendStyles.infoContainer}>
//               <Icon
//                 name="blur-on"
//                 iconFamily="MaterialIcons"
//                 color="#fff"
//                 size={40}
//               />

//               <CustomeText
//                 fontFamily="Okra-Bold"
//                 color="#fff"
//                 fontSize={16}
//                 style={{ marginTop: 20 }}
//               >
//                 Receiving from nearby devices
//               </CustomeText>

//               <CustomeText
//                 color="#fff"
//                 fontSize={12}
//                 fontFamily="Okra-Medium"
//                 style={{ textAlign: 'center', marginTop: 8 }}
//               >
//                 Ensure your device is connected to the sender's hotspot network.
//               </CustomeText>
//               <BreakerText text={'or'} />
//               <TouchableOpacity
//                 style={sendStyles.qrButton}
//                 onPress={() => setIsScannerVisible(true)}
//               >
//                 <Icon
//                   name="qrcode"
//                   iconFamily="MaterialCommunityIcons"
//                   color={Colors.primary}
//                   size={16}
//                 />

//                 <CustomeText fontFamily="Okra-Bold" color={Colors.primary}>
//                   Show QR
//                 </CustomeText>
//               </TouchableOpacity>
//             </View>
//             <View style={sendStyles.animationContainer}>
//               <View style={sendStyles.lottieContainer}>
//                 <LottieView
//                   style={sendStyles.lottie}
//                   source={require('../assets/animations/scan2.json')}
//                   autoPlay
//                   loop={true}
//                   hardwareAccelerationAndroid
//                 />
//               </View>

//               <Image
//                 source={require('../assets/images/profile.jpg')}
//                 style={sendStyles.profileImage}
//               />
//             </View>
//             <TouchableOpacity
//               onPress={handleGoBack}
//               style={sendStyles.backButton}
//             >
//               <Icon
//                 name="arrow-back"
//                 iconFamily="Ionicons"
//                 size={16}
//                 color="#000"
//               />
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>

//         {isScannerVisible && (
//           <QRGenerateModal
//             visible={isScannerVisible}
//             onClose={() => setIsScannerVisible(false)}
//           />
//         )}
//       </LinearGradient>
//     </>
//   );
// };

// export default ReceiveScreen;


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
import { SafeAreaView } from 'react-native-safe-area-context';
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

const { width, height } = Dimensions.get('window');

const ReceiveScreen = () => {
  const { startServer, server, isConnected } = useTCP();
  const [qrValue, setQRValue] = useState('');
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Dynamic sizing
  const lottieSize = Math.min(width * 0.60, 260);
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
        client.close();
      }
    });
  };

  useEffect(() => {
    if (!qrValue) return;

    sendDiscoverySignal();
    intervalRef.current = setInterval(sendDiscoverySignal, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [qrValue]);

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

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.3, 0],
  });

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        // colors={['#4DA0DE', '#3387C5', '#1E5F9E']}
        colors={['#FF6FD8', '#3813C2']}
        style={receiveStyles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={receiveStyles.safeArea} edges={['top', 'left', 'right']}>
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
            <View style={receiveStyles.header}>
              <TouchableOpacity
                onPress={handleGoBack}
                style={receiveStyles.backButton}
                activeOpacity={0.7}
              >
                <View style={receiveStyles.backButtonInner}>
                  <Icon
                    name="arrow-back"
                    iconFamily="Ionicons"
                    size={22}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>

              <CustomeText fontFamily="Okra-Bold" color="#fff" fontSize={18}>
                Receive Files
              </CustomeText>

              <View style={receiveStyles.headerRight} />
            </View>

            {/* Info Section */}
            <View style={receiveStyles.infoContainer}>
              <View style={receiveStyles.searchIconContainer}>
                <View style={receiveStyles.searchIconInner}>
                  <Icon
                    name="blur-on"
                    iconFamily="MaterialIcons"
                    color="#fff"
                    size={28}
                  />
                </View>
              </View>

              <CustomeText
                fontFamily="Okra-Bold"
                color="#fff"
                fontSize={18}
                style={receiveStyles.title}
              >
                Receiving from devices
              </CustomeText>

              <CustomeText
                color="rgba(255,255,255,0.8)"
                fontSize={12}
                fontFamily="Okra-Medium"
                style={receiveStyles.subtitle}
              >
                Make sure you're connected to sender's hotspot
              </CustomeText>

              <View style={receiveStyles.breakerContainer}>
                <View style={receiveStyles.breakerLine} />
                <CustomeText color="rgba(255,255,255,0.5)" fontSize={12}>
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
                  colors={['#FFFFFF', '#F0F0F0']}
                  style={receiveStyles.qrButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon
                    name="qrcode"
                    iconFamily="MaterialCommunityIcons"
                    color={Colors.primary}
                    size={18}
                  />
                  <CustomeText
                    fontFamily="Okra-Bold"
                    color={Colors.primary}
                    fontSize={14}
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
                    transform: [{ scale: Animated.multiply(waveScale, 0.8) }],
                    opacity: Animated.multiply(waveOpacity, 0.7),
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
              <View style={[receiveStyles.lottieContainer, { width: lottieSize, height: lottieSize }]}>
                <LottieView
                  style={receiveStyles.lottie}
                  source={require('../assets/animations/scan2.json')}
                  autoPlay
                  loop={true}
                  hardwareAccelerationAndroid
                />

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
                  const x = Math.cos(angle * Math.PI / 180) * distance;
                  const y = Math.sin(angle * Math.PI / 180) * distance;
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
          </Animated.View>
        </SafeAreaView>

        {isScannerVisible && (
          <QRGenerateModal
            visible={isScannerVisible}
            onClose={() => setIsScannerVisible(false)}
            qrValue={qrValue}
          />
        )}
      </LinearGradient>
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerRight: {
    width: 40,
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 6,
  },
  searchIconInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
    fontSize: 18,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 30,
    marginBottom: 8,
    fontSize: 12,
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
    width: '60%',
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  qrButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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