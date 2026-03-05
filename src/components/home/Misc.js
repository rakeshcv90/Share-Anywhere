import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import CustomeText from '../global/CustomeText';
import { navigate } from '../../utils/NavigationUtil';
import Icon from '../global/Icon';

const images = [
  require('../../assets/images/im1.png'),
  require('../../assets/images/im2.png'),
  require('../../assets/icons/wild_robot.jpg'),
  require('../../assets/icons/share_logo.jpg'),
];

const { width } = Dimensions.get('window');
const bannerWidth = width - 56;

const featureCards = [
  {
    icon: 'flash',
    iconFamily: 'Ionicons',
    title: '50x Faster',
    desc: 'Ultra-fast transfer speeds',
    colors: ['#42D5FC', '#1565C0'],
    bg: '#E3F2FD',
  },
  {
    icon: 'shield-checkmark',
    iconFamily: 'Ionicons',
    title: 'Encrypted',
    desc: 'Secure end-to-end protection',
    colors: ['#66BB6A', '#2E7D32'],
    bg: '#E8F5E9',
  },
  {
    icon: 'wifi-off',
    iconFamily: 'MaterialCommunityIcons',
    title: 'Offline Mode',
    desc: 'Share without internet',
    colors: ['#FF7043', '#D84315'],
    bg: '#FBE9E7',
  },
];

const Misc = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(
    featureCards.map(() => new Animated.Value(0)),
  ).current;

  let currentIndex = 0;

  useEffect(() => {
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      setCurrentSlide(currentIndex);

      Animated.spring(scrollX, {
        toValue: currentIndex * bannerWidth,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.stagger(
      120,
      cardAnims.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  const translateX = scrollX.interpolate({
    inputRange: images.map((_, i) => i * bannerWidth),
    outputRange: images.map((_, i) => -i * bannerWidth),
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header with blue accent */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.accentBar} />
          <CustomeText
            fontSize={18}
            fontFamily="Okra-Bold"
            style={{ color: '#1A202C' }}
          >
            Discover
          </CustomeText>
        </View>
        <TouchableOpacity>
          <Icon
            name="chevron-down"
            iconFamily="Ionicons"
            color="#0072FF"
            size={22}
          />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <View style={styles.carouselWrap}>
        <View style={styles.carouselClip}>
          <Animated.View
            style={{
              flexDirection: 'row',
              width: bannerWidth * images.length,
              transform: [{ translateX }],
            }}
          >
            {images.map((img, i) => (
              <Animated.Image
                key={i}
                source={img}
                style={[styles.banner, { width: bannerWidth }]}
              />
            ))}
          </Animated.View>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: currentSlide === i ? '#0072FF' : '#D1D5DB',
                  width: currentSlide === i ? 22 : 7,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Feature Cards — HORIZONTAL ROW */}
      <View style={styles.featuresRow}>
        {featureCards.map((item, index) => (
          <Animated.View
            key={index}
            style={[
              styles.featureCard,
              { backgroundColor: item.bg },
              {
                opacity: cardAnims[index],
                transform: [
                  {
                    translateY: cardAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={item.colors}
              style={styles.featureIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon
                name={item.icon}
                iconFamily={item.iconFamily}
                color="#fff"
                size={18}
              />
            </LinearGradient>
            <CustomeText
              fontSize={12}
              fontFamily="Okra-Bold"
              style={{ color: '#2D3748', marginTop: 6, textAlign: 'center' }}
            >
              {item.title}
            </CustomeText>
            <CustomeText
              fontSize={9}
              fontFamily="Okra-Medium"
              style={{ color: '#8E99A4', marginTop: 2, textAlign: 'center' }}
            >
              {item.desc}
            </CustomeText>
          </Animated.View>
        ))}
      </View>


      <TouchableOpacity
        style={styles.startBtnAlt}
        onPress={() => navigate('SendScreen')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#0072FF', '#42D5FC']}
          style={styles.btnGradientAlt}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <CustomeText fontSize={15} fontFamily="Okra-Bold" color="#fff">
            Start Sharing Now
          </CustomeText>
        </LinearGradient>
        <View style={styles.btnArrowAlt}>
          <Icon
            name="arrow-forward"
            iconFamily="Ionicons"
            size={18}
            color="#0072FF"
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,114,255,0.12)',
    shadowColor: '#0072FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  accentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#0072FF',
  },

  carouselWrap: {
    marginBottom: 14,
  },

  carouselClip: {
    width: '100%',
    height: 150,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#F0F4FF',
  },

  banner: {
    height: 150,
    resizeMode: 'cover',
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },

  dot: {
    height: 7,
    borderRadius: 4,
  },

  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },

  featureCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },

  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // startBtn: {
  //   borderRadius: 16,
  //   overflow: 'hidden',
  //   marginBottom: 12,
  //   shadowColor: '#0072FF',
  //   shadowOffset: { width: 0, height: 4 },
  //   shadowOpacity: 0.25,
  //   shadowRadius: 10,
  //   elevation: 8,
  //   width:'100%',
  //   height:50,
  // },

  // btnGradient: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   paddingVertical: 1,
  //   gap: 8,
  // },

  // btnArrow: {
  //   width: 26,
  //   height: 26,
  //   borderRadius: 13,
  //   backgroundColor: '#fff',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },

  // footer: {
  //   alignItems: 'center',
  // },

  startBtnAlt: {
  width: '100%',
  height: 50,
  marginBottom: 12,
  position: 'relative',
  borderRadius: 16,
  overflow: 'hidden',
},

btnGradientAlt: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 16,
},

btnArrowAlt: {
  position: 'absolute',
  right: 50,
  top: 12,
  width: 26,
  height: 26,
  borderRadius: 13,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
},
});

export default Misc;
