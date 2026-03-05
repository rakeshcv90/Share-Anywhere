// // import React, { useCallback, useEffect, useState } from 'react';
// // import {
// //   View,
// //   Text,
// //   Platform,
// //   ActivityIndicator,
// //   FlatList,
// //   TouchableOpacity,
// //   StatusBar,
// // } from 'react-native';
// // import RNFS from 'react-native-fs';
// // import Icon from '../components/global/Icon';
// // import LinearGradient from 'react-native-linear-gradient';
// // import { SafeAreaView } from 'react-native-safe-area-context';
// // import { sendStyles } from '../styles/sendStyles';
// // import { connectionStyles } from '../styles/connectionStyles';
// // import CustomeText from '../components/global/CustomeText';
// // import { Colors } from '../utils/Constants';
// // import { formatFileSize } from '../utils/libraryHelpers';
// // import ReactNativeBlobUtil from 'react-native-blob-util';
// // import { goBack } from '../utils/NavigationUtil';
// // import { useFocusEffect } from '@react-navigation/native';

// // const ReceivedFileScreen = () => {
// //   const [receivedFiles, setReceivedFiles] = useState([]);
// //   const [isLoading, setIsLoading] = useState(true);

// //   const getMimeType = ext => {
// //     const e = ext?.replace('.', '').toLowerCase();

// //     switch (e) {
// //       case 'jpg':
// //       case 'jpeg':
// //         return 'image/jpeg';
// //       case 'png':
// //         return 'image/png';
// //       case 'mp4':
// //         return 'video/mp4';
// //       case 'mp3':
// //         return 'audio/mpeg';
// //       case 'pdf':
// //         return 'application/pdf';
// //       default:
// //         return '*/*';
// //     }
// //   };

// //   const getFilesFromDirectory = async () => {
// //     setIsLoading(true);

// //     const platformPath =
// //       Platform.OS === 'android'
// //         ? RNFS.ExternalDirectoryPath
// //         : RNFS.DocumentDirectoryPath;

// //     try {
// //       const exists = await RNFS.exists(platformPath);

// //       if (!exists) {
// //         setReceivedFiles([]);
// //         setIsLoading(false);
// //         return;
// //       }

// //       const files = await RNFS.readDir(platformPath);

// //       const formattedFiles = files
// //         .filter(file => file.isFile())
// //         .filter(file => !file.name.startsWith('.'))
// //         .filter(file => file.size > 0)
// //         .map(file => ({
// //           id: file.name,
// //           name: file.name,
// //           size: file.size,
// //           uri: file.path,
// //           mimeType: file.name.split('.').pop() || 'unknown',
// //         }));

