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
        style={{ transform: [{ translateX: sendSlide }, { scale: sendScale }] }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => pressIn(sendScale)}
          onPressOut={() => pressOut(sendScale)}
          onPress={() => navigate('SendScreen')}
        >
          <LinearGradient
            colors={['#42D5FC', '#2196F3', '#1565C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.iconWrap}>
              <Image
                source={require('../../assets/icons/send.png')}
                style={styles.icon}
                tintColor="#fff"
              />
            </View>
            <Text style={styles.label}>Send</Text>
            <Text style={styles.sublabel}>Share files</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* RECEIVE */}
      <Animated.View
        style={{ transform: [{ translateX: receiveSlide }, { scale: receiveScale }] }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => pressIn(receiveScale)}
          onPressOut={() => pressOut(receiveScale)}
          onPress={() => navigate('ReceiveScreen')}
        >
          <LinearGradient
            colors={['#CE93D8', '#9C27B0', '#6A1B9A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.iconWrap}>
              <Image
                source={require('../../assets/icons/inbox.png')}
                style={styles.icon}
                tintColor="#fff"
              />
            </View>
            <Text style={styles.label}>Receive</Text>
            <Text style={styles.sublabel}>Get files</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

export default SendReceiveButton;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 12,
  },

  card: {
    width: screenWidth * 0.42,
    height: 130,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 10,
  },

  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  icon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },

  label: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  sublabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
