// import {
//   View,
//   Text,
//   StatusBar,
//   TouchableOpacity,
//   FlatList,
//   ActivityIndicator,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import React, { useEffect, useState } from 'react';
// import { useTCP } from '../service/TCPProvider';
// import Icon from '../components/global/Icon';
// import { goBack, resetAndNavigate } from '../utils/NavigationUtil';
// import { sendStyles } from '../styles/sendStyles';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import CustomeText from '../components/global/CustomeText';
// import { connectionStyles } from '../styles/connectionStyles';
// import Options from '../components/home/Options';
// import { formatFileSize } from '../utils/libraryHelpers';
// import { Colors } from '../utils/Constants';
// import ReactNativeBlobUtil from 'react-native-blob-util';
// import LinearGradient from 'react-native-linear-gradient';


// const ConnectionScreen = () => {
//   const {
//     connectedDevice,
//     disconnect,
//     sendFileAck,
//     sentFiles,
//     receivedFiles,
//     totalReceivedBytes,
//     totalSentBytes,
//     isConnected,
//   } = useTCP();
//   const TABS = {
//     SENT: 'SENT',
//     RECEIVED: 'RECEIVED',
//   };

//   const [activeTab, setActiveTab] = useState(TABS.SENT);

//   const renderThumbnail = mimeType => {
//     switch (mimeType) {
//       case '.mp3':
//         return (
//           <Icon
//             name="musical-notes"
//             size={16}
//             color="blue"
//             iconFamily="Ionicons"
//           />
//         );

//       case '.mp4':
//         return (
//           <Icon name="videocam" size={16} color="green" iconFamily="Ionicons" />
//         );

//       case '.jpg':
//         return (
//           <Icon name="image" size={16} color="orange" iconFamily="Ionicons" />
//         );

//       case '.pdf':
//         return (
//           <Icon name="document" size={16} color="red" iconFamily="Ionicons" />
//         );

//       default:
//         return (
//           <Icon name="folder" size={16} color="gray" iconFamily="Ionicons" />
//         );
//     }
//   };
//   const onMediaPickedUp = image => {
//     console.log('Picked image:', image);
//     sendFileAck(image, 'image');
//   };

//   const onFilePickedUp = file => {
//     console.log('Picked file:', file);
//     sendFileAck(file, 'file');
//   };

//   useEffect(() => {
//     if (!isConnected) {
//       resetAndNavigate('HomeScreen');
//     }
//   }, [isConnected]);
//   const handleTabChange = tab => {
//     setActiveTab(tab);
//   };
//   const handleGoBack = () => {
//     resetAndNavigate('HomeScreen');
//   };

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

//   const renderItem = ({ item }) => {
   

//     return (
//       <View style={connectionStyles.fileItem}>
//         <View style={connectionStyles.fileInfoContainer}>
//           {renderThumbnail(item?.mimeType)}

//           <View style={connectionStyles?.fileDetails}>
//             <CustomeText numberOfLines={1} fontFamily="Okra-Bold" fontSize={10}>
//               {item?.name}
//             </CustomeText>

//             <CustomeText>
//               {item?.mimeType} • {formatFileSize(item.size)}
//             </CustomeText>
//           </View>
//         </View>

//         {item?.available ? (
//           <TouchableOpacity
//             style={connectionStyles.openButton}
//             onPress={() => {
//               const normalizedPath =
//                 Platform.OS === 'ios' ? `file://${item?.uri}` : item?.uri;

//               if (Platform.OS === 'ios') {
//                 ReactNativeBlobUtil.ios
//                   .openDocument(normalizedPath)
//                   .then(() => console.log('File opened successfully'))
//                   .catch(err => console.error('Error opening file:', err));
//               } else {
//                 ReactNativeBlobUtil.android
//                   .actionViewIntent(normalizedPath, getMimeType(item.mimeType))
//                   .then(() => console.log('File opened successfully'))
//                   .catch(err => console.error('Error opening file:', err));
//               }
//             }}
//           >
//             <CustomeText
//               numberOfLines={1}
//               fontFamily="Okra-Bold"
//               fontSize={10}
//               color="#fff"
//             >
//               Open
//             </CustomeText>
            
