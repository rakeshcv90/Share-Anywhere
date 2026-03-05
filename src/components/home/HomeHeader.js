import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import { screenHeight, screenWidth, svgPath } from '../../utils/Constants';
import QRGenerateModal from '../modals/QRGenerateModal';
import Icon from '../global/Icon';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const HomeHeader = () => {
//   const insets = useSafeAreaInsets();
//   const [isVisible, setVisible] = useState(false);
//   const titleAnim = useRef(new Animated.Value(0)).current;
//   const profileAnim = useRef(new Animated.Value(0)).current;
//   const menuAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.stagger(120, [
//       Animated.spring(menuAnim, {
//         toValue: 1,
//         friction: 6,
//         tension: 40,
//         useNativeDriver: true,
//       }),
//       Animated.spring(titleAnim, {
//         toValue: 1,
//         friction: 6,
//         tension: 40,
//         useNativeDriver: true,
//       }),
//       Animated.spring(profileAnim, {
//         toValue: 1,
//         friction: 6,
//         tension: 40,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }, []);
// useEffect(() => {
//   Animated.loop(
//     Animated.sequence([
//       Animated.timing(titleAnim, {
//         toValue: 1.1,
//         duration: 1000,
//         useNativeDriver: true,
//       }),
//       Animated.timing(titleAnim, {
//         toValue: 1,
//         duration: 1000,
//         useNativeDriver: true,
//       }),
//     ])
//   ).start();
// }, []);
//   return (
//     <View style={styles.mainContainer}>
//       <LinearGradient
//         colors={['#1B2B4B', '#243B6A', '#3A5998']}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={[styles.gradientBg]}
//       >
//         {/* Top Header Row */}
//         <View
//           style={[
//             styles.headerRow,
//             { marginTop: insets.top + 30, marginBottom: 20 },
//           ]}
//         >
//           <Animated.View
//             style={{
//               opacity: menuAnim,
//               transform: [
//                 {
//                   translateX: menuAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [-20, 0],
//                   }),
//                 },
//               ],
//             }}
//           ></Animated.View>

//           <Animated.View
//             style={{
//               opacity: titleAnim,
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               gap: 8,
//               transform: [
//                 {
//                   scale: titleAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0.6, 1],
//                   }),
//                 },
//                 {
//                   rotate: titleAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: ['-5deg', '0deg'],
//                   }),
//                 },
//               ],
//             }}
//           >
//             {/* Logo with rotating animation */}
//             <Animated.View
//               style={{
//                 transform: [
//                   {
//                     rotate: titleAnim.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: ['-10deg', '0deg'],
//                     }),
//                   },
//                 ],
//               }}
//             >
//               <Image
//                 source={require('../../assets/images/logo.png')}
//                 style={styles.logo}
//               />
//             </Animated.View>

//             {/* Text with staggered animation */}
//             <View style={styles.textContainer}>
//               <Animated.Text
//                 style={[
//                   styles.appName,
//                   {
//                     opacity: titleAnim,
//                     transform: [
//                       {
//                         translateX: titleAnim.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [-10, 0],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}
//               >
//                 Share
//               </Animated.Text>

//               <Animated.Text
//                 style={[
//                   styles.appName,
//                   styles.itText,
//                   {
//                     opacity: titleAnim,
//                     transform: [
//                       {
//                         translateX: titleAnim.interpolate({
//                           inputRange: [0, 1],
//                           outputRange: [10, 0],
//                         }),
//                       },
//                     ],
//                   },
//                 ]}
//               >
//                 It
//               </Animated.Text>
//             </View>
//           </Animated.View>
//           <Animated.View
//             style={{
//               opacity: profileAnim,
//               transform: [
//                 {
//                   translateX: profileAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [20, 0],
//                   }),
//                 },
//               ],
//             }}
//           >
//             <TouchableOpacity
//               onPress={() => setVisible(true)}
//               style={styles.profileWrapper}
//             >
//               <Image
//                 source={require('../../assets/images/profile.jpg')}
//                 style={styles.profile}
//               />
//             </TouchableOpacity>
//           </Animated.View>
//         </View>
//       </LinearGradient>

//       <Svg
//         height={screenWidth * 0.18}
//         width={screenWidth}
//         viewBox="0 0 1440 220"
//         style={styles.curve}
//       >
//         <Defs>
//           <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
//             <Stop offset="0%" stopColor="#3A5998" stopOpacity="1" />
//             <Stop offset="100%" stopColor="#A8C0E8" stopOpacity="0.2" />
//           </SvgGradient>
//         </Defs>
//         <Path fill="url(#grad)" d={svgPath} />
//       </Svg>

//       {isVisible && (
//         <QRGenerateModal
//           visible={isVisible}
//           onClose={() => setVisible(false)}
//         />
//       )}
//     </View>
//   );
// };
const HomeHeader = () => {
  const insets = useSafeAreaInsets();
  const [isVisible, setVisible] = useState(false);

  // Separate animation values
  const titleAnim = useRef(new Animated.Value(0)).current;
  const profileAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current; // New value for pulsing

  // Initial entrance animation
  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(menuAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(profileAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pulsing animation (starts after entrance)
  useEffect(() => {
    // Wait for entrance animation to complete
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 500); // Start after entrance animation
  }, []);

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#1B2B4B', '#243B6A', '#3A5998']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBg]}
      >
        <View
          style={[
            styles.headerRow,
            { marginTop: insets.top + 30, marginBottom: 20 },
          ]}
        >
          {/* Menu Button (empty) */}
          <Animated.View
            style={{
              opacity: menuAnim,
              transform: [
                {
                  translateX: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            }}
          >
            {/* Add menu button here if needed */}
            {/* <View style={styles.iconButton} /> */}
          </Animated.View>

          {/* Logo and Title Container */}
          <Animated.View
            style={{
              opacity: titleAnim,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              transform: [
                {
                  scale: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            }}
          >
            {/* Logo with its own animation */}
            <Animated.View
              style={{
                transform: [
                  {
                    scale: pulseAnim, // Use pulseAnim for continuous animation
                  },
                ],
              }}
            >
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
              />
            </Animated.View>

            {/* Text Container */}
            <View style={styles.textContainer}>
              <Animated.Text style={[styles.appName]}>Share</Animated.Text>
              <Animated.Text style={[styles.appName, styles.itText]}>
                It
              </Animated.Text>
            </View>
          </Animated.View>

          {/* Profile Button */}
          <Animated.View
            style={{
              opacity: profileAnim,
              transform: [
                {
                  translateX: profileAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              onPress={() => setVisible(true)}
              style={styles.profileWrapper}
            >
              <Image
                source={require('../../assets/images/profile.jpg')}
                style={styles.profile}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>

      <Svg
        height={screenWidth * 0.18}
        width={screenWidth}
        viewBox="0 0 1440 220"
        style={styles.curve}
      >
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3A5998" stopOpacity="1" />
            <Stop offset="100%" stopColor="#A8C0E8" stopOpacity="0.2" />
          </SvgGradient>
        </Defs>
        <Path fill="url(#grad)" d={svgPath} />
      </Svg>

      {isVisible && (
        <QRGenerateModal
          visible={isVisible}
          onClose={() => setVisible(false)}
        />
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: 'transparent',
  },

  gradientBg: {
    paddingBottom: 12,
  },

  headerRow: {
    width: '100%',
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // logo: {
  //   width: 130,
  //   height: 40,
  //   resizeMode: 'contain',
  // },
  logo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 4,
    letterSpacing: 1.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  itText: {
    color: '#FFD700',
    fontSize: 36,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginLeft: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },

  profile: {
    width: '100%',
    height: '100%',
  },

  searchContainer: {
    paddingHorizontal: 18,
    marginTop: 12,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    padding: 0,
  },

  curve: {
    marginTop: -2,
  },
});

export default HomeHeader;
