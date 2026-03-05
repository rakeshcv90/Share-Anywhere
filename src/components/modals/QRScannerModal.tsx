// import {
//   View,
//   Text,
//   Modal,
//   ActivityIndicator,
//   TouchableOpacity,
//   Image,
// } from 'react-native';
// import React, { useEffect, useState, useMemo, FC } from 'react';
// import { modalStyles } from '../../styles/modalStyles';
// import Animated, {
//   Easing,
//   useSharedValue,
//   useAnimatedStyle,
//   withRepeat,
//   withTiming,
// } from 'react-native-reanimated';
// import LinearGradient from 'react-native-linear-gradient';

// import CustomeText from '../global/CustomeText';
// import Icon from '../global/Icon';
// import {
//   Camera,
//   useCameraDevice,
//   CodeScanner,
// } from 'react-native-vision-camera';
// import { useTCP } from '../../service/TCPProvider';
// import { navigate } from '../../utils/NavigationUtil';
// import { AppState } from 'react-native';

// interface ModalProps{
//   visible:boolean;
//   onClose:()=>void;
// }
// const QRScannerModal:FC<ModalProps> = ({ visible, onClose }) => {
//   const { isConnected, connectToServer } = useTCP();
//   const [loading, setLoading] = useState(true);
//   const [codeFound, setCodeFOund] = useState(false);
//   const [hasPermission, setHasPermission] = useState(false);
//   const device = useCameraDevice('back');
//   const shimmerTranslateX = useSharedValue(-300);
//   const shimmerStyle = useAnimatedStyle(() => ({
//     transform: [{ translateX: shimmerTranslateX.value }],
//   }));
//   useEffect(() => {
//     shimmerTranslateX.value = withRepeat(
//       withTiming(300, { duration: 1500, easing: Easing.linear }),
//       -1,
//       false,
//     );
//   }, [shimmerTranslateX]);

//   useEffect(() => {
//     let mounted = true;

//     const checkPermission = async () => {
//       if (AppState.currentState !== 'active') return;

//       const status = await Camera.getCameraPermissionStatus();

//       if (!mounted) return;

//       if (status === 'granted') {
//         setHasPermission(true);
//       } else {
//         const result = await Camera.requestCameraPermission();
//         if (mounted) {
//           setHasPermission(result === 'granted');
//         }
//       }
//     };

//     checkPermission();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   useEffect(() => {
//     if (!visible) return;

//     setLoading(true);
//     const timer = setTimeout(() => setLoading(false), 400);

//     return () => clearTimeout(timer);
//   }, [visible]);

//   const handleScan = (data:any) => {
//     const [connectionData, deviceName] = data?.replace('tcp://', '').split('|');

//     const [host, port] = connectionData?.split(':');

//     connectToServer(host, parseInt(port, 10), deviceName);
//   };

//   const codeScanner = useMemo(
//     () => ({
//       codeTypes: ['qr', 'codabar'],
//       onCodeScanned: (codes:any) => {
//         if (codeFound) {
//           return;
//         }

//         if (codes?.length > 0) {
//           const scannedData = codes[0].value;
//           console.log(scannedData);
//           setCodeFOund(true);
//           handleScan(scannedData);
//         }
//       },
//     }),
//     [codeFound],
//   );
//   useEffect(() => {
//     if (isConnected) {
//       onClose();
//       navigate('ConnectionScreen');
//     }
//   }, [isConnected]);

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
//           {loading ? (
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
//               {!device || !hasPermission ? (
//                 <View style={modalStyles.skeleton}>
//                   <Image
//                     source={require('../../assets/images/no_camera.png')}
//                     style={modalStyles.noCameraImage}
//                   />
//                 </View>
//               ) : (
//                 <View style={modalStyles.skeleton}>
//                   <Camera
//                     style={modalStyles.camera}
//                     isActive={visible && hasPermission}
//                     device={device}
//                     codeScanner={codeScanner}
//                   />
//                 </View>
//               )}
//             </>
//           )}
//         </View>
//         <View style={modalStyles.info}>
//           <CustomeText style={modalStyles.infoText1} fontFamily="Okra-Medium">
//             Ensure you're on the same Wi-Fi network.
//           </CustomeText>

//           <CustomeText style={modalStyles.infoText2} fontFamily="Okra-Medium">
//             Ask the receiver to showa QR code to connect and transfer files.
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

// export default QRScannerModal;

import {
  View,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
} from 'react-native';
import React, { useEffect, useState, useMemo, useRef } from 'react';

import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