// //       setReceivedFiles(formattedFiles);
// //     } catch (error) {
// //       console.error('Error fetching files:', error);
// //       setReceivedFiles([]);
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   useFocusEffect(
// //     useCallback(() => {
// //       getFilesFromDirectory();
// //     }, []),
// //   );

// //   const renderThumbnail = mimeType => {
// //     const ext = mimeType?.replace('.', '').toLowerCase();

// //     switch (ext) {
// //       case 'mp3':
// //         return (
// //           <Icon
// //             name="musical-notes"
// //             size={16}
// //             color="blue"
// //             iconFamily="Ionicons"
// //           />
// //         );

// //       case 'mp4':
// //         return (
// //           <Icon name="videocam" size={16} color="green" iconFamily="Ionicons" />
// //         );

// //       case 'jpg':
// //       case 'jpeg':
// //       case 'png':
// //         return (
// //           <Icon name="image" size={16} color="orange" iconFamily="Ionicons" />
// //         );

// //       case 'pdf':
// //         return (
// //           <Icon name="document" size={16} color="red" iconFamily="Ionicons" />
// //         );

// //       default:
// //         return (
// //           <Icon name="folder" size={16} color="gray" iconFamily="Ionicons" />
// //         );
// //     }
// //   };
// //   const renderItem = ({ item }) => (
// //     <View style={connectionStyles.fileItem}>
// //       <View style={connectionStyles.fileInfoContainer}>
// //         {renderThumbnail(item?.mimeType)}

// //         <View style={connectionStyles.fileDetails}>
// //           <CustomeText numberOfLines={1} fontFamily="Okra-Bold" fontSize={10}>
// //             {item.name}
// //           </CustomeText>

// //           <CustomeText numberOfLines={1} fontFamily="Okra-Medium" fontSize={8}>
// //             {item.mimeType} • {formatFileSize(item.size)}
// //           </CustomeText>
// //         </View>
// //       </View>
// //       <TouchableOpacity
// //         style={connectionStyles.openButton}
// //         onPress={() => {
// //           const normalizedPath =
// //             Platform.OS === 'ios' ? `file://${item?.uri}` : item?.uri;

// //           if (Platform.OS === 'ios') {
// //             ReactNativeBlobUtil.ios
// //               .openDocument(normalizedPath)
// //               .then(() => console.log('File opened successfully'))
// //               .catch(err => console.error('Error opening file:', err));
// //           } else {
// //             ReactNativeBlobUtil.android
// //               .actionViewIntent(normalizedPath, getMimeType(item.mimeType))
// //               .then(() => console.log('File opened successfully'))
// //               .catch(err => console.error('Error opening file:', err));
// //           }
// //         }}
// //       >
// //         <CustomeText
// //           numberOfLines={1}
// //           fontFamily="Okra-Bold"
// //           fontSize={10}
// //           color={'#fff'}
// //         >
// //           Open
// //         </CustomeText>
// //       </TouchableOpacity>
// //     </View>
// //   );
// //   return (
// //     <>
// //       <StatusBar barStyle="dark-content" backgroundColor="transparent" />
// //       <LinearGradient
// //         colors={['#ffffff', '#CDDAEE', '#8DBAFF']}
// //         style={sendStyles.container}
// //       >
// //         <SafeAreaView style={{ flex: 1 }}>
// //           <View style={sendStyles.mainContainer}>
// //             {/* Title */}
// //             <CustomeText
// //               fontFamily="Okra-Bold"
// //               fontSize={15}
// //               color="#000"
// //               style={{ textAlign: 'center', margin: 10 }}
// //             >
// //               All Received Files
// //             </CustomeText>

// //             {isLoading ? (
// //               <ActivityIndicator size="small" color={Colors.primary} />
// //             ) : receivedFiles.length > 0 ? (
// //               <View style={{ flex: 1 }}>
// //                 <FlatList
// //                   data={receivedFiles}
// //                   keyExtractor={item => item.id}
// //                   renderItem={renderItem}
// //                   contentContainerStyle={connectionStyles.fileList}
// //                 />
// //               </View>
// //             ) : (
// //               <View style={connectionStyles.noDataContainer}>
// //                 <CustomeText
// //                   numberOfLines={1}
// //                   fontFamily="Okra-Medium"
// //                   fontSize={11}
// //                 >
// //                   No files received yet.
// //                 </CustomeText>
// //               </View>
// //             )}
// //             <TouchableOpacity onPress={goBack} style={sendStyles.backButton}>
// //               <Icon
// //                 name="arrow-back"
// //                 iconFamily="Ionicons"
// //                 size={16}
// //                 color="#000"
// //               />
// //             </TouchableOpacity>
// //           </View>
// //         </SafeAreaView>
// //       </LinearGradient>
// //     </>
// //   );
// // };

// // export default ReceivedFileScreen;

// import React, { useCallback, useState, useRef, useEffect } from 'react';
// import {
//   View,
//   FlatList,
//   TouchableOpacity,
//   StatusBar,
//   Platform,
//   Animated,
//   Dimensions,
//   ActivityIndicator,
// } from 'react-native';
// import RNFS from 'react-native-fs';
// import Icon from '../components/global/Icon';
// import LinearGradient from 'react-native-linear-gradient';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { formatFileSize } from '../utils/libraryHelpers';
// import ReactNativeBlobUtil from 'react-native-blob-util';
// import { goBack } from '../utils/NavigationUtil';
// import CustomeText from '../components/global/CustomeText';
// import { Colors } from '../utils/Constants';
// import { connectionStyles } from '../styles/connectionStyles';

// const { width } = Dimensions.get('window');

// const AnimatedCard = Animated.createAnimatedComponent(TouchableOpacity);

// const ReceivedFileScreen = () => {
//   const [receivedFiles, setReceivedFiles] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);

//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   const getMimeType = ext => {
//     const e = ext?.replace('.', '').toLowerCase();
//     switch (e) {
//       case 'jpg':
//       case 'jpeg':
//         return 'image/jpeg';
//       case 'png':
//         return 'image/png';
//       case 'mp4':
//         return 'video/mp4';
//       case 'mp3':
//         return 'audio/mpeg';
//       case 'pdf':
//         return 'application/pdf';
//       default:
//         return '*/*';
//     }
//   };

//   const getFilesFromDirectory = async () => {
//     setIsLoading(true);
//     const platformPath =
//       Platform.OS === 'android'
//         ? RNFS.ExternalDirectoryPath
//         : RNFS.DocumentDirectoryPath;

//     try {
//       const exists = await RNFS.exists(platformPath);

//       if (!exists) {
//         setReceivedFiles([]);
//         setIsLoading(false);
//         return;
//       }

//       const files = await RNFS.readDir(platformPath);

//       const formattedFiles = files
//         .filter(file => file.isFile())
//         .filter(file => !file.name.startsWith('.'))
//         .filter(file => file.size > 0)
//         .map(file => ({
//           id: file.name,
//           name: file.name,
//           size: file.size,
//           uri: file.path,
//           mimeType: file.name.split('.').pop() || 'unknown',
//         }));

//       setReceivedFiles(formattedFiles);
//     } catch (error) {
//       console.error('Error fetching files:', error);
//       setReceivedFiles([]);
//     } finally {
//       setIsLoading(false);
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 800,
//         useNativeDriver: true,
//       }).start();
//     }
//   };

//   useEffect(() => {
//     getFilesFromDirectory();
//   }, []);

//   const renderIcon = mimeType => {
//     const ext = mimeType?.replace('.', '').toLowerCase();
//     let colors = ['#D8B4FE', '#9333EA'];
//     let iconName = 'folder';
//     switch (ext) {
//       case 'mp3':
//         iconName = 'musical-notes';
//         colors = ['#67E8F9', '#06B6D4'];
//         break;
//       case 'mp4':
//         iconName = 'videocam';
//         colors = ['#FCD34D', '#F59E0B'];
//         break;
//       case 'jpg':
//       case 'jpeg':
//       case 'png':
//         iconName = 'image';
//         colors = ['#6EE7B7', '#10B981'];
//         break;
//       case 'pdf':
//         iconName = 'document';
//         colors = ['#F87171', '#DC2626'];
//         break;
//     }

//     return (
//       <LinearGradient
//         colors={colors}
//         style={{
//           width: 50,
//           height: 50,
//           borderRadius: 25,
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}
//       >
//         <Icon name={iconName} size={24} color="#fff" iconFamily="Ionicons" />
//       </LinearGradient>
//     );
//   };