//           </TouchableOpacity>
//         ) : (
      
       
//             <ActivityIndicator colors={'blue'} size={'small'}/>
  
//         )}
//       </View>
//     );
//   };
//   return (
//     <>
//       <StatusBar barStyle="dark-content" backgroundColor="transparent" />
//       <LinearGradient
//         colors={['#FFFFFF', '#CDDAEE', '#8DBAFF']}
//         style={sendStyles.container}
//         start={{ x: 0, y: 1 }}
//         end={{ x: 0, y: 0 }}
//       >
//         <SafeAreaView style={{ flex: 1 }}>
//           <View style={sendStyles.mainContainer}>
//             <View style={connectionStyles.container}>
//               <View style={connectionStyles.connectionContainer}>
//                 <View style={{ width: '55%' }}>
//                   <CustomeText numberOfLines={1} fontFamily="Okra-Medium">
//                     Connected with
//                   </CustomeText>

//                   <CustomeText
//                     numberOfLines={1}
//                     fontFamily="Okra-Bold"
//                     fontSize={14}
//                   >
//                     {connectedDevice || 'Unknown'}
//                   </CustomeText>
//                 </View>
//                 <TouchableOpacity
//                   onPress={() => disconnect()}
//                   style={connectionStyles.disconnectButton}
//                 >
//                   <Icon
//                     name="remove-circle"
//                     size={12}
//                     color="red"
//                     iconFamily="Ionicons"
//                   />

//                   <CustomeText
//                     numberOfLines={1}
//                     fontFamily="Okra-Bold"
//                     fontSize={10}
//                   >
//                     Disconnect
//                   </CustomeText>
//                 </TouchableOpacity>
//               </View>
//               <Options
//                 onMediaPickedUp={onMediaPickedUp}
//                 onFilePickedUp={onFilePickedUp}
//               />
//               <View style={connectionStyles.fileContainer}>
//                 <View style={connectionStyles.sendReceiveContainer}>
//                   <View style={connectionStyles.sendReceiveButtonContainer}>
//                     <TouchableOpacity
//                       onPress={() => handleTabChange('SENT')}
//                       style={[
//                         connectionStyles.sendReceiveButton,
//                         activeTab === 'SENT'
//                           ? connectionStyles.activeButton
//                           : connectionStyles.inactiveButton,
//                       ]}
//                     >
//                       <Icon
//                         name="cloud-upload"
//                         size={12}
//                         color={activeTab === 'SENT' ? '#fff' : 'blue'}
//                         iconFamily="Ionicons"
//                       />

//                       <CustomeText
//                         numberOfLines={1}
//                         fontFamily="Okra-Bold"
//                         fontSize={9}
//                         color={activeTab === 'SENT' ? '#fff' : '#000'}
//                       >
//                         SENT
//                       </CustomeText>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       onPress={() => handleTabChange('RECEIVED')}
//                       style={[
//                         connectionStyles.sendReceiveButton,
//                         activeTab === 'RECEIVED'
//                           ? connectionStyles.activeButton
//                           : connectionStyles.inactiveButton,
//                       ]}
//                     >
//                       <Icon
//                         name="cloud-upload"
//                         size={12}
//                         color={activeTab === 'RECEIVED' ? '#fff' : 'blue'}
//                         iconFamily="Ionicons"
//                       />

//                       <CustomeText
//                         numberOfLines={1}
//                         fontFamily="Okra-Bold"
//                         fontSize={9}
//                         color={activeTab === 'RECEIVED' ? '#fff' : 'blue'}
//                       >
//                         RECEIVED
//                       </CustomeText>
//                     </TouchableOpacity>
//                   </View>
//                   <View style={connectionStyles.sendReceiveDataContainer}>
//                     <CustomeText
//                       numberOfLines={1}
//                       fontFamily="Okra-Medium"
//                       fontSize={10}
//                     >
//                       {formatFileSize(
//                         (activeTab === 'SENT'
//                           ? totalSentBytes
//                           : totalReceivedBytes) || 0,
//                       )}
//                     </CustomeText>
//                     <CustomeText
//                       numberOfLines={1}
//                       fontFamily="Okra-Medium"
//                       fontSize={10}
//                     >
//                       /
//                     </CustomeText>

