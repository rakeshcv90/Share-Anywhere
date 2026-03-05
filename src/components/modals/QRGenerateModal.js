// import {
//   View,
//   Text,
//   Modal,
//   ActivityIndicator,
//   TouchableOpacity,
// } from 'react-native';
// import React, { useEffect, useState } from 'react';
// import { modalStyles } from '../../styles/modalStyles';
// import Animated, {
//   Easing,
//   useSharedValue,
//   useAnimatedStyle,
//   withRepeat,
//   withTiming,
// } from 'react-native-reanimated';
// import LinearGradient from 'react-native-linear-gradient';
// import { multiColor } from '../../utils/Constants';
// import QRCode from 'react-native-qrcode-svg';
// import CustomeText from '../global/CustomeText';
// import Icon from '../global/Icon';
// // import { useTCP } from '../../service/TCPProvider';
// import DeviceInfo from 'react-native-device-info';
// import { getLocalIPAddress } from '../../utils/networkUtils';
// import { navigate } from '../../utils/NavigationUtil';
// import { useTCP } from '../../service/TCPProvider';
// const QRGenerateModal = ({ visible, onClose }) => {
//   const { startServer, server, isConnected } = useTCP();
//   const [loading, setLoading] = useState(true);
//   const [qrValue, setQRValue] = useState('Rakesh');
//   const shimmerTranslateX = useSharedValue(-300);
//   const shimmerStyle = useAnimatedStyle(() => ({
//     transform: [{ translateX: shimmerTranslateX.value }],
//   }));
//   const setupServer = async () => {
//     const deviceName = await DeviceInfo.getDeviceName();
//     const ip = await getLocalIPAddress();
//     const port = 4000;

//     if (server) {
//       setQRValue(`tcp://${ip}:${port}|${deviceName}`);
//       setLoading(false);
//       return;
//     }

//     startServer(port);
//     setQRValue(`tcp://${ip}:${port}|${deviceName}`);
//     console.log(`Server Info: ${ip}:${port}`);
//     setLoading(false);
//   };

//   useEffect(() => {
//     console.log('TCPProvider: isConnected updated to', isConnected);

//     if (isConnected) {
//       onClose();
//       navigate('ConnectionScreen');
//     }
//   }, [isConnected]);

//   useEffect(() => {
//     shimmerTranslateX.value = withRepeat(
//       withTiming(300, { duration: 1500, easing: Easing.linear }),
//       -1,
//       false,
//     );
//     if (visible) {
//       setupServer();
//       setLoading(true);
//     }
//   }, [visible]);
//   return (
//     <Modal
//       animationType="slide"
//       visible={visible}
//       presentationStyle="formSheet"
//       onRequestClose={onClose}
//       onDismiss={onClose}
//     >
//       <View style={modalStyles.modalContainer}>
//         <View style={modalStyles.qrContainer}>
//           {loading || qrValue === null || qrValue == '' ? (
//             <View style={modalStyles.skeleton}>
//               <Animated.View style={[modalStyles.shimmerOverlay, shimmerStyle]}>
//                 <LinearGradient
//                   colors={['#f3f3f3', '#fff', '#f3f3f3']}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 0 }}
//                   style={{ flex: 1 }}
//                 />
//               </Animated.View>
//             </View>
//           ) : (
//             <>
//               <QRCode
//                 value={qrValue}
//                 size={250}
//                 logoSize={60}
//                 logoBackgroundColor="#fff"
//                 logoMargin={2}
//                 logoBorderRagius={10}
//                 // logo={require('../../assets/images/profile2.jpg')}
//                 linearGradient={multiColor}
//                 enableLinearGradient
//               />
//             </>
//           )}
//         </View>
//         <View style={modalStyles.info}>
//           <CustomeText style={modalStyles.infoText1} fontFamily="Okra-Medium">
//             Ensure you're on the same Wi-Fi network.
//           </CustomeText>

//           <CustomeText style={modalStyles.infoText2} fontFamily="Okra-Medium">
//             Ask the sender to scan this QR code to connect and transfer files.
//           </CustomeText>
//         </View>

//         <ActivityIndicator
//           size="small"
//           color="#000"
//           style={{ alignSelf: 'center' }}
//         />

//         <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
//           <Icon name="close" iconFamily="Ionicons" size={24} color="#000" />
//         </TouchableOpacity>
//       </View>
//     </Modal>
//   );
// };

// export default QRGenerateModal;