//   const renderItem = ({ item, index }) => {
//     const translateY = fadeAnim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [20 + index * 5, 0],
//     });

//     return (
//       <AnimatedCard
//         style={{
//           flexDirection: 'row',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           marginHorizontal: 12,
//           marginVertical: 6,
//           padding: 12,
//           borderRadius: 16,
//           backgroundColor: '#fff',
//           shadowColor: '#000',
//           shadowOffset: { width: 0, height: 4 },
//           shadowOpacity: 0.1,
//           shadowRadius: 6,
//           elevation: 5,
//           transform: [{ translateY }],
//           opacity: fadeAnim,
//         }}
//         onPress={() => {
//           const normalizedPath =
//             Platform.OS === 'ios' ? `file://${item?.uri}` : item?.uri;

//           if (Platform.OS === 'ios') {
//             ReactNativeBlobUtil.ios
//               .openDocument(normalizedPath)
//               .catch(console.error);
//           } else {
//             ReactNativeBlobUtil.android
//               .actionViewIntent(normalizedPath, getMimeType(item.mimeType))
//               .catch(console.error);
//           }
//         }}
//       >
//         <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
//           {renderIcon(item?.mimeType)}
//           <View style={{ marginLeft: 12, flexShrink: 1 }}>
//             <CustomeText
//               fontFamily="Okra-Bold"
//               fontSize={14}
//               color="#1E3A8A"
//               numberOfLines={1}
//             >
//               {item.name}
//             </CustomeText>
//             <CustomeText
//               fontFamily="Okra-Medium"
//               fontSize={12}
//               color="#6B7280"
//               numberOfLines={1}
//             >
//               {item.mimeType} • {formatFileSize(item.size)}
//             </CustomeText>
//           </View>
//         </View>

