import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  Animated,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import Icon from '../components/global/Icon';
import { useTheme } from '../context/ThemeContext';
import { useTCP } from '../service/TCPProvider';
import ThemePickerModal from '../components/home/ThemePickerModal';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { navigate } from '../utils/NavigationUtil';
import { useNavigation } from '@react-navigation/native';
import SubscriptionBadge from '../components/ui/SubscriptionBadge';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { currentPlan } = useSubscription();
  const { sentFiles, receivedFiles, totalSentBytes, totalReceivedBytes } =
    useTCP();

  const isGuest = user?.id?.startsWith('guest');

  const [isThemeModalVisible, setThemeModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Menu items — matching the screenshot
  const menuItems = [
    {
      icon: 'person-outline',
      iconFamily: 'Ionicons',
      label: 'My Profile',
      onPress: () => {},
    },

    {
      icon: 'time-outline',
      iconFamily: 'Ionicons',
      label: 'History',
      onPress: () => navigate('ReceivedFileScreen'),
    },
    {
      icon: 'diamond-outline',
      iconFamily: 'Ionicons',
      label: 'Subscription',
      onPress: () => navigate('SubscriptionScreen'),
    },

    {
      icon: 'color-palette-outline',
      iconFamily: 'Ionicons',
      label: 'Theme & Appearance',
      onPress: () => setThemeModalVisible(true),
    },
    {
      icon: 'notifications-outline',
      iconFamily: 'Ionicons',
      label: 'Notification',
      toggle: true,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor="transparent"
        translucent
      />

      {/* ─── Gradient Background Band ─── */}
      <View style={styles.gradientBand}>
        <LinearGradient
          colors={
            isDark
              ? ['#FF6B00', '#FF9500', '#FFB347']
              : ['#FF6B00', '#FF9500', '#FFB347']
          }
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientFill}
        />
        {/* Curved bottom overlay */}
        <View
          style={[styles.curvedBottom, { backgroundColor: colors.background }]}
        />
      </View>

      {/* ─── Hamburger / Back Button ─── */}
      <SafeAreaView edges={['top']} style={styles.headerBar}>
        <TouchableOpacity
          style={styles.hamburgerBtn}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Icon name="menu" iconFamily="Ionicons" size={26} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── Profile Card (overlapping the gradient) ─── */}
        <Animated.View
          style={[
            styles.profileCardOuter,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Avatar */}
          <View style={styles.avatarOuter}>
            <View style={styles.avatarBorder}>
              <Image
                source={require('../assets/images/profile.jpg')}
                style={styles.avatarImg}
              />
            </View>
          </View>

          {/* Name + Plan Badge */}
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: colors.text }]}>
              {user?.name || 'Guest User'}
            </Text>
            <SubscriptionBadge plan={currentPlan} size="small" />
          </View>
          <Text style={[styles.subtitleText, { color: colors.subtext }]}>
            {user?.email || 'File Transfer Expert'}
          </Text>
        </Animated.View>

        {/* ─── Menu Items ─── */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuRow}
              activeOpacity={item.toggle ? 1 : 0.6}
              onPress={item.toggle ? undefined : item.onPress}
            >
              <View style={styles.menuIconWrap}>
                <Icon
                  name={item.icon}
                  iconFamily={item.iconFamily}
                  size={22}
                  color={colors.subtext}
                />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>
                {item.label}
              </Text>
              {item.badge > 0 && (
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeNum}>{item.badge}</Text>
                </View>
              )}
              {item.toggle && (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#D1D5DB', true: '#FFD6A5' }}
                  thumbColor={notificationsEnabled ? '#FF6B00' : '#9CA3AF'}
                  ios_backgroundColor="#D1D5DB"
                />
              )}
            </TouchableOpacity>
          ))}

          {/* ─── Join / Sign Up for Guests ─── */}
          {isGuest && (
            <TouchableOpacity
              style={[styles.menuRow, styles.joinRow]}
              activeOpacity={0.7}
              onPress={() => navigate('SignupScreen')}
            >
              <View style={[styles.menuIconWrap, styles.joinIconWrap]}>
                <Icon
                  name="person-add-outline"
                  iconFamily="Ionicons"
                  size={22}
                  color="#FF6B00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.joinTitle}>Join Now</Text>
                <Text style={[styles.joinDesc, { color: colors.subtext }]}>
                  Create account for unlimited transfers
                </Text>
              </View>
              <LinearGradient
                colors={['#FF6B00', '#FF9500']}
                style={styles.joinArrowCircle}
              >
                <Icon
                  name="chevron-forward"
                  iconFamily="Ionicons"
                  size={14}
                  color="#FFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Logout ─── */}
        <TouchableOpacity
          style={styles.logoutRow}
          activeOpacity={0.7}
          onPress={async () => {
            await logout();
            navigate('LoginScreen');
          }}
        >
          <Icon
            name="log-out-outline"
            iconFamily="Ionicons"
            size={18}
            color={colors.subtext}
          />
          <Text style={[styles.logoutLabel, { color: colors.subtext }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ThemePickerModal
        visible={isThemeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </View>
  );
};

const GRADIENT_HEIGHT = 220;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── Gradient Background Band ────────────────
  gradientBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: GRADIENT_HEIGHT,
    zIndex: 0,
  },
  gradientFill: {
    flex: 1,
  },
  curvedBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },

  // ─── Header ──────────────────────────────────
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  hamburgerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // ─── ScrollView ──────────────────────────────
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // ─── Profile Card ────────────────────────────
  profileCardOuter: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 70,
    paddingBottom: 20,
    zIndex: 2,
  },
  avatarOuter: {
    marginBottom: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarBorder: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    borderColor: '#FFF',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  nameText: {
    fontSize: 20,
    fontFamily: 'Okra-Bold',
    marginBottom: 3,
  },
  subtitleText: {
    fontSize: 13,
    fontFamily: 'Okra-Medium',
  },

  // ─── Menu List ───────────────────────────────
  menuList: {
    marginTop: 10,
    paddingHorizontal: 28,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuIconWrap: {
    width: 40,
    marginRight: 18,
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Okra-Medium',
  },
  badgeCircle: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeNum: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: 'Okra-Bold',
  },

  // ─── Join Row ────────────────────────────────
  joinRow: {
    marginTop: 8,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  joinIconWrap: {
    backgroundColor: 'rgba(255,107,0,0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinTitle: {
    fontSize: 15,
    fontFamily: 'Okra-Bold',
    color: '#FF6B00',
    marginBottom: 2,
  },
  joinDesc: {
    fontSize: 11,
    fontFamily: 'Okra-Medium',
  },
  joinArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Logout ──────────────────────────────────
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    marginTop: 'auto',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 28,
  },
  logoutLabel: {
    fontSize: 14,
    fontFamily: 'Okra-Medium',
  },
});

export default ProfileScreen;