import {
  View,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
} from 'react-native';
import React, { useEffect, useState } from 'react';

import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import CustomeText from '../global/CustomeText';
import Icon from '../global/Icon';
import DeviceInfo from 'react-native-device-info';
import { getLocalIPAddress } from '../../utils/networkUtils';
import { navigate } from '../../utils/NavigationUtil';
import { useTCP } from '../../service/TCPProvider';

const { width } = Dimensions.get('window');

// const QRGenerateModal = ({ visible, onClose }) => {
//   const { startServer, server, isConnected } = useTCP();
//   const [loading, setLoading] = useState(true);
//   const [qrValue, setQRValue] = useState('');

//   // Animation values
//   const fadeAnim = useSharedValue(0);
//   const scaleAnim = useSharedValue(0.95);
//   const pulseAnim = useSharedValue(1);
//   const rotateAnim = useSharedValue(0);
//   const shimmerAnim = useSharedValue(-width);

//   const containerStyle = useAnimatedStyle(() => ({
//     opacity: fadeAnim.value,
//     transform: [{ scale: scaleAnim.value }],
//   }));

//   const pulseStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: pulseAnim.value }],
//   }));

//   const ringStyle = useAnimatedStyle(() => ({
//     transform: [{ rotate: `${rotateAnim.value}deg` }],
//   }));

//   const shimmerStyle = useAnimatedStyle(() => ({
//     transform: [{ translateX: shimmerAnim.value }],
//   }));

//   useEffect(() => {
//     // Entrance animation
//     if (visible) {
//       fadeAnim.value = withTiming(1, { duration: 400 });
//       scaleAnim.value = withTiming(1, { duration: 400 });
//     } else {
//       fadeAnim.value = withTiming(0, { duration: 300 });
//       scaleAnim.value = withTiming(0.95, { duration: 300 });
//     }

//     // Subtle pulse animation for the QR container (not the QR code itself)
//     pulseAnim.value = withRepeat(
//       withSequence(
//         withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
//         withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
//       ),
//       -1,
//       true,
//     );

//     // Slow rotation for outer ring
//     rotateAnim.value = withRepeat(
//       withTiming(360, { duration: 10000, easing: Easing.linear }),
//       -1,
//     );

//     // Shimmer effect for loading state
//     shimmerAnim.value = withRepeat(
//       withSequence(
//         withTiming(width, { duration: 1500, easing: Easing.linear }),
//         withDelay(500, withTiming(-width, { duration: 0 })),
//       ),
//       -1,
//     );
//   }, [visible]);

//   const setupServer = async () => {
//     try {
//       const deviceName = await DeviceInfo.getDeviceName();
//       const ip = await getLocalIPAddress();
//       const port = 4000;

//       if (server) {
//         setQRValue(`tcp://${ip}:${port}|${deviceName}`);
//         setLoading(false);
//         return;
//       }

