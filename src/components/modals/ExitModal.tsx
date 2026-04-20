import {
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  StyleSheet,
  BackHandler,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import React, { useEffect, useCallback } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import CustomeText from '../global/CustomeText';
import Icon from '../global/Icon';
import { useTheme } from '../../context/ThemeContext';
import { moderateScale } from 'react-native-size-matters';

const { width: SCREEN_W } = Dimensions.get('window');

interface ExitModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CARD_WIDTH = SCREEN_W - 40;

const ExitModal: React.FC<ExitModalProps> = ({ visible, onClose, onConfirm }) => {
  const { colors, isDark } = useTheme();

  // 🔄 Reanimated Shared Values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.92);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      scaleAnim.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
      });
    } else {
      fadeAnim.value = withTiming(0, { duration: 250 });
      scaleAnim.value = withTiming(0.92, { duration: 250 });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    fadeAnim.value = withTiming(0, { duration: 250 });
    scaleAnim.value = withTiming(0.92, { duration: 250 }, finished => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    fadeAnim.value = withTiming(0, { duration: 250 });
    scaleAnim.value = withTiming(0.92, { duration: 250 }, finished => {
      if (finished) {
        runOnJS(onConfirm)();
      }
    });
  }, [onConfirm]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true; // prevent default behavior
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
          <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.masterCard,
              masterCardStyle,
              {
                backgroundColor: isDark ? colors.background : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,114,255,0.15)',
                shadowColor: isDark ? '#FF3B30' : '#FF3B30',
                shadowOpacity: Platform.OS === 'ios' ? (isDark ? 0.3 : 0.2) : 0.3,
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
                colors={['rgba(255,255,255,0.6)', 'transparent']}
                style={styles.glossyTop}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}

            <View style={styles.cardContent}>
              {/* Alert Icon */}
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)' }]}>
                <Icon name="log-out-outline" iconFamily="Ionicons" size={36} color="#FF3B30" />
              </View>

              <CustomeText
                fontFamily="Okra-Bold"
                color={colors.text}
                fontSize={moderateScale(20)}
                style={styles.title}
              >
                Exit App
              </CustomeText>

              <CustomeText
                fontFamily="Okra-Medium"
                color={colors.subtext || 'rgba(150,150,150,1)'}
                fontSize={moderateScale(14)}
                style={styles.subtitle}
              >
                Are you sure you want to exit the application?
              </CustomeText>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleClose}
                  style={[styles.actionBtn, styles.cancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                >
                  <CustomeText fontFamily="Okra-Medium" color={colors.text} fontSize={moderateScale(14)}>
                    Cancel
                  </CustomeText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleConfirm}
                  style={[styles.actionBtn, styles.exitBtn]}
                >
                  <LinearGradient
                    colors={['#FF4B40', '#E02D20']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <CustomeText fontFamily="Okra-Bold" color="#FFFFFF" fontSize={moderateScale(14)}>
                    Exit
                  </CustomeText>
                </TouchableOpacity>
              </View>
            </View>
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
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  cardContent: {
    padding: moderateScale(24),
    alignItems: 'center',
  },
  iconWrap: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: moderateScale(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  title: {
    marginBottom: moderateScale(8),
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: moderateScale(24),
    paddingHorizontal: moderateScale(10),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(12),
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    height: moderateScale(48),
    borderRadius: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  exitBtn: {},
  glossyTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});

export default ExitModal;