//                     <CustomeText
//                       numberOfLines={1}
//                       fontFamily="Okra-Medium"
//                       fontSize={10}
//                     >
//                       {activeTab === 'SENT'
//                         ? formatFileSize(
//                             sentFiles?.reduce(
//                               (total, file) => total + file.size,
//                               0,
//                             ),
//                           )
//                         : formatFileSize(
//                             receivedFiles?.reduce(
//                               (total, file) => total + file.size,
//                               0,
//                             ),
//                           )}
//                     </CustomeText>
//                   </View>
//                 </View>

//                 {(activeTab === 'SENT'
//                   ? sentFiles?.length
//                   : receivedFiles?.length) > 0 ? (
//                   <FlatList
//                     data={activeTab === 'SENT' ? sentFiles : receivedFiles}
//                     keyExtractor={item => item.id.toString()}
//                     renderItem={renderItem}
//                     contentContainerStyle={connectionStyles.fileList}
//                   />
//                 ) : (
//                   <View style={connectionStyles.noDataContainer}>
//                     <CustomeText
//                       numberOfLines={1}
//                       fontFamily="Okra-Medium"
//                       fontSize={11}
//                     >
//                       {activeTab === 'SENT'
//                         ? 'No files sent yet.'
//                         : 'No files received yet.'}
//                     </CustomeText>
//                   </View>
//                 )}
//               </View>
//             </View>

//             <TouchableOpacity
//               onPress={handleGoBack}
//               style={sendStyles.backButton}
//             >
//               <Icon
//                 name="arrow-back"
//                 iconFamily="Ionicons"
//                 size={16}
//                 color="#000"
//               />
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>
//       </LinearGradient>
//     </>
//   );
// };
// const styles = StyleSheet.create({
//   progressBar: {
//     marginTop: 6,
//     height: 6,
//     borderRadius: 5,
//   },
// });
// export default ConnectionScreen;


import {
  View,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useTCP } from '../service/TCPProvider';
import Icon from '../components/global/Icon';
import { goBack, resetAndNavigate } from '../utils/NavigationUtil';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomeText from '../components/global/CustomeText';
import Options from '../components/home/Options';
import { formatFileSize } from '../utils/libraryHelpers';
import { Colors } from '../utils/Constants';
import ReactNativeBlobUtil from 'react-native-blob-util';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