//         <LinearGradient
//           colors={['#3B82F6', '#2563EB']}
//           style={{
//             paddingHorizontal: 16,
//             paddingVertical: 8,
//             borderRadius: 12,
//           }}
//         >
//           <CustomeText fontFamily="Okra-Bold" fontSize={12} color="#fff">
//             Open
//           </CustomeText>
//         </LinearGradient>
//       </AnimatedCard>
//     );
//   };

//   return (
//     <>
//       <StatusBar barStyle="dark-content" backgroundColor="transparent" />
//       <LinearGradient
//         colors={['#E0F2FE', '#BAE6FD']}
//         style={{ flex: 1, paddingTop: 16 }}
//       >
//         <SafeAreaView style={{ flex: 1 }}>
//           <CustomeText
//             fontFamily="Okra-Bold"
//             fontSize={18}
//             color="#1E3A8A"
//             style={{ textAlign: 'center', marginVertical: 16 }}
//           >
//             Received Files
//           </CustomeText>

//           {isLoading ? (
//             <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
//           ) : receivedFiles.length > 0 ? (
//             <FlatList
//               data={receivedFiles}
//               keyExtractor={item => item.id}
//               renderItem={renderItem}
//               contentContainerStyle={{ paddingBottom: 20 }}
//             />
//           ) : (
//             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
//               <CustomeText fontFamily="Okra-Medium" fontSize={14} color="#6B7280">
//                 No files received yet.
//               </CustomeText>
//             </View>
//           )}

//           <TouchableOpacity
//             onPress={goBack}
//             style={{
//               position: 'absolute',
//               top: 16,
//               left: 16,
//               padding: 6,
//               borderRadius: 8,
//               backgroundColor: '#fff',
//               shadowColor: '#000',
//               shadowOffset: { width: 0, height: 2 },
//               shadowOpacity: 0.1,
//               shadowRadius: 4,
//               elevation: 3,
//             }}
//           >
//             <Icon name="arrow-back" iconFamily="Ionicons" size={20} color="#1E3A8A" />
//           </TouchableOpacity>
//         </SafeAreaView>
//       </LinearGradient>
//     </>
//   );
// };

// export default ReceivedFileScreen;

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import RNFS from 'react-native-fs';
import Icon from '../components/global/Icon';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatFileSize } from '../utils/libraryHelpers';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { goBack } from '../utils/NavigationUtil';
import CustomeText from '../components/global/CustomeText';
import { Colors } from '../utils/Constants';
import { connectionStyles } from '../styles/connectionStyles';

const { width, height } = Dimensions.get('window');

const AnimatedCard = Animated.createAnimatedComponent(TouchableOpacity);

