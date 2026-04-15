import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import React, { useRef, useEffect } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { screenHeight, screenWidth } from '../../utils/Constants';
import { navigate } from '../../utils/NavigationUtil';
import Icon from '../global/Icon';

const SendReceiveButton = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sendSlide = useRef(new Animated.Value(-40)).current;
  const receiveSlide = useRef(new Animated.Value(40)).current;
  const sendScale = useRef(new Animated.Value(1)).current;
  const receiveScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(sendSlide, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(receiveSlide, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = anim => {
    Animated.spring(anim, { toValue: 0.93, useNativeDriver: true }).start();
  };

  const pressOut = anim => {
    Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* SEND */}
      <Animated.View
        style={[
          styles.cardWrapper,
          styles.sendCardGlow,
          { transform: [{ translateX: sendSlide }, { scale: sendScale }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => pressIn(sendScale)}
          onPressOut={() => pressOut(sendScale)}
          onPress={() => navigate('SendScreen')}
          style={styles.touchable}
        >
          <LinearGradient
            colors={['#0072FF', '#00C6FF']}
            style={styles.card}
          >
            <View style={styles.cardContentInner}>
              <Icon name="arrow-up" iconFamily="Ionicons" size={48} color="#C4E0FF" />
              <Text style={styles.label}>Send</Text>
              <Text style={styles.sublabel}>Send File</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* RECEIVE */}
      <Animated.View
        style={[
          styles.cardWrapper,
          styles.receiveCardGlow,
          { transform: [{ translateX: receiveSlide }, { scale: receiveScale }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => pressIn(receiveScale)}
          onPressOut={() => pressOut(receiveScale)}
          onPress={() => navigate('ReceiveScreen')}
          style={styles.touchable}
        >
          <LinearGradient
            colors={['#56CCF2', '#2F80ED']}
            style={styles.card}
          >
            <View style={styles.cardContentInner}>
              <Icon name="arrow-down" iconFamily="Ionicons" size={48} color="#D1E9FF" />
              <Text style={styles.label}>Receive</Text>
              <Text style={styles.sublabel}>Receive File</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default SendReceiveButton;

const styles = StyleSheet.create({
  container: {
    marginTop: 15, // Better breathing gap
    flexDirection: 'row',
    justifyContent: 'space-between', // Absolute alignment with grid edges
    paddingHorizontal: 18, // Sync with grid padding
  },

  cardWrapper: {
    width: '47.5%', // Near-perfect match for 48.5% grid alignment
    height: 165,
    borderRadius: 32,
    backgroundColor: 'transparent',
  },
  touchable: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  cardContentInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 4,
  },
  label: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Okra-Bold',
    includeFontPadding: false,
  },
  sublabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Okra-Medium',
    includeFontPadding: false,
  },
  sendCardGlow: {
    shadowColor: '#0072FF',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 20,
    elevation: 12,
  },
  receiveCardGlow: {
    shadowColor: '#2F80ED',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 20,
    elevation: 12,
  },
});
