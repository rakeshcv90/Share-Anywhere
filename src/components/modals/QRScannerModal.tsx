import {
  View,
  Animated,
  Easing,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import React, { useEffect, useState, useMemo, useRef } from 'react';
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

const isTablet = width > 600;

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

  const scanLineY = useRef(new Animated.Value(0)).current;
  const cornerScale = useRef(new Animated.Value(1)).current;
  const cornerOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-300)).current;

  const animsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const scanLine = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineY, {
            toValue: 200,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineY, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      const cornerS = Animated.loop(
        Animated.sequence([
          Animated.timing(cornerScale, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(cornerScale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      const cornerO = Animated.loop(
        Animated.sequence([
          Animated.timing(cornerOpacity, {
            toValue: 0.7,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(cornerOpacity, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
      );

      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      const shimmer = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 300,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      scanLine.start();
      cornerS.start();
      cornerO.start();
      pulse.start();
      rotate.start();
      shimmer.start();

      animsRef.current = [scanLine, cornerS, cornerO, pulse, rotate, shimmer];
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        animsRef.current.forEach(anim => anim.stop());
        animsRef.current = [];
      });
    }

    return () => {
      animsRef.current.forEach(anim => anim.stop());
    };
  }, [visible]);

  // Imperatively manage StatusBar to avoid Fabric view-recycling crash on iOS
  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('rgba(0,0,0,0.8)', true);
      }
    } else {
      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#1B2B4B', true);
      }
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
    // Only process barcodes that match our app's tcp://host:port|deviceName format
    if (!data?.startsWith('tcp://')) {
      // Not our QR code — reset so the scanner can try again
      setCodeFound(false);
      return;
    }

    const [connectionData, deviceName] = data.replace('tcp://', '').split('|');
    if (!connectionData || !deviceName) {
      setCodeFound(false);
      return;
    }

    const [host, portStr] = connectionData.split(':');
    const port = parseInt(portStr, 10);

    // Guard against malformed host/port which would crash TcpSocket
    if (!host || isNaN(port)) {
      setCodeFound(false);
      return;
    }

    connectToServer(host, port, deviceName);
  };

  const codeScanner = useMemo(
    () => ({
      codeTypes: ['qr'] as import('react-native-vision-camera').CodeType[],
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.95)',
            'rgba(0,20,40,0.98)',
            'rgba(0,40,80,0.95)',
          ]}
          style={[modalStyles.gradientBackground, StyleSheet.absoluteFill]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={[modalStyles.container, { opacity: fadeAnim }]}>
            <View style={modalStyles.headerGradient}>
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
            </View>

            <View style={modalStyles.cameraSection}>
              <Animated.View
                style={[
                  modalStyles.outerRing,
                  {
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#00E5FF', '#0072FF', '#00E5FF']}
                  style={[
                    modalStyles.ringGradient,
                    { borderRadius: Dimensions.get('window').width * 0.4 },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              <Animated.View
                style={[
                  modalStyles.innerRing,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <LinearGradient
                  colors={['rgba(0,229,255,0.3)', 'rgba(0,114,255,0.3)']}
                  style={[
                    modalStyles.ringGradient,
                    { borderRadius: Dimensions.get('window').width * 0.375 },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              <View style={modalStyles.cameraContainer}>
                {loading ? (
                  <View style={modalStyles.skeleton}>
                    <Animated.View
                      style={[
                        modalStyles.shimmerOverlay,
                        { transform: [{ translateX: shimmerAnim }] },
                      ]}
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

                    <Animated.View
                      style={{ transform: [{ scale: pulseAnim }] }}
                    >
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
                            style={[
                              modalStyles.scanLine,
                              { transform: [{ translateY: scanLineY }] },
                            ]}
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
                            style={[
                              modalStyles.centerDot,
                              { transform: [{ scale: pulseAnim }] },
                            ]}
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
              <View style={[modalStyles.infoContainer, { padding: 10 }]}></View>
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
              <Animated.View
                style={[
                  modalStyles.statusContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
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
                  <CustomeText
                    color="#fff"
                    fontSize={14}
                    fontFamily="Okra-Bold"
                  >
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
      </Animated.View>
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
    marginVertical: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerGradient: {
    paddingTop: isTablet ? 40 : 20,
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
    zIndex: 1,
  },
  innerRing: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
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
