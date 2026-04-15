import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
  BackHandler,
  ScrollView,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

import CustomeText from '../global/CustomeText';
import Icon from '../global/Icon';
import DeviceInfo from 'react-native-device-info';
import { getLocalIPAddress } from '../../utils/networkUtils';
import { navigate } from '../../utils/NavigationUtil';
import { useTCP } from '../../service/TCPProvider';
import { useTheme } from '../../context/ThemeContext';
import { moderateScale } from 'react-native-size-matters';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
}

// 📏 Smart Scaling Constants
const IS_SMALL_DEVICE = SCREEN_H < 700;
const QR_SIZE_BASE = IS_SMALL_DEVICE ? 160 : 180;
const CARD_WIDTH = SCREEN_W - 20;
const CARD_HEIGHT = SCREEN_H * 0.88;

const QRGenerateModal: React.FC<ModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { startServer, isConnected } = useTCP();

  const [loading, setLoading] = useState(true);
  const [qrValue, setQRValue] = useState('');

  const qrSize = Math.round(moderateScale(QR_SIZE_BASE));

  // 🔄 Reanimated Shared Values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.92);
  const rotateAnim = useSharedValue(0);
  const beamAnim = useSharedValue(0);
  const glowPulse = useSharedValue(0.3);

  const radar1 = useSharedValue(0);
  const radar2 = useSharedValue(0);
  const radar3 = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 500 });
      scaleAnim.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.back(1.0)),
      });

      rotateAnim.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
      );

      beamAnim.value = withRepeat(
        withSequence(
          withTiming(qrSize - moderateScale(30), {
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      glowPulse.value = withRepeat(
        withSequence(
          withTiming(0.7, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.3, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );

      const startRadar = (anim: any, delayMs: number) => {
        anim.value = 0;
        setTimeout(() => {
          anim.value = withRepeat(
            withTiming(1, { duration: 4500, easing: Easing.out(Easing.quad) }),
            -1,
            false,
          );
        }, delayMs);
      };

      startRadar(radar1, 0);
      startRadar(radar2, 1500);
      startRadar(radar3, 3000);
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
      scaleAnim.value = withTiming(0.92, { duration: 300 });
    }
  }, [visible, qrSize]);

  const handleClose = useCallback(() => {
    fadeAnim.value = withTiming(0, { duration: 300 });
    scaleAnim.value = withTiming(0.92, { duration: 300 }, finished => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      const setup = async () => {
        try {
          const deviceName = await DeviceInfo.getDeviceName();
          const ip = await getLocalIPAddress();
          const port = 4000;
          startServer(port);
          setQRValue(`tcp://${ip}:${port}|${deviceName}`);
          setLoading(false);
        } catch (e) {
          setLoading(false);
        }
      };
      setup();
    }
  }, [visible]);

  useEffect(() => {
    if (isConnected) {
      onClose();
      setTimeout(() => navigate('ConnectionScreen'), 400);
    }
  }, [isConnected, onClose]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, handleClose]);

  // 💎 Animated Styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const masterCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: fadeAnim.value,
  }));

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: beamAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const radarStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(radar1.value, [0, 1], [0.8, 3]) }],
    opacity: interpolate(radar1.value, [0, 0.4, 0.8, 1], [0, 0.6, 0.2, 0]),
  }));

  const radarStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(radar2.value, [0, 1], [0.8, 3]) }],
    opacity: interpolate(radar2.value, [0, 0.4, 0.8, 1], [0, 0.6, 0.2, 0]),
  }));

  const radarStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(radar3.value, [0, 1], [0.8, 3]) }],
    opacity: interpolate(radar3.value, [0, 0.4, 0.8, 1], [0, 0.6, 0.2, 0]),
  }));

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
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
                  : ['rgba(255,255,255,1)', 'rgba(255,255,255,0.85)']
              }
              style={StyleSheet.absoluteFill}
            />

            {/* Glossy Top Reflection */}
            {!isDark && (
              <LinearGradient
                colors={['rgba(255,255,255,0.4)', 'transparent']}
                style={styles.glossyTop}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Header Section */}
              <View style={styles.header}>
                <View>
                  <CustomeText
                    fontFamily="Okra-Bold"
                    color={colors.text}
                    fontSize={moderateScale(21)}
                  >
                    Connection Hub
                  </CustomeText>
                  <View style={styles.vibrantUnderline} />
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.vibrantClose,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,114,255,0.05)',
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

              {/* QR Section */}
              <View
                style={[
                  styles.qrSection,
                  {
                    width: qrSize + 50,
                    height: qrSize + 50,
                    marginBottom: 15,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.outerGlow,
                    glowStyle,
                    {
                      backgroundColor: isDark
                        ? 'rgba(0,229,255,0.25)'
                        : 'rgba(0,114,255,0.15)',
                    },
                  ]}
                />

                <View
                  style={[
                    styles.qrGlassBox,
                    {
                      width: qrSize,
                      height: qrSize,
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,114,255,0.15)',
                      shadowColor: isDark ? '#00E5FF' : '#0072FF',
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="large" color="#00E5FF" />
                  ) : (
                    <View
                      style={[
                        styles.qrWhiteBox,
                        {
                          width: qrSize - moderateScale(30),
                          height: qrSize - moderateScale(30),
                        },
                      ]}
                    >
                      <QRCode
                        value={qrValue}
                        size={qrSize - moderateScale(80)}
                        color="#0F172A"
                        backgroundColor="#fff"
                      />
                      <Animated.View style={[styles.laserBeam, beamStyle]}>
                        <LinearGradient
                          colors={['transparent', '#0072FF', 'transparent']}
                          style={{ flex: 1 }}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                        />
                      </Animated.View>
                      <View style={[styles.bracket, styles.qTl]} />
                      <View style={[styles.bracket, styles.qTr]} />
                      <View style={[styles.bracket, styles.qBl]} />
                      <View style={[styles.bracket, styles.qBr]} />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.heroBanner}>
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(0,114,255,0.1)', 'rgba(0,114,255,0.03)']
                      : ['rgba(0,114,255,0.08)', 'rgba(0,114,255,0.03)']
                  }
                  style={[
                    styles.heroInner,
                    {
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,114,255,0.1)',
                    },
                  ]}
                >
                  <View style={{ padding: 14 }}>
                    <View
                      style={[
                        styles.heroContent,
                        { width: '100%', justifyContent: 'flex-start' },
                      ]}
                    >
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: 'rgba(0, 198, 255, 1)' },
                        ]}
                      >
                        <Icon
                          name="phone-portrait"
                          iconFamily="Ionicons"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.heroText}>
                        <CustomeText
                          color={colors.text}
                          fontSize={15}
                          fontFamily="Okra-Bold"
                        >
                          {qrValue?.split('|')[1] || 'Broadcasting...'}
                        </CustomeText>
                        <View style={styles.signalRow}>
                          <View
                            style={[
                              styles.signalDot,
                              {
                                backgroundColor: isDark ? '#00E5FF' : '#0072FF',
                              },
                            ]}
                          />
                          <CustomeText
                            color={isDark ? 'rgba(255,255,255,0.6)' : '#0072FF'}
                            fontSize={11}
                            fontFamily="Okra-Bold"
                          >
                            ACTIVE
                          </CustomeText>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.grid}>
                {[
                  { icon: 'wifi', title: 'P2P Ready', color: '#0072FF' },
                  {
                    icon: 'shield-checkmark',
                    title: 'Secure',
                    color: '#10B981',
                  },
                  { icon: 'flash', title: 'Turbo', color: '#F59E0B' },
                ].map((item, i) => (
                  <View key={i} style={styles.gridItem}>
                    <LinearGradient
                      colors={
                        isDark
                          ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                          : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.6)']
                      }
                      style={[
                        styles.gridItemInner,
                        {
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,114,255,0.08)',
                        },
                      ]}
                    >
                      {/* <View
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <LinearGradient
                          colors={[item.color, item.color + 'bb']}
                          style={styles.gridIconBox}
                        >
                          <Icon
                            name={item.icon}
                            iconFamily="Ionicons"
                            size={16}
                            color="#fff"
                          />
                        </LinearGradient>
                        <CustomeText
                          color={colors.text}
                          fontSize={10}
                          fontFamily="Okra-Bold"
                        >
                          {item.title}
                        </CustomeText>
                      </View> */}

                      <View
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <View style={{ width: '100%', alignItems: 'center' }}>
                          <View
                            style={[
                              styles.gridIconBox,
                              { backgroundColor: item.color }, // Use the solid color
                            ]}
                          >
                            <Icon
                              name={item.icon}
                              iconFamily="Ionicons"
                              size={16}
                              color="#fff"
                            />
                          </View>
                        </View>
                        <CustomeText
                          color={colors.text}
                          fontSize={10}
                          fontFamily="Okra-Bold"
                        >
                          {item.title}
                        </CustomeText>
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </View>

              {/* Radar Hub */}
              <View style={styles.radarHub}>
                <View style={styles.radarCenter}>
                  <Animated.View
                    style={[
                      styles.radarRing,
                      radarStyle1,
                      {
                        borderColor: isDark
                          ? 'rgba(0,229,255,0.4)'
                          : 'rgba(0,114,255,0.2)',
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radarRing,
                      radarStyle2,
                      {
                        borderColor: isDark
                          ? 'rgba(0,229,255,0.3)'
                          : 'rgba(0,114,255,0.1)',
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radarRing,
                      radarStyle3,
                      {
                        borderColor: isDark
                          ? 'rgba(0,229,255,0.2)'
                          : 'rgba(0,114,255,0.05)',
                      },
                    ]}
                  />
                  <View style={styles.radarPoint}>
                    <View
                      style={[
                        styles.radarCore,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  </View>
                </View>
                <CustomeText
                  color={colors.text}
                  fontSize={14}
                  fontFamily="Okra-Bold"
                  style={{ marginTop: 10 }}
                >
                  Looking for devices...
                </CustomeText>
              </View>

              <View style={styles.footer}>
                <CustomeText color={colors.subtext} fontSize={10}>
                  Position devices close for faster discovery
                </CustomeText>
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
  scrollContent: { padding: 20, paddingBottom: 50, alignItems: 'center' },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  vibrantUnderline: {
    width: 40,
    height: 4,
    backgroundColor: '#0072FF',
    borderRadius: 2,
    marginTop: 4,
  },
  vibrantClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  qrSection: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 1000,
  },
  qrGlassBox: {
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 15,
  },
  qrWhiteBox: {
    backgroundColor: '#fff',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  laserBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    elevation: 10,
  },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#0072FF',
  },
  qTl: {
    top: 12,
    left: 12,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  qTr: {
    top: 12,
    right: 12,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  qBl: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  qBr: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  heroBanner: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  heroInner: { borderRadius: 20, borderWidth: 1 },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: { flex: 1 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  signalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  grid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 30 },
  gridItem: { flex: 1, height: 85, borderRadius: 18, overflow: 'hidden' },
  gridItemInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  gridIconBox: {
    width: 40, // or whatever size you want
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarHub: { alignItems: 'center', marginBottom: 10, width: '100%' },
  radarCenter: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  radarRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  radarPoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,114,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCore: { width: 8, height: 8, borderRadius: 4 },
  footer: { opacity: 0.5 },
  glossyTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
});

export default QRGenerateModal;