// ✅ FIXED: Separate component for file items with proper Hook usage
const FileItem = ({ item, index }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;
  const itemDelay = index * 100;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 500,
      delay: itemDelay,
      useNativeDriver: true,
    }).start();
  }, []);

  const translateX = itemAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const opacity = itemAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const getFileIcon = (mimeType) => {
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
    }
    
    return { iconName, gradientColors };
  };

  const renderThumbnail = (mimeType) => {
    const { iconName, gradientColors } = getFileIcon(mimeType);
    
    return (
      <LinearGradient
        colors={gradientColors}
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '3deg' }],
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name={iconName} size={24} color="#fff" iconFamily="Ionicons" />
        </LinearGradient>
      </LinearGradient>
    );
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

  return (
    <Animated.View
      style={{
        transform: [{ translateX }],
        opacity,
      }}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.fileItem}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.fileInfoContainer}>
          {renderThumbnail(item?.mimeType)}
          <View style={styles.fileDetails}>
            <CustomeText numberOfLines={1} fontFamily="Okra-Bold" fontSize={14} color="#1E293B">
              {item?.name}
            </CustomeText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <LinearGradient
                colors={['#F1F5F9', '#E2E8F0']}
                style={styles.fileTypeBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <CustomeText fontSize={10} color="#475569" fontFamily="Okra-Medium">
                  {item?.mimeType?.toUpperCase()}
                </CustomeText>
              </LinearGradient>
              <CustomeText fontSize={11} color="#64748B" fontFamily="Okra-Medium" style={{ marginLeft: 8 }}>
                {formatFileSize(item.size)}
              </CustomeText>
            </View>
          </View>
        </View>

        {item?.available ? (
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => {
              const normalizedPath =
                Platform.OS === 'ios' ? `file://${item?.uri}` : item?.uri;

              if (Platform.OS === 'ios') {
                ReactNativeBlobUtil.ios
                  .openDocument(normalizedPath)
                  .catch(err => console.error('Error opening file:', err));
              } else {
                ReactNativeBlobUtil.android
                  .actionViewIntent(normalizedPath, getMimeType(item.mimeType))
                  .catch(err => console.error('Error opening file:', err));
              }
            }}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.openButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <CustomeText fontFamily="Okra-Bold" fontSize={12} color="#fff">
                Open
              </CustomeText>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <LinearGradient
            colors={['#F1F5F9', '#E2E8F0']}
            style={styles.loadingContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ActivityIndicator color="#3B82F6" size="small" />
            <CustomeText fontSize={10} color="#475569" style={{ marginLeft: 4 }}>
              Sending...
            </CustomeText>
          </LinearGradient>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const ConnectionScreen = () => {
  const {
    connectedDevice,
    disconnect,
    sendFileAck,
    sentFiles,
    receivedFiles,
    totalReceivedBytes,
    totalSentBytes,
    isConnected,
  } = useTCP();

  const TABS = {
    SENT: 'SENT',
    RECEIVED: 'RECEIVED',
  };

  const [activeTab, setActiveTab] = useState(TABS.SENT);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Animate tab indicator
    Animated.spring(tabIndicatorAnim, {
      toValue: activeTab === TABS.SENT ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    if (!isConnected) {
      resetAndNavigate('HomeScreen');
    }
  }, [isConnected]);

  const handleTabChange = tab => {
    setActiveTab(tab);
  };

  const handleGoBack = () => {
    resetAndNavigate('HomeScreen');
  };

  const onMediaPickedUp = image => {
    console.log('Picked image:', image);
    sendFileAck(image, 'image');
  };

  const onFilePickedUp = file => {
    console.log('Picked file:', file);
    sendFileAck(file, 'file');
  };

  // Simplified renderItem now just returns the FileItem component
  const renderItem = ({ item, index }) => (
    <FileItem item={item} index={index} />
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated background particles */}
        <View style={styles.particleContainer}>
          {[...Array(6)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: Math.random() * width,
                  top: Math.random() * Dimensions.get('window').height,
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.2],
                  }),
                },
              ]}
            />
          ))}
        </View>

        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View 
            style={[
              styles.mainContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: headerScale }],
              },
            ]}
          >
            {/* Header with Gradient */}
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={handleGoBack}
                    style={styles.backButton}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                      style={styles.backButtonGradient}
                    >
                      <Icon name="arrow-back" iconFamily="Ionicons" size={22} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                  <View>
                    <CustomeText fontSize={12} color="rgba(255,255,255,0.6)" fontFamily="Okra-Medium">
                      Active Connection
                    </CustomeText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.activeDot} />
                      <CustomeText fontSize={16} fontFamily="Okra-Bold" color="#fff">
                        {connectedDevice || 'Unknown Device'}
                      </CustomeText>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => disconnect()}
                  style={styles.disconnectButton}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.disconnectButtonGradient}
                  >
                    <Icon name="close-circle" size={20} color="#fff" iconFamily="Ionicons" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Options Component with enhanced styling */}
            <View style={styles.optionsWrapper}>
              <Options
                onMediaPickedUp={onMediaPickedUp}
                onFilePickedUp={onFilePickedUp}
              />
            </View>

            {/* Files Section */}
            <View style={styles.filesSection}>
              {/* Tab Bar with Gradient */}
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.tabBar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    onPress={() => handleTabChange(TABS.SENT)}
                    style={[styles.tab, activeTab === TABS.SENT && styles.activeTab]}
                  >
                    <LinearGradient
                      colors={activeTab === TABS.SENT ? ['#3B82F6', '#2563EB'] : ['transparent', 'transparent']}
                      style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Icon
                      name="arrow-up-circle"
                      size={18}
                      color={activeTab === TABS.SENT ? '#fff' : 'rgba(255,255,255,0.5)'}
                      iconFamily="Ionicons"
                    />
                    <CustomeText
                      fontSize={13}
                      fontFamily="Okra-Bold"
                      color={activeTab === TABS.SENT ? '#fff' : 'rgba(255,255,255,0.5)'}
                      style={{ marginLeft: 6 }}
                    >
                      Sent
                    </CustomeText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleTabChange(TABS.RECEIVED)}
                    style={[styles.tab, activeTab === TABS.RECEIVED && styles.activeTab]}
                  >
                    <LinearGradient
                      colors={activeTab === TABS.RECEIVED ? ['#3B82F6', '#2563EB'] : ['transparent', 'transparent']}
                      style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Icon
                      name="arrow-down-circle"
                      size={18}
                      color={activeTab === TABS.RECEIVED ? '#fff' : 'rgba(255,255,255,0.5)'}
                      iconFamily="Ionicons"
                    />
                    <CustomeText
                      fontSize={13}
                      fontFamily="Okra-Bold"
                      color={activeTab === TABS.RECEIVED ? '#fff' : 'rgba(255,255,255,0.5)'}
                      style={{ marginLeft: 6 }}
                    >
                      Received
                    </CustomeText>
                  </TouchableOpacity>
                </View>

                {/* Transfer Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <CustomeText fontSize={20} fontFamily="Okra-Bold" color="#fff">
                      {activeTab === TABS.SENT ? sentFiles?.length : receivedFiles?.length}
                    </CustomeText>
                    <CustomeText fontSize={11} color="rgba(255,255,255,0.5)">Files</CustomeText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <CustomeText fontSize={20} fontFamily="Okra-Bold" color="#fff">
                      {formatFileSize(
                        activeTab === TABS.SENT
                          ? totalSentBytes
                          : totalReceivedBytes || 0
                      )}
                    </CustomeText>
                    <CustomeText fontSize={11} color="rgba(255,255,255,0.5)">Transferred</CustomeText>
                  </View>
                </View>
              </LinearGradient>

              {/* Files List */}
              {(activeTab === TABS.SENT ? sentFiles?.length : receivedFiles?.length) > 0 ? (
                <FlatList
                  data={activeTab === TABS.SENT ? sentFiles : receivedFiles}
                  keyExtractor={item => item.id.toString()}
                  renderItem={renderItem}
                  contentContainerStyle={styles.fileList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                    style={styles.emptyIcon}
                  >
                    <Icon
                      name={activeTab === TABS.SENT ? 'arrow-up-circle' : 'arrow-down-circle'}
                      size={50}
                      color="rgba(255,255,255,0.3)"
                      iconFamily="Ionicons"
                    />
                  </LinearGradient>
                  <CustomeText fontSize={18} fontFamily="Okra-Bold" color="rgba(255,255,255,0.7)" style={{ marginTop: 16 }}>
                    No {activeTab === TABS.SENT ? 'sent' : 'received'} files yet
                  </CustomeText>
                  <CustomeText fontSize={14} color="rgba(255,255,255,0.4)" style={{ marginTop: 8 }}>
                    Files will appear here during transfer
                  </CustomeText>
                </View>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#00E5FF',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerGradient: {
    borderRadius: 30,
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  backButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  disconnectButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  disconnectButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsWrapper: {
    marginBottom: 16,
  },
  filesSection: {
    flex: 1,
  },
  tabBar: {
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    position: 'relative',
  },
  activeTab: {
    // Active state handled by gradient overlay
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginTop: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fileList: {
    paddingBottom: 20,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 4,
    marginVertical: 6,
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  openButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  openButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConnectionScreen;