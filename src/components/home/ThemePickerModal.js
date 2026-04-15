import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../global/Icon';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const OPTIONS = [
  {
    key: 'light',
    label: 'Light',
    emoji: '☀️',
    description: 'Always light',
  },
  {
    key: 'dark',
    label: 'Dark',
    emoji: '🌙',
    description: 'Always dark',
  },
  {
    key: 'system',
    label: 'System',
    emoji: '🌓',
    description: 'Follow device',
  },
];

const ThemePickerModal = ({ visible, onClose }) => {
  const { theme, setTheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose]);

  const handleSelect = useCallback(
    key => {
      setTheme(key);
      setTimeout(() => handleClose(), 200);
    },
    [setTheme, handleClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: insets.bottom ? insets.bottom + 16 : (Platform.OS === 'ios' ? 42 : 28),
              opacity: contentOpacity,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header Row */}
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Appearance
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>
                Choose how Share Anywhere looks
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <Icon
                name="close"
                iconFamily="Ionicons"
                size={18}
                color={colors.subtext}
              />
            </TouchableOpacity>
          </View>

          {/* Options Cards */}
          <View style={styles.optionsRow}>
            {OPTIONS.map(opt => {
              const isSelected = theme === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => handleSelect(opt.key)}
                  activeOpacity={0.75}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected
                        ? colors.accent + '18'
                        : colors.surfaceAlt,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {/* Emoji Circle */}
                  <View
                    style={[
                      styles.emojiCircle,
                      {
                        backgroundColor: isSelected
                          ? colors.accent + '28'
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.emoji}>{opt.emoji}</Text>
                  </View>

                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? colors.accent : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>

                  <Text style={[styles.optionDesc, { color: colors.subtext }]}>
                    {opt.description}
                  </Text>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <View
                      style={[
                        styles.checkBadge,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <Icon
                        name="checkmark"
                        iconFamily="Ionicons"
                        size={10}
                        color="#fff"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ThemePickerModal;

const CARD_SIZE = (width - 48 - 20) / 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 22,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Okra-Bold',
    fontWeight: '800',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12.5,
    fontFamily: 'Okra-Medium',
    marginTop: 3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  optionCard: {
    width: CARD_SIZE,
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    position: 'relative',
    gap: 6,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 26,
  },
  optionLabel: {
    fontSize: 13,
    fontFamily: 'Okra-Bold',
  },
  optionDesc: {
    fontSize: 10.5,
    fontFamily: 'Okra-Medium',
    textAlign: 'center',
    lineHeight: 14,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