import CustomeText from '../global/CustomeText';
import Icon from '../global/Icon';
import {
  Camera,
  useCameraDevice,
  CodeScanner,
} from 'react-native-vision-camera';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';
import { AppState } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

const QRScannerModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  const { isConnected, connectToServer } = useTCP();
  const [loading, setLoading] = useState(true);
  const [codeFound, setCodeFound] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  const scanLineY = useSharedValue(0);
  const cornerScale = useSharedValue(1);
  const cornerOpacity = useSharedValue(1);
  const fadeAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const shimmerAnim = useSharedValue(-300);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(200, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    cornerScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    cornerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    rotateAnim.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
    );

    shimmerAnim.value = withRepeat(
      withTiming(300, { duration: 1500, easing: Easing.linear }),
      -1,
    );

    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 500 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      if (AppState.currentState !== 'active') return;

      const status = await Camera.getCameraPermissionStatus();

      if (!mounted) return;

      if (status === 'granted') {
        setHasPermission(true);
      } else {
        const result = await Camera.requestCameraPermission();
        if (mounted) {
          setHasPermission(result === 'granted');
        }
      }
    };

    checkPermission();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    setCodeFound(false);
    const timer = setTimeout(() => setLoading(false), 800);

    return () => clearTimeout(timer);
  }, [visible]);

  const handleScan = (data: any) => {
    const [connectionData, deviceName] = data?.replace('tcp://', '').split('|');
    const [host, port] = connectionData?.split(':');
    connectToServer(host, parseInt(port, 10), deviceName);
  };

  const codeScanner = useMemo(
    () => ({
      codeTypes: ['qr', 'codabar'],
      onCodeScanned: (codes: any) => {
        if (codeFound) return;
        if (codes?.length > 0) {
          const scannedData = codes[0].value;
          console.log(scannedData);
          setCodeFound(true);
          handleScan(scannedData);
        }
      },
    }),
    [codeFound],
  );

  useEffect(() => {
    if (isConnected) {
      onClose();
      navigate('ConnectionScreen');
    }
  }, [isConnected]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const cornerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cornerScale.value }],
    opacity: cornerOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerAnim.value }],
  }));

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />

      <LinearGradient
        colors={[
          'rgba(0,0,0,0.95)',
          'rgba(0,20,40,0.98)',
          'rgba(0,40,80,0.95)',
        ]}
        style={modalStyles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={[modalStyles.container, containerStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'transparent']}
            style={modalStyles.headerGradient}
          >
            <View style={modalStyles.header}>
              <CustomeText fontFamily="Okra-Bold" color="#fff" fontSize={22}>
                Scan QR Code
              </CustomeText>
              <TouchableOpacity
                onPress={onClose}
                style={modalStyles.closeButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={modalStyles.closeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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
          </LinearGradient>

          <View style={modalStyles.cameraSection}>
            <Animated.View style={[modalStyles.outerRing, rotateStyle]}>
              <LinearGradient
                colors={['#00E5FF', '#0072FF', '#00E5FF']}
                style={modalStyles.ringGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <Animated.View style={[modalStyles.innerRing, pulseStyle]}>
              <LinearGradient
                colors={['rgba(0,229,255,0.3)', 'rgba(0,114,255,0.3)']}
                style={modalStyles.ringGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <View style={modalStyles.cameraContainer}>
              {loading ? (
                <View style={modalStyles.skeleton}>
                  <Animated.View
                    style={[modalStyles.shimmerOverlay, shimmerStyle]}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.05)',
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.05)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    />
                  </Animated.View>

                  <Animated.View style={pulseStyle}>
                    <LinearGradient
                      colors={['#00E5FF', '#0072FF']}
                      style={modalStyles.cameraIconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon
                        name="camera"
                        iconFamily="Ionicons"
                        size={40}
                        color="#fff"
                      />
                    </LinearGradient>
                  </Animated.View>
                </View>
              ) : (
                <>
                  {!device || !hasPermission ? (
                    <View style={modalStyles.noCameraContainer}>
                      <LinearGradient
                        colors={[
                          'rgba(255,255,255,0.1)',
                          'rgba(255,255,255,0.05)',
                        ]}
                        style={modalStyles.noCameraGradient}
                      >
                        <Image
                          source={require('../../assets/images/no_camera.png')}
                          style={modalStyles.noCameraImage}
                        />
                        <CustomeText
                          color="rgba(255,255,255,0.7)"
                          fontSize={14}
                        >
                          Camera not available
                        </CustomeText>
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={modalStyles.cameraWrapper}>
                      <Camera
                        style={modalStyles.camera}
                        isActive={visible && hasPermission}
                        device={device}
                        codeScanner={codeScanner}
                      />

                      <View style={modalStyles.scanOverlay}>
                        <LinearGradient
                          colors={[
                            'rgba(0,0,0,0.4)',
                            'transparent',
                            'rgba(0,0,0,0.4)',
                          ]}
                          style={modalStyles.vignette}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                        />

                        <View style={modalStyles.cornersContainer}></View>

                        <Animated.View
                          style={[modalStyles.scanLine, scanLineStyle]}
                        >
                          <LinearGradient
                            colors={[
                              'transparent',
                              '#00E5FF',
                              '#0072FF',
                              '#00E5FF',
                              'transparent',
                            ]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={modalStyles.scanLineGradient}
                          />
                        </Animated.View>

                        <Animated.View
                          style={[modalStyles.centerDot, pulseStyle]}
                        >
                          <LinearGradient
                            colors={['#00E5FF', '#0072FF']}
                            style={modalStyles.centerDotGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          />
                        </Animated.View>

                        <LinearGradient
                          colors={['rgba(0,0,0,0.6)', 'rgba(0,20,40,0.8)']}
                          style={modalStyles.scanInstruction}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <CustomeText
                            color="#fff"
                            fontSize={12}
                            fontFamily="Okra-Medium"
                          >
                            Position QR code within frame
                          </CustomeText>
                        </LinearGradient>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={modalStyles.infoContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={modalStyles.infoIcon}>
              <LinearGradient
                colors={['#00E5FF', '#0072FF']}
                style={modalStyles.infoIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon
                  name="wifi"
                  iconFamily="Ionicons"
                  size={20}
                  color="#fff"
                />
              </LinearGradient>
            </View>
            <View style={modalStyles.infoTextContainer}>
              <CustomeText color="#fff" fontSize={14} fontFamily="Okra-Bold">
                Same Wi-Fi Network Required
              </CustomeText>
              <CustomeText
                color="rgba(255,255,255,0.6)"
                fontSize={12}
                fontFamily="Okra-Medium"
              >
                Make sure both devices are on the same network
              </CustomeText>
            </View>
          </LinearGradient>

          {codeFound ? (
            <Animated.View style={[modalStyles.statusContainer, pulseStyle]}>
              <LinearGradient
                colors={['#4CAF50', '#45A049']}
                style={modalStyles.statusBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon
                  name="checkmark-circle"
                  iconFamily="Ionicons"
                  size={20}
                  color="#fff"
                />
                <CustomeText color="#fff" fontSize={14} fontFamily="Okra-Bold">
                  Code Scanned! Connecting...
                </CustomeText>
              </LinearGradient>
            </Animated.View>
          ) : (
            <View style={modalStyles.loadingContainer}>
              <CustomeText
                color="rgba(255,255,255,0.6)"
                fontSize={12}
                style={modalStyles.scanningText}
              >
                Scanning for QR code...
              </CustomeText>
            </View>
          )}

          {/* Help Text */}
          <View style={modalStyles.helpContainer}>
            <CustomeText color="rgba(255,255,255,0.3)" fontSize={11}>
              Ask the receiver to show their QR code
            </CustomeText>
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

export default QRScannerModal;

const modalStyles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    overflow: 'hidden',
    zIndex: 1,
  },
  innerRing: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    overflow: 'hidden',
    zIndex: 2,
  },
  ringGradient: {
    flex: 1,
  },
  cameraContainer: {
    width: width - 40,
    height: width - 40,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 3,
  },
  skeleton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  shimmerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cameraIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  noCameraGradient: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
  },
  noCameraImage: {
    width: 80,
    height: 80,
    tintColor: 'rgba(255,255,255,0.5)',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornersContainer: {
    width: '80%',
    height: '80%',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    borderTopLeftRadius: 20,
    overflow: 'hidden',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 50,
    height: 50,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 50,
    height: 50,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  cornerGradient: {
    flex: 1,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 4,
    left: 0,
  },
  scanLineGradient: {
    flex: 1,
  },
  centerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  centerDotGradient: {
    flex: 1,
  },
  scanInstruction: {
    position: 'absolute',
    bottom: -40,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    overflow: 'hidden',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    padding: 16,
    borderRadius: 20,
    gap: 12,
    overflow: 'hidden',
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  infoIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
    gap: 2,
  },
  statusContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    overflow: 'hidden',
  },
  loadingContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningText: {
    marginLeft: 4,
  },
  helpContainer: {
    marginTop: 16,
    alignItems: 'center',
    paddingBottom: 20,
  },
  scanArea: {
    width: '80%',
    height: '80%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
