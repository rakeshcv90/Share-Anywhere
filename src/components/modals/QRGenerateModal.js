import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  StyleSheet,
  Animated,
  Easing,
  BackHandler,
  ScrollView,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { moderateScale } from 'react-native-size-matters';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import CustomeText from '../global/CustomeText';
import Icon from '../global/Icon';
import DeviceInfo from 'react-native-device-info';
import { getLocalIPAddress } from '../../utils/networkUtils';
import { navigate } from '../../utils/NavigationUtil';
import { useTCP } from '../../service/TCPProvider';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;

const ms = (n, factor = isTablet ? 0.2 : 0.5) => moderateScale(n, factor);

const RING_SIZE = ms(200);
const QR_SIZE = ms(148);

const QRGenerateModal = ({ visible, onClose }) => {
  const { startServer, server, isConnected } = useTCP();
  const [loading, setLoading] = useState(true);
  const [qrValue, setQRValue] = useState('');
  const [isRendered, setIsRendered] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-SCREEN_W)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const loopAnimsRef = useRef([]);

  const stopAllLoops = () => {
    loopAnimsRef.current.forEach(a => a.stop());
    loopAnimsRef.current = [];
  };

  const startLoops = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: SCREEN_W,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(shimmerAnim, {
          toValue: -SCREEN_W,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    rotate.start();
    glow.start();
    shimmer.start();
    loopAnimsRef.current = [pulse, rotate, glow, shimmer];
  };

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.96);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) startLoops();
      });

      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android')
        StatusBar.setBackgroundColor('rgba(0,0,0,0.9)', true);
    } else {
      stopAllLoops();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIsRendered(false);
      });

      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android')
        StatusBar.setBackgroundColor('#1B2B4B', true);
    }
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
      setLoading(false);
    } catch (e) {
      console.error('Server setup error:', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setupServer();
    } else setQRValue('');
  }, [visible]);

  useEffect(() => {
    if (isConnected) {
      onClose();
      setTimeout(() => {
        navigate('ConnectionScreen');
      }, 300);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  useEffect(() => () => stopAllLoops(), []);

  if (!isRendered) return null;

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fadeAnim }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Centred card (maxWidth caps size on iPad) */}
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        {/* ── Header (Fixed at top) ─────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <CustomeText fontFamily="Okra-Bold" color="#fff" fontSize={ms(22)}>
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
                size={ms(22)}
                color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── QR Section ────────────────────────────────────────── */}
          <View style={styles.qrSection}>
            {/* Glow behind rings */}
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  opacity: glowAnim,
                  width: RING_SIZE * 1.15,
                  height: RING_SIZE * 1.15,
                  borderRadius: RING_SIZE * 0.6,
                },
              ]}
            />

            {/* Rings container */}
            <View
              style={[
                styles.ringsContainer,
                { width: RING_SIZE, height: RING_SIZE },
              ]}
            >
              {/* Outer rotating ring */}
              <Animated.View
                style={[
                  styles.outerRing,
                  { transform: [{ rotate: rotateDeg }] },
                  StyleSheet.absoluteFill,
                ]}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2', '#6b8cff']}
                  style={[styles.ringGradient, { borderRadius: 1000 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {/* Particle dots */}
              <View style={[styles.middleRing, StyleSheet.absoluteFill]}>
                {[...Array(8)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ringParticle,
                      {
                        transform: [
                          { rotate: `${i * 45}deg` },
                          { translateY: -(RING_SIZE * 0.35) },
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
                  {
                    transform: [{ scale: pulseAnim }],
                    width: RING_SIZE * 0.75,
                    height: RING_SIZE * 0.75,
                    borderRadius: RING_SIZE * 0.375,
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(102,126,234,0.3)', 'rgba(118,75,162,0.3)']}
                  style={[styles.ringGradient, { borderRadius: 1000 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>

              {/* QR box */}
              <View
                style={[
                  styles.qrContainer,
                  { width: QR_SIZE, height: QR_SIZE },
                ]}
              >
                {loading || !qrValue ? (
                  <View style={styles.skeleton}>
                    <Animated.View
                      style={[
                        styles.shimmerOverlay,
                        { transform: [{ translateX: shimmerAnim }] },
                      ]}
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
                    <Animated.View
                      style={[
                        styles.loadingIcon,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.loadingIconGradient}
                      >
                        <Icon
                          name="qrcode-scan"
                          iconFamily="MaterialCommunityIcons"
                          size={ms(34)}
                          color="#fff"
                        />
                      </LinearGradient>
                    </Animated.View>
                  </View>
                ) : (
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrValue}
                      size={QR_SIZE - ms(18)}
                      logoBackgroundColor="#fff"
                      logoBorderRadius={20}
                      logoMargin={2}
                      color="#2d3748"
                      backgroundColor="#fff"
                    />
                    <View style={[styles.qrCorner, styles.cornerTL]} />
                    <View style={[styles.qrCorner, styles.cornerTR]} />
                    <View style={[styles.qrCorner, styles.cornerBL]} />
                    <View style={[styles.qrCorner, styles.cornerBR]} />
                    <View style={styles.qrBadge}>
                      <LinearGradient
                        colors={['#4CAF50', '#45a049']}
                        style={styles.qrBadgeGradient}
                      >
                        <Icon
                          name="checkmark"
                          iconFamily="Ionicons"
                          size={ms(9)}
                          color="#fff"
                        />
                      </LinearGradient>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Device chip */}
            {!loading && qrValue && (
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.deviceCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.deviceCardRow}>
                  <View style={styles.deviceIcon}>
                    <Icon
                      name="phone-portrait"
                      iconFamily="Ionicons"
                      size={ms(13)}
                      color="#667eea"
                    />
                  </View>
                  <CustomeText
                    color="#fff"
                    fontSize={ms(12)}
                    fontFamily="Okra-Medium"
                    numberOfLines={1}
                  >
                    {qrValue?.split('|')[1]?.substring(0, 20) || 'Your Device'}
                  </CustomeText>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <CustomeText color="#4CAF50" fontSize={ms(9)}>
                      LIVE
                    </CustomeText>
                  </View>
                </View>
              </LinearGradient>
            )}
          </View>

          {/* ── Stats ─────────────────────────────────────────────── */}
          <View style={styles.statsGrid}>
            {[
              { icon: 'wifi', label: 'Network', sub: 'Same Wi-Fi' },
              { icon: 'shield-checkmark', label: 'Secure', sub: 'End-to-end' },
              { icon: 'flash', label: 'Speed', sub: 'Instant' },
            ].map(item => (
              <View key={item.label} style={styles.statItem}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.statIcon}
                >
                  <Icon
                    name={item.icon}
                    iconFamily="Ionicons"
                    size={ms(15)}
                    color="#fff"
                  />
                </LinearGradient>
                <CustomeText
                  color="#fff"
                  fontSize={ms(11)}
                  fontFamily="Okra-Bold"
                >
                  {item.label}
                </CustomeText>
                <CustomeText color="rgba(255,255,255,0.5)" fontSize={ms(8)}>
                  {item.sub}
                </CustomeText>
              </View>
            ))}
          </View>

          {/* ── Status strip ──────────────────────────────────────── */}
          <View style={styles.statusBar}>
            <LinearGradient
              colors={['rgba(102,126,234,0.2)', 'rgba(118,75,162,0.2)']}
              style={styles.statusGradient}
            >
              <View style={styles.statusRow}>
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#667eea" />
                    <CustomeText
                      color="rgba(255,255,255,0.8)"
                      fontSize={ms(12)}
                    >
                      Generating...
                    </CustomeText>
                  </>
                ) : (
                  <>
                    <View style={styles.scanningPulse}>
                      {[20, 28, 36].map(sz => (
                        <View
                          key={sz}
                          style={[styles.ripple, { width: sz, height: sz }]}
                        />
                      ))}
                      <View style={styles.activePulse} />
                    </View>
                    <CustomeText
                      color="#fff"
                      fontSize={ms(12)}
                      fontFamily="Okra-Medium"
                    >
                      Ready to scan
                    </CustomeText>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* ── Footer ────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <CustomeText color="rgba(255,255,255,0.5)" fontSize={ms(10)}>
              Show this code to the sender
            </CustomeText>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Full-width container so header spans edge-to-edge
  card: {
    width: SCREEN_W,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start', // ✅ move content to top
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingTop: ms(20),
  },

  // Header
  header: {
    paddingHorizontal: ms(20),
    paddingTop: Platform.OS === 'ios' ? ms(isTablet ? 30 : 32) : ms(50),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // marginBottom: ms(4),
  },
  headerLine: {
    width: ms(30),
    height: 2,
    backgroundColor: '#667eea',
    borderRadius: 1,
    // marginTop: ms(4),
  },
  closeButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    overflow: 'hidden',
  },
  closeButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // QR section
  qrSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: ms(8),
    marginBottom: ms(20),
  },
  glowEffect: {
    position: 'absolute',
    backgroundColor: '#667eea',
    opacity: 0.12,
  },
  ringsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  outerRing: {
    borderRadius: 1000,
  },
  middleRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringParticle: {
    position: 'absolute',
    width: ms(4),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: '#667eea',
    opacity: 0.6,
  },
  innerRing: {
    position: 'absolute',
  },
  ringGradient: {
    flex: 1,
  },

  // QR code box
  qrContainer: {
    borderRadius: ms(18),
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
    width: ms(60),
    height: ms(60),
    borderRadius: ms(30),
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
    width: ms(14),
    height: ms(14),
    borderColor: '#667eea',
    borderWidth: 2,
  },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
  qrBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: ms(20),
    height: ms(20),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  qrBadgeGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Device chip
  deviceCard: {
    alignItems: 'center',
    marginTop: ms(100), // ✅ increase spacing from QR
    borderRadius: ms(24),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deviceCardRow: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(7),
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  deviceIcon: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: 'rgba(102,126,234,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(10),
    gap: ms(3),
  },
  liveDot: {
    width: ms(5),
    height: ms(5),
    borderRadius: ms(3),
    backgroundColor: '#4CAF50',
  },

  // Stats row
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: ms(16),
    paddingHorizontal: ms(8),
  },
  statItem: {
    alignItems: 'center',
    gap: ms(5),
  },
  statIcon: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status strip
  statusBar: {
    marginTop: ms(14),
    borderRadius: ms(14),
    overflow: 'hidden',
  },
  statusGradient: {
    borderRadius: ms(14),
  },
  statusRow: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  scanningPulse: {
    width: ms(36),
    height: ms(36),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ripple: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.3)',
  },
  activePulse: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: '#667eea',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: ms(12),
  },
});

export default QRGenerateModal;
