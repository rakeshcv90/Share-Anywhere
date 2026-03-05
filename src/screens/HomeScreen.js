import { View, ScrollView, StatusBar, StyleSheet, Animated, Easing } from 'react-native';
import React, { useRef, useEffect } from 'react';
import HomeHeader from '../components/home/HomeHeader';
import Misc from '../components/home/Misc';
import Options from '../components/home/Options';
import SendReceiveButton from '../components/home/SendReceiveButton';
import AbsoluteQRBottom from '../components/home/AbsoluteQRBottom';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const HomeScreen = () => {
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ).start();
  }, []);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#F0F4FF', '#F5F0FF', '#F0F4FF'],
  });

  return (
    <>
      <StatusBar
        translucent={false}
        backgroundColor={'#1B2B4B'}
        barStyle="light-content"
      />

      <HomeHeader />

      <Animated.View style={[styles.baseContainer, { backgroundColor: bgColor }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SendReceiveButton />
          <Options isHome />
          <View style={styles.miscWrapper}>
            <Misc />
          </View>
        </ScrollView>

        <AbsoluteQRBottom />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: 8,
  },
  miscWrapper: {
    marginTop: 16,

  },
});

export default HomeScreen;
