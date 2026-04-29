import {
  View,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
  AppState,
  AppStateStatus,
  Alert,
  Linking,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import React, { useEffect, useState, useMemo, useCallback } from 'react';

import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

import CustomeText from '../global/CustomeText';
import Icon from '../global/Icon';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';
import { useTheme } from '../../context/ThemeContext';
import { moderateScale } from 'react-native-size-matters';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

// 📏 Smart Scaling Constants
const IS_SMALL_DEVICE = SCREEN_H < 700;
const CAMERA_SIZE_BASE = IS_SMALL_DEVICE ? SCREEN_W - 140 : SCREEN_W - 100;
const CARD_WIDTH = SCREEN_W - 20;
const CARD_HEIGHT = SCREEN_H * 0.88;

const QRScannerModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { isConnected, connectToServer } = useTCP();

  const [loading, setLoading] = useState(true);
  const [codeFound, setCodeFound] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  const cameraSize = Math.round(moderateScale(CAMERA_SIZE_BASE));

  // 🔄 Reanimated Shared Values
  const scanLineY = useSharedValue(0);
  const cornerScale = useSharedValue(1);
  const cornerOpacity = useSharedValue(1);
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.92);
  const pulseAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);
  const shimmerAnim = useSharedValue(-300);

  // 📱 App States
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  const [isCameraMounted, setIsCameraMounted] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 500 });
      scaleAnim.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.back(1.0)),
      });

      scanLineY.value = withRepeat(
        withSequence(
          withTiming(cameraSize * 0.75, {
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      cornerScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.12, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      rotateAnim.value = withRepeat(
        withTiming(360, { duration: 12000, easing: Easing.linear }),
        -1,
      );

      shimmerAnim.value = withRepeat(
        withTiming(300, { duration: 1500, easing: Easing.linear }),
        -1,
      );
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
      scaleAnim.value = withTiming(0.92, { duration: 300 });
    }
  }, [visible, cameraSize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const checkPermission = async () => {
    if (AppState.currentState !== 'active' && Platform.OS === 'ios') return;
    const status = await Camera.getCameraPermissionStatus();

    if (status === 'granted') {
      setHasPermission(true);
      return;
    }

    if (status === 'not-determined') {
      const result = await Camera.requestCameraPermission();
      setHasPermission(result === 'granted');
      return;
    }

    if (status === 'denied' || status === 'restricted') {
      // On Android, if it's denied, it might still allow requesting.
      // (System will show rationale or the dialog again unless truly "Don't ask again")
      if (Platform.OS === 'android' && status === 'denied') {
        const result = await Camera.requestCameraPermission();
        if (result === 'granted') {
          setHasPermission(true);
          return;
        }
      }

      Alert.alert(
        'Camera Permission',
        'Camera access was previously denied. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  useEffect(() => {
    if (visible && appState === 'active') checkPermission();
  }, [visible, appState]);

  useEffect(() => {
    if (!visible) {
      setIsCameraMounted(false);
      setIsLayoutReady(false);
      return;
    }
    setLoading(true);
    setCodeFound(false);
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setIsCameraMounted(true), 400);
    }, 800);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleScan = (data: any) => {
    if (!data?.startsWith('tcp://')) return;
    const [connectionData, deviceName] = data?.replace('tcp://', '').split('|');
    const [host, port] = connectionData?.split(':');
    if (!host || !port) return;
    connectToServer(host, parseInt(port, 10), deviceName);
  };

  // const codeScanner = useCodeScanner({
  //   codeTypes: ['qr'],
  //   onCodeScanned: (codes: any) => {
  //     if (codeFound) return;
  //     if (codes?.length > 0) {
  //       const scannedData = codes[0].value;
  //       if (scannedData) {
  //         runOnJS(setCodeFound)(true);
  //         runOnJS(handleScan)(scannedData);
  //       }
  //     }
  //   },
  // });
  const codeScanner = useMemo(() => {
    return {
      codeTypes: ['qr'],
      onCodeScanned: codes => {
        if (codeFound) return;
        if (codes?.length > 0) {
          const scannedData = codes[0].value;
          if (scannedData) {
            runOnJS(setCodeFound)(true);
            runOnJS(handleScan)(scannedData);
          }
        }
      },
    };
  }, [codeFound]);
  useEffect(() => {
    if (isConnected && visible) {
      onClose();
      setTimeout(() => navigate('ConnectionScreen'), 350);
    }
  }, [isConnected, onClose, visible]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const masterCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
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

  const isCameraActive = useMemo(() => {
    return (
      visible &&
      hasPermission &&
      !codeFound &&
      appState === 'active' &&
      isCameraMounted &&
      isLayoutReady
    );
  }, [
    visible,
    hasPermission,
    codeFound,
    appState,
    isCameraMounted,
    isLayoutReady,
  ]);

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, containerStyle]}
          >
            <LinearGradient
              colors={colors.gradientBg}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        </TouchableWithoutFeedback>

        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.masterCard,
              masterCardStyle,
              {
                backgroundColor: isDark ? colors.background : '#FFFFFF',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(0,114,255,0.15)',
                shadowColor: isDark ? '#00E5FF' : '#0072FF',
                shadowOpacity:
                  Platform.OS === 'ios' ? (isDark ? 0.3 : 0.2) : 0.3,
              },
            ]}
          >
            {/* Background Texture */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
                  : ['rgba(255,255,255,1)', 'rgba(255,255,255,0.8)']
              }
              style={StyleSheet.absoluteFill}
            />

            <ScrollView
              style={{ flex: 1 }}
              bounces={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <StatusBar
                backgroundColor="transparent"
                barStyle={colors.statusBarStyle}
                translucent
              />

              <View style={styles.header}>
                <View>
                  <CustomeText
                    fontFamily="Okra-Bold"
                    color={colors.text}
                    fontSize={moderateScale(21)}
                  >
                    Scan QR Code
                  </CustomeText>
                  <View style={styles.neonSubline} />
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    {
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,114,255,0.15)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="close"
                    iconFamily="Ionicons"
                    size={22}
                    color={isDark ? colors.icon : '#0072FF'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cameraSection}>
                <View
                  style={[
                    styles.cameraContainer,
                    {
                      width: cameraSize,
                      height: cameraSize,
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,114,255,0.15)',
                      shadowColor: isDark ? '#00E5FF' : '#0072FF',
                    },
                  ]}
                  onLayout={e => {
                    const { width, height } = e.nativeEvent.layout;
                    if (width > 0 && height > 0) setIsLayoutReady(true);
                  }}
                >
                  {loading ? (
                    <View style={styles.skeleton}>
                      <Animated.View
                        style={[styles.shimmerOverlay, shimmerStyle]}
                      >
                        <LinearGradient
                          colors={[
                            'transparent',
                            isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,114,255,0.03)',
                            'transparent',
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ flex: 1 }}
                        />
                      </Animated.View>
                      <ActivityIndicator size="large" color="#00E5FF" />
                    </View>
                  ) : (
                    <View style={styles.cameraWrapper}>
                      {!device || !hasPermission ? (
                        <View style={styles.noCameraContainer}>
                          <CustomeText color={colors.subtext} fontSize={13}>
                            Camera Permission Required
                          </CustomeText>
                          <TouchableOpacity
                            onPress={checkPermission}
                            style={styles.retryBtn}
                          >
                            <CustomeText
                              color="#0072FF"
                              fontSize={13}
                              fontFamily="Okra-Bold"
                            >
                              Grant Access
                            </CustomeText>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.liveCameraWrap}>
                          {isCameraMounted && (
                            <Camera
                              style={StyleSheet.absoluteFill}
                              isActive={isCameraActive}
                              device={device}
                              codeScanner={codeScanner}
                              enableZoomGesture={false}
                            />
                          )}
                          <View style={styles.scanOverlay}>
                            <View
                              style={[
                                styles.vignette,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(0,0,0,0.1)'
                                    : 'rgba(255,255,255,0.02)',
                                },
                              ]}
                            />
                            <Animated.View
                              style={[styles.focusCorners, cornerStyle]}
                            >
                              <View style={[styles.corner, styles.tl]} />
                              <View style={[styles.corner, styles.tr]} />
                              <View style={[styles.corner, styles.bl]} />
                              <View style={[styles.corner, styles.br]} />
                            </Animated.View>
                            <Animated.View
                              style={[styles.scanLine, scanLineStyle]}
                            >
                              <LinearGradient
                                colors={[
                                  'transparent',
                                  '#00E5FF',
                                  'transparent',
                                ]}
                                style={{ flex: 1 }}
                              />
                            </Animated.View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.04)']
                    : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']
                }
                style={[
                  styles.infoCard,
                  {
                    marginTop: IS_SMALL_DEVICE ? 20 : 35,
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(0,114,255,0.15)',
                    shadowColor: isDark ? '#00E5FF' : '#0072FF',
                  },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View
                  style={{
                    padding: 16,

                    flexDirection: 'row',

                    alignItems: 'center',
                  }}
                >
                  <View style={styles.infoIconBox}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: 'rgba(0, 198, 255, 1)',
                        },
                      ]}
                    >
                      <Icon
                        name="wifi"
                        iconFamily="Ionicons"
                        size={18}
                        color="#fff"
                      />
                    </View>
                  </View>
                  <View style={styles.infoTextContainer}>
                    <CustomeText
                      color={colors.text}
                      fontSize={15}
                      fontFamily="Okra-Bold"
                    >
                      Local Connection
                    </CustomeText>
                    <CustomeText
                      color={isDark ? colors.subtext : '#444'}
                      fontSize={12}
                      fontFamily="Okra-Medium"
                    >
                      Same network for high speed.
                    </CustomeText>
                  </View>
                </View>
              </LinearGradient>

              <View
                style={[
                  styles.statusSection,
                  { marginTop: IS_SMALL_DEVICE ? 20 : 30 },
                ]}
              >
                {codeFound ? (
                  <Animated.View
                    style={[
                      styles.statusBadge,
                      styles.badgeSuccess,
                      pulseStyle,
                    ]}
                  >
                    <Icon
                      name="checkmark-circle"
                      iconFamily="Ionicons"
                      size={18}
                      color="#fff"
                    />
                    <CustomeText
                      color="#fff"
                      fontSize={13}
                      fontFamily="Okra-Bold"
                    >
                      Success!
                    </CustomeText>
                  </Animated.View>
                ) : (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,114,255,0.05)',
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.accent} />
                    <CustomeText
                      color={colors.subtext}
                      fontSize={12}
                      style={{ marginLeft: 8 }}
                    >
                      Searching...
                    </CustomeText>
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { justifyContent: 'center', alignItems: 'center' },
  masterCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  neonSubline: {
    width: 40,
    height: 4,
    backgroundColor: '#0072FF',
    borderRadius: 2,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cameraSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRing: { position: 'absolute', borderRadius: 1000, borderWidth: 1 },
  ringGradient: { flex: 1, borderRadius: 1000, opacity: 0.3 },
  cameraContainer: {
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1.5,
    elevation: 15,
  },
  skeleton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  shimmerOverlay: { position: 'absolute', width: '100%', height: '100%' },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,114,255,0.1)',
  },
  cameraWrapper: { flex: 1 },
  liveCameraWrap: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vignette: { ...StyleSheet.absoluteFillObject },
  focusCorners: { width: '75%', height: '75%', position: 'relative' },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00E5FF',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 15,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 15,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 15,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 15,
  },
  scanLine: { position: 'absolute', width: '100%', height: 3, elevation: 10 },
  infoCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
  },
  infoCardShadow: {
    // ✅ shadow moved here
    shadowColor: '#0072FF',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  infoIconBox: {
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22, // ⚠️ IMPORTANT (half of width/height for perfect circle)
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: { flex: 1, gap: 2, flexShrink: 1 },
  statusSection: { alignItems: 'center', width: '100%' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  badgeSuccess: { backgroundColor: '#10B981' },
});

export default QRScannerModal;