const ReceivedFileScreen = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef([]).current;

  // Get total size of all files
  const totalSize = receivedFiles.reduce((acc, file) => acc + file.size, 0);
  const fileCount = receivedFiles.length;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getFilesFromDirectory = async () => {
    setIsLoading(true);
    const platformPath =
      Platform.OS === 'android'
        ? RNFS.ExternalDirectoryPath
        : RNFS.DocumentDirectoryPath;

    try {
      const exists = await RNFS.exists(platformPath);

      if (!exists) {
        setReceivedFiles([]);
        setIsLoading(false);
        return;
      }

      const files = await RNFS.readDir(platformPath);

      const formattedFiles = files
        .filter(file => file.isFile())
        .filter(file => !file.name.startsWith('.'))
        .filter(file => file.size > 0)
        .map((file, index) => ({
          id: file.name,
          name: file.name,
          size: file.size,
          uri: file.path,
          mimeType: file.name.split('.').pop() || 'unknown',
          modifiedTime: file.mtime || new Date(),
        }))
        .sort((a, b) => b.modifiedTime - a.modifiedTime); // Sort by newest first

      setReceivedFiles(formattedFiles);

      // Create animation values for cards
      cardAnimations.length = 0;
      formattedFiles.forEach(() => {
        cardAnimations.push(new Animated.Value(0));
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      setReceivedFiles([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getFilesFromDirectory();
  }, []);

  useEffect(() => {
    getFilesFromDirectory();
  }, []);

  // Animate cards sequentially when files load
  useEffect(() => {
    if (!isLoading && receivedFiles.length > 0) {
      Animated.stagger(
        100,
        cardAnimations.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }
  }, [isLoading, receivedFiles.length]);

  const getFileIcon = mimeType => {
    const ext = mimeType?.replace('.', '').toLowerCase();
    let iconName = 'document';
    let gradientColors = ['#94A3B8', '#64748B'];

    switch (ext) {
      case 'mp3':
      case 'wav':
      case 'm4a':
        iconName = 'musical-notes';
        gradientColors = ['#F472B6', '#DB2777'];
        break;
      case 'mp4':
      case 'mov':
      case 'avi':
        iconName = 'videocam';
        gradientColors = ['#FCD34D', '#F59E0B'];
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'heic':
        iconName = 'image';
        gradientColors = ['#6EE7B7', '#10B981'];
        break;
      case 'pdf':
        iconName = 'document-text';
        gradientColors = ['#F87171', '#DC2626'];
        break;
      case 'doc':
      case 'docx':
        iconName = 'document';
        gradientColors = ['#60A5FA', '#2563EB'];
        break;
      case 'zip':
      case 'rar':
      case '7z':
        iconName = 'archive';
        gradientColors = ['#C084FC', '#7E22CE'];
        break;
    }

    return { iconName, gradientColors };
  };
  const getMimeType = ext => {
    const e = ext?.replace('.', '').toLowerCase();
    switch (e) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'mp4':
        return 'video/mp4';
      case 'mp3':
        return 'audio/mpeg';
      case 'pdf':
        return 'application/pdf';
      default:
        return '*/*';
    }
  };
  const renderIcon = mimeType => {
    const { iconName, gradientColors } = getFileIcon(mimeType);

    return (
      <LinearGradient
        colors={gradientColors}
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '5deg' }],
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name={iconName} size={28} color="#fff" iconFamily="Ionicons" />
        </View>
      </LinearGradient>
    );
  };

  const renderItem = ({ item, index }) => {
    const cardAnim = cardAnimations[index] || new Animated.Value(1);

    const translateY = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });

    const opacity = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const scale = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    });

    return (
      <AnimatedCard
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginHorizontal: 16,
          marginVertical: 8,
          padding: 16,
          borderRadius: 24,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
          transform: [{ translateY }, { scale }],
          opacity,
        }}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedFile(item);
          const normalizedPath =
            Platform.OS === 'ios' ? `file://${item?.uri}` : item?.uri;

          if (Platform.OS === 'ios') {
            ReactNativeBlobUtil.ios
              .openDocument(normalizedPath)
              .catch(console.error);
          } else {
            ReactNativeBlobUtil.android
              .actionViewIntent(normalizedPath, getMimeType(item.mimeType))
              .catch(console.error);
          }
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {renderIcon(item?.mimeType)}
          <View style={{ marginLeft: 16, flex: 1 }}>
            <CustomeText
              fontFamily="Okra-Bold"
              fontSize={15}
              color="#1E293B"
              numberOfLines={1}
            >
              {item.name}
            </CustomeText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              >
                <CustomeText
                  fontSize={10}
                  color="#475569"
                  fontFamily="Okra-Medium"
                >
                  {item.mimeType.toUpperCase()}
                </CustomeText>
              </View>
              <CustomeText
                fontSize={11}
                color="#64748B"
                fontFamily="Okra-Medium"
              >
                {formatFileSize(item.size)}
              </CustomeText>
            </View>
          </View>
        </View>

        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <CustomeText fontFamily="Okra-Bold" fontSize={13} color="#fff">
            Open
          </CustomeText>
        </LinearGradient>
      </AnimatedCard>
    );
  };

  const renderHeader = () => (
    <Animated.View
      style={{
        paddingHorizontal: 20,
        paddingBottom: 20,
        transform: [{ translateY: headerSlideAnim }],
        opacity: fadeAnim,
      }}
    >
      {/* Stats Cards */}
      <Animated.View
        style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20,
          opacity: statsAnim,
          transform: [
            {
              translateY: statsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={{
            flex: 1,
            padding: 16,
            borderRadius: 20,
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Icon
            name="document-text"
            iconFamily="Ionicons"
            size={24}
            color="#fff"
          />
          <CustomeText
            fontSize={20}
            fontFamily="Okra-Bold"
            color="#fff"
            style={{ marginTop: 8 }}
          >
            {fileCount}
          </CustomeText>
          <CustomeText
            fontSize={12}
            color="rgba(255,255,255,0.8)"
            fontFamily="Okra-Medium"
          >
            Total Files
          </CustomeText>
        </LinearGradient>

        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          style={{
            flex: 1,
            padding: 16,
            borderRadius: 20,
            shadowColor: '#6D28D9',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Icon
            name="cloud-download"
            iconFamily="Ionicons"
            size={24}
            color="#fff"
          />
          <CustomeText
            fontSize={20}
            fontFamily="Okra-Bold"
            color="#fff"
            style={{ marginTop: 8 }}
          >
            {formatFileSize(totalSize)}
          </CustomeText>
          <CustomeText
            fontSize={12}
            color="rgba(255,255,255,0.8)"
            fontFamily="Okra-Medium"
          >
            Total Size
          </CustomeText>
        </LinearGradient>
      </Animated.View>

      {/* Recent Files Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 4,
              height: 24,
              backgroundColor: '#3B82F6',
              borderRadius: 2,
            }}
          />
          <CustomeText fontSize={16} fontFamily="Okra-Bold" color="#fff">
            Recent Files
          </CustomeText>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Icon
            name="refresh"
            iconFamily="Ionicons"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: height * 0.2,
        opacity: fadeAnim,
      }}
    >
      <LinearGradient
        colors={['#F1F5F9', '#E2E8F0']}
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Icon
          name="cloud-offline"
          iconFamily="Ionicons"
          size={60}
          color="#94A3B8"
        />
      </LinearGradient>
      <CustomeText fontFamily="Okra-Bold" fontSize={18} color="#334155">
        No Files Yet
      </CustomeText>
      <CustomeText
        fontFamily="Okra-Medium"
        fontSize={14}
        color="#64748B"
        style={{ marginTop: 8 }}
      >
        Files you receive will appear here
      </CustomeText>
    </Animated.View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <LinearGradient   colors={['#1a1a2e', '#16213e', '#0f3460']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Animated Header */}
          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 12,
              transform: [{ translateY: headerSlideAnim }],
              opacity: fadeAnim,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <TouchableOpacity
                onPress={goBack}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#fff',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Icon
                  name="arrow-back"
                  iconFamily="Ionicons"
                  size={22}
                  color="#1E293B"
                />
              </TouchableOpacity>
              <CustomeText fontFamily="Okra-Bold" fontSize={24} color="#fff">
                Inbox
              </CustomeText>
            </View>
          </Animated.View>

          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color="#3B82F6" />
              <CustomeText color="#fff" style={{ marginTop: 12 }}>
                Loading files...
              </CustomeText>
            </View>
          ) : receivedFiles.length > 0 ? (
            <FlatList
              data={receivedFiles}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListHeaderComponent={renderHeader}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#3B82F6"
                  colors={['#3B82F6']}
                />
              }
            />
          ) : (
            renderEmptyState()
          )}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

export default ReceivedFileScreen;