//       startServer(port);
//       setQRValue(`tcp://${ip}:${port}|${deviceName}`);
//       console.log(`Server Info: ${ip}:${port}`);
//       setLoading(false);
//     } catch (error) {
//       console.error('Error setting up server:', error);
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isConnected) {
//       onClose();
//       navigate('ConnectionScreen');
//     }
//   }, [isConnected]);

//   useEffect(() => {
//     if (visible) {
//       setLoading(true);
//       setupServer();
//     } else {
//       setQRValue('');
//     }
//   }, [visible]);

//   return (
//     <Modal
//       animationType="fade"
//       transparent={true}
//       visible={visible}
//       onRequestClose={onClose}
//       statusBarTranslucent
//     >
//       <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
//       <LinearGradient
//         colors={[
//           'rgba(0,0,0,0.95)',
//           'rgba(0,20,40,0.98)',
//           'rgba(0,40,80,0.95)',
//         ]}
//         style={styles.gradientBackground}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//       >
//         <View style={styles.overlay}>
//           <Animated.View style={[styles.container, containerStyle]}>
//             {/* Header */}
//             <View style={styles.header}>
//               <CustomeText fontFamily="Okra-Bold" color="#fff" fontSize={24}>
//                 Your QR Code
//               </CustomeText>
//               <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//                 <Icon
//                   name="close"
//                   iconFamily="Ionicons"
//                   size={24}
//                   color="#fff"
//                 />
//               </TouchableOpacity>
//             </View>

//             {/* QR Code Section */}
//             <View style={styles.qrSection}>
//               {/* Animated Rings Container - Only these animate, not the QR code */}
//               <View style={styles.ringsContainer}>
//                 {/* Outer Ring */}
//                 <Animated.View style={[styles.outerRing, ringStyle]}>
//                   <LinearGradient
//                     colors={['#4A90E2', '#5C6BC0', '#4A90E2']}
//                     style={styles.ringGradient}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                   />
//                 </Animated.View>

//                 {/* Inner Ring */}
//                 <Animated.View style={[styles.innerRing, pulseStyle]}>
//                   <LinearGradient
//                     colors={['rgba(74,144,226,0.2)', 'rgba(92,107,192,0.2)']}
//                     style={styles.ringGradient}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 1 }}
//                   />
//                 </Animated.View>

//                 {/* QR Code Container - FIXED: No animations on the QR code itself */}
//                 <View style={styles.qrContainer}>
//                   {loading || !qrValue ? (
//                     <View style={styles.skeleton}>
//                       <Animated.View
//                         style={[styles.shimmerOverlay, shimmerStyle]}
//                       >
//                         <LinearGradient
//                           colors={[
//                             'transparent',
//                             'rgba(255,255,255,0.1)',
//                             'transparent',
//                           ]}
//                           start={{ x: 0, y: 0 }}
//                           end={{ x: 1, y: 0 }}
//                           style={StyleSheet.absoluteFill}
//                         />
//                       </Animated.View>
//                       <View style={styles.qrIconContainer}>
//                         <Icon
//                           name="qrcode"
//                           iconFamily="MaterialCommunityIcons"
//                           size={60}
//                           color="#4A90E2"
//                         />
//                       </View>
//                     </View>
//                   ) : (
//                     <View style={styles.qrWrapper}>
//                       <QRCode
//                         value={qrValue}
//                         size={200}
//                         logoBackgroundColor="#fff"
//                         logoBorderRadius={25}
//                         logoMargin={2}
//                         color="#000"
//                         backgroundColor="#fff"
//                       />
//                       {/* Small checkmark overlay for stability */}
//                       <View style={styles.qrCheckmark}>
//                         <View style={styles.checkmarkDot} />
//                       </View>
//                     </View>
//                   )}
//                 </View>
//               </View>

//               {/* Device Info Card */}
//               {!loading && qrValue && (
//                 <LinearGradient
//                   colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
//                   style={styles.deviceCard}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                 >
//                   <Icon
//                     name="phone-portrait"
//                     iconFamily="Ionicons"
//                     size={16}
//                     color="#4A90E2"
//                   />
//                   <CustomeText
//                     color="#fff"
//                     fontSize={14}
//                     fontFamily="Okra-Medium"
//                   >
//                     {qrValue?.split('|')[1] || 'Your Device'}
//                   </CustomeText>
//                   <View style={styles.activeDot} />
//                 </LinearGradient>
//               )}
//             </View>

//             {/* Info Grid */}
//             <View style={styles.infoGrid}>
//               <View style={styles.infoCard}>
//                 <LinearGradient
//                   colors={['rgba(74,144,226,0.15)', 'rgba(92,107,192,0.15)']}
//                   style={styles.infoCardGradient}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                 >
//                   <Icon
//                     name="wifi"
//                     iconFamily="Ionicons"
//                     size={20}
//                     color="#4A90E2"
//                   />
//                   <CustomeText
//                     color="#fff"
//                     fontSize={12}
//                     fontFamily="Okra-Medium"
//                   >
//                     Same Network
//                   </CustomeText>
//                 </LinearGradient>
//               </View>

//               <View style={styles.infoCard}>
//                 <LinearGradient
//                   colors={['rgba(74,144,226,0.15)', 'rgba(92,107,192,0.15)']}
//                   style={styles.infoCardGradient}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                 >
//                   <Icon
//                     name="shield-checkmark"
//                     iconFamily="Ionicons"
//                     size={20}
//                     color="#4A90E2"
//                   />
//                   <CustomeText
//                     color="#fff"
//                     fontSize={12}
//                     fontFamily="Okra-Medium"
//                   >
//                     Secure
//                   </CustomeText>
//                 </LinearGradient>
//               </View>

//               <View style={styles.infoCard}>
//                 <LinearGradient
//                   colors={['rgba(74,144,226,0.15)', 'rgba(92,107,192,0.15)']}
//                   style={styles.infoCardGradient}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 1 }}
//                 >
//                   <Icon
//                     name="flash"
//                     iconFamily="Ionicons"
//                     size={20}
//                     color="#4A90E2"
//                   />
//                   <CustomeText
//                     color="#fff"
//                     fontSize={12}
//                     fontFamily="Okra-Medium"
//                   >
//                     Fast
//                   </CustomeText>
//                 </LinearGradient>
//               </View>
//             </View>

//             {/* Status Bar */}
//             <View style={styles.statusBar}>
//               <View style={styles.statusContent}>
//                 {loading ? (
//                   <>
//                     <ActivityIndicator size="small" color="#4A90E2" />
//                     <CustomeText color="rgba(255,255,255,0.6)" fontSize={13}>
//                       Generating secure QR code...
//                     </CustomeText>
//                   </>
//                 ) : (
//                   <>
//                     <View style={styles.pulseDot} />
//                     <CustomeText color="rgba(255,255,255,0.8)" fontSize={13}>
//                       Ready to scan • Waiting for connection
//                     </CustomeText>
//                   </>
//                 )}
//               </View>
//             </View>

//             {/* Instruction */}
//             <View style={styles.instruction}>
//               <CustomeText color="rgba(255,255,255,0.4)" fontSize={12}>
//                 Ask sender to scan this code with their device
//               </CustomeText>
//             </View>
//           </Animated.View>
//         </View>
//       </LinearGradient>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     // backgroundColor: 'rgba(0,0,0,0.95)',
//   },
//   gradientBackground: {
//     flex: 1,
//   },
//   container: {
//     flex: 1,
//     paddingHorizontal: 20,
//     paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 20,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingVertical: 16,
//   },
//   closeButton: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   qrSection: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginVertical: 20,
//   },
//   ringsContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   outerRing: {
//     position: 'absolute',
//     width: width * 0.8,
//     height: width * 0.8,
//     borderRadius: width * 0.4,
//     overflow: 'hidden',
//   },
//   innerRing: {
//     position: 'absolute',
//     width: width * 0.65,
//     height: width * 0.65,
//     borderRadius: width * 0.325,
//     overflow: 'hidden',
//   },
//   ringGradient: {
//     flex: 1,
//   },
//   qrContainer: {
//     width: 200,
//     height: 200,
//     borderRadius: 30,
//     overflow: 'hidden',
//     backgroundColor: '#fff',
//     justifyContent: 'center',
//     alignItems: 'center',
//     elevation: 20,
//     shadowColor: '#4A90E2',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.3,
//     shadowRadius: 20,
//     zIndex: 10,
//   },
//   skeleton: {
//     width: '100%',
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#1a1a1a',
//     position: 'relative',
//   },
//   shimmerOverlay: {
//     position: 'absolute',
//     width: '100%',
//     height: '100%',
//   },
//   qrIconContainer: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     backgroundColor: 'rgba(74,144,226,0.1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   qrWrapper: {
//     position: 'relative',
//   },
//   qrCheckmark: {
//     position: 'absolute',
//     bottom: -5,
//     right: -5,
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     backgroundColor: '#4A90E2',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   checkmarkDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#fff',
//   },
//   deviceCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 20,
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 30,
//     gap: 10,
//   },
//   activeDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#4CAF50',
//     marginLeft: 5,
//   },
//   infoGrid: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 12,
//     marginTop: 30,
//   },
//   infoCard: {
//     borderRadius: 16,
//     overflow: 'hidden',
//     flex: 1,
//   },
//   infoCardGradient: {
//     padding: 12,
//     alignItems: 'center',
//     gap: 6,
//   },
//   statusBar: {
//     marginTop: 30,
//     alignItems: 'center',
//   },
//   statusContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     backgroundColor: 'rgba(255,255,255,0.05)',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 30,
//   },
//   pulseDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#4CAF50',
//   },
//   instruction: {
//     position: 'absolute',
//     bottom: 80,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//   },
// });

const QRGenerateModal = ({ visible, onClose }) => {
  const { startServer, server, isConnected } = useTCP();
  const [loading, setLoading] = useState(true);
  const [qrValue, setQRValue] = useState('');

  // Animation values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);
  const pulseAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const shimmerAnim = useSharedValue(-width);
  const glowAnim = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 400 });
      scaleAnim.value = withTiming(1, { duration: 400 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
      scaleAnim.value = withTiming(0.95, { duration: 300 });
    }

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    rotateAnim.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(width, { duration: 1500, easing: Easing.linear }),
        withDelay(500, withTiming(-width, { duration: 0 })),
      ),
      -1,
    );
  }, [visible]);

  const setupServer = async () => {
    try {
      const deviceName = await DeviceInfo.getDeviceName();
      const ip = await getLocalIPAddress();
      const port = 4000;

      if (server) {
        setQRValue(`tcp://${ip}:${port}|${deviceName}`);
        setLoading(false);
        return;
      }

      startServer(port);
      setQRValue(`tcp://${ip}:${port}|${deviceName}`);
      console.log(`Server Info: ${ip}:${port}`);
      setLoading(false);
    } catch (error) {
      console.error('Error setting up server:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      onClose();
      navigate('ConnectionScreen');
    }
  }, [isConnected]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setupServer();
    } else {
      setQRValue('');
    }
  }, [visible]);

  // Calculate responsive sizes
  const ringSize = width * 0.65;
  const qrSize = 180;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />

      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[styles.container, containerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <CustomeText fontFamily="Okra-Bold" color="#fff" fontSize={24}>
                QR Code
              </CustomeText>
              <View style={styles.headerLine} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.closeButtonGradient}
              >
                <Icon
                  name="close"
                  iconFamily="Ionicons"
                  size={22}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* QR Code Section - Centered */}
          <View style={styles.qrSection}>
            {/* Glow effect - behind rings */}
            <Animated.View
              style={[
                styles.glowEffect,
                glowStyle,
                {
                  width: ringSize * 1.1,
                  height: ringSize * 1.1,
                  borderRadius: ringSize * 0.6,
                  marginTop: -80,
                },
              ]}
            />

            {/* Rings Container */}
            <View
              style={[
                styles.ringsContainer,
                { width: ringSize, height: ringSize },
              ]}
            >
              {/* Outer rotating ring */}
              <Animated.View
                style={[styles.outerRing, ringStyle, StyleSheet.absoluteFill]}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2', '#6b8cff']}
                  style={styles.ringGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {/* Middle ring with particles */}
              <View style={[styles.middleRing, StyleSheet.absoluteFill]}>
                {[...Array(8)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ringParticle,
                      {
                        transform: [
                          { rotate: `${i * 45}deg` },
                          { translateY: -(ringSize * 0.35) },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Inner pulsing ring */}
              <Animated.View
                style={[
                  styles.innerRing,
                  pulseStyle,
                  {
                    width: ringSize * 0.75,
                    height: ringSize * 0.75,
                    borderRadius: ringSize * 0.375,
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(102,126,234,0.3)', 'rgba(118,75,162,0.3)']}
                  style={styles.ringGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {/* QR Code Container */}
              <View
                style={[styles.qrContainer, { width: qrSize, height: qrSize }]}
              >
                {loading || !qrValue ? (
                  <View style={styles.skeleton}>
                    <Animated.View
                      style={[styles.shimmerOverlay, shimmerStyle]}
                    >
                      <LinearGradient
                        colors={[
                          'transparent',
                          'rgba(255,255,255,0.2)',
                          'transparent',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>

                    <Animated.View style={[styles.loadingIcon, pulseStyle]}>
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.loadingIconGradient}
                      >
                        <Icon
                          name="qrcode-scan"
                          iconFamily="MaterialCommunityIcons"
                          size={40}
                          color="#fff"
                        />
                      </LinearGradient>
                    </Animated.View>
                  </View>
                ) : (
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrValue}
                      size={qrSize - 20}
                      // logo={require('../../assets/images/profile2.jpg')}
                      // logoSize={40}
                      logoBackgroundColor="#fff"
                      logoBorderRadius={20}
                      logoMargin={2}
                      color="#2d3748"
                      backgroundColor="#fff"
                    />

                    {/* Decorative corners */}
                    <View
                      style={[
                        styles.qrCorner,
                        styles.cornerTL,
                        { left: -3, top: -3 },
                      ]}
                    />
                    <View
                      style={[
                        styles.qrCorner,
                        styles.cornerTR,
                        { right: -3, top: -3 },
                      ]}
                    />
                    <View
                      style={[
                        styles.qrCorner,
                        styles.cornerBL,
                        { left: -3, bottom: -3 },
                      ]}
                    />
                    <View
                      style={[
                        styles.qrCorner,
                        styles.cornerBR,
                        { right: -3, bottom: -3 },
                      ]}
                    />

                    {/* Success checkmark */}
                    <View style={[styles.qrBadge, { bottom: -5, right: -5 }]}>
                      <LinearGradient
                        colors={['#4CAF50', '#45a049']}
                        style={styles.qrBadgeGradient}
                      >
                        <Icon
                          name="checkmark"
                          iconFamily="Ionicons"
                          size={10}
                          color="#fff"
                        />
                      </LinearGradient>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Device Info */}
            {!loading && qrValue && (
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.deviceCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.deviceIcon}>
                  <Icon
                    name="phone-portrait"
                    iconFamily="Ionicons"
                    size={14}
                    color="#667eea"
                  />
                </View>
                <CustomeText
                  color="#fff"
                  fontSize={13}
                  fontFamily="Okra-Medium"
                  numberOfLines={1}
                >
                  {qrValue?.split('|')[1]?.substring(0, 18) || 'Your Device'}
                </CustomeText>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <CustomeText color="#4CAF50" fontSize={9}>
                    LIVE
                  </CustomeText>
                </View>
              </LinearGradient>
            )}
          </View>

          {/* Stats Grid - Simplified */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.statIcon}
              >
                <Icon
                  name="wifi"
                  iconFamily="Ionicons"
                  size={16}
                  color="#fff"
                />
              </LinearGradient>
              <View>
                <CustomeText color="#fff" fontSize={12} fontFamily="Okra-Bold">
                  Network
                </CustomeText>
                <CustomeText color="rgba(255,255,255,0.5)" fontSize={8}>
                  Same Wi-Fi
                </CustomeText>
              </View>
            </View>

            <View style={styles.statItem}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.statIcon}
              >
                <Icon
                  name="shield-checkmark"
                  iconFamily="Ionicons"
                  size={16}
                  color="#fff"
                />
              </LinearGradient>
              <View>
                <CustomeText color="#fff" fontSize={12} fontFamily="Okra-Bold">
                  Secure
                </CustomeText>
                <CustomeText color="rgba(255,255,255,0.5)" fontSize={8}>
                  End-to-end
                </CustomeText>
              </View>
            </View>

            <View style={styles.statItem}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.statIcon}
              >
                <Icon
                  name="flash"
                  iconFamily="Ionicons"
                  size={16}
                  color="#fff"
                />
              </LinearGradient>
              <View>
                <CustomeText color="#fff" fontSize={12} fontFamily="Okra-Bold">
                  Speed
                </CustomeText>
                <CustomeText color="rgba(255,255,255,0.5)" fontSize={8}>
                  Instant
                </CustomeText>
              </View>
            </View>
          </View>

          {/* Status Bar */}
          <View style={styles.statusBar}>
            <LinearGradient
              colors={['rgba(102,126,234,0.2)', 'rgba(118,75,162,0.2)']}
              style={styles.statusGradient}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#667eea" />
                  <CustomeText color="rgba(255,255,255,0.8)" fontSize={12}>
                    Generating...
                  </CustomeText>
                </>
              ) : (
                <>
                  <View style={styles.scanningPulse}>
                    <View style={[styles.ripple, { width: 20, height: 20 }]} />
                    <View style={[styles.ripple, { width: 28, height: 28 }]} />
                    <View style={[styles.ripple, { width: 36, height: 36 }]} />
                    <View style={styles.activePulse} />
                  </View>
                  <CustomeText
                    color="#fff"
                    fontSize={12}
                    fontFamily="Okra-Medium"
                  >
                    Ready to scan
                  </CustomeText>
                </>
              )}
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <CustomeText color="rgba(255,255,255,0.5)" fontSize={10}>
              Show this code to the sender
            </CustomeText>
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLine: {
    width: 30,
    height: 2,
    backgroundColor: '#667eea',
    borderRadius: 1,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  glowEffect: {
    position: 'absolute',
    backgroundColor: '#667eea',
    opacity: 0.15,
  },
  ringsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRing: {
    borderRadius: 1000,
    overflow: 'hidden',
  },
  middleRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#667eea',
    opacity: 0.6,
  },
  innerRing: {
    position: 'absolute',
    overflow: 'hidden',
  },
  ringGradient: {
    flex: 1,
  },
  qrContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    zIndex: 10,
  },
  skeleton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
  },
  loadingIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#667eea',
    borderWidth: 2,
  },
  cornerTL: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  qrBadge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  qrBadgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    maxWidth: width * 0.7,
  },
  deviceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(102,126,234,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4CAF50',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50,
    paddingHorizontal: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    marginTop: 15,
    alignItems: 'center',
  },
  statusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  scanningPulse: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    position: 'absolute',
  },
  ripple: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default QRGenerateModal;
