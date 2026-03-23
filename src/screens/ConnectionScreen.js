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

const FileItem = ({ item, index, isSent, activeFileId }) => {
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

  const getFileIcon = mimeType => {
    const ext = mimeType?.includes('/')
      ? mimeType.split('/').pop().toLowerCase()
      : mimeType?.replace('.', '').toLowerCase();

    let iconName = 'document';
    let gradientColors = ['#94A3B8', '#64748B'];

    switch (ext) {
      case 'mp3':
      case 'wav':
      case 'm4a':
      case 'audio':
      case 'mpeg':
        iconName = 'musical-notes';
        gradientColors = ['#F472B6', '#DB2777'];
        break;

      case 'mp4':
      case 'mov':
      case 'video':
      case 'avi':
        iconName = 'videocam';
        gradientColors = ['#FCD34D', '#F59E0B'];
        break;

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'image':
      case 'gif':
        iconName = 'image';
        gradientColors = ['#6EE7B7', '#10B981'];
        break;

      case 'pdf':
      case 'file':
        iconName = 'document-text';
        gradientColors = ['#F87171', '#DC2626'];
        break;
    }

    return { iconName, gradientColors };
  };

  const renderThumbnail = mimeType => {
    const { iconName, gradientColors } = getFileIcon(mimeType);

    return (
      <LinearGradient
        colors={gradientColors}
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '3deg' }],
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <Icon name={iconName} size={20} color="#fff" iconFamily="Ionicons" />
        </View>
      </LinearGradient>
    );
  };

  const getMimeType = mimeType => {
    if (!mimeType) return '*/*';

    if (mimeType.includes('/')) {
      return mimeType;
    }

    const ext = mimeType.replace('.', '').toLowerCase();

    const types = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',

      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',

      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      aac: 'audio/aac',

      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      rtf: 'application/rtf',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      apk: 'application/vnd.android.package-archive',
    };

    console.log('Determining types:', ext, types[ext]);
    return types[ext] || '*/*';
  };
  return (
    <Animated.View
      style={{
        transform: [{ translateX }],
        opacity,
        marginHorizontal: 16,
        marginVertical: 6,
      }}
    >
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 15,
          borderRadius: 20,
          backgroundColor: '#fff',
        }}
      >
        <View style={styles.fileInfoContainer}>
          {renderThumbnail(item?.mimeType)}
          <View style={styles.fileDetails}>
            <CustomeText
              numberOfLines={1}
              fontFamily="Okra-Bold"
              fontSize={14}
              color="#1E293B"
            >
              {item?.name}
            </CustomeText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              <CustomeText
                fontSize={10}
                color="#475569"
                fontFamily="Okra-Medium"
              >
                {item?.mimeType?.toUpperCase()}
              </CustomeText>
              {/* </LinearGradient> */}
              <CustomeText
                fontSize={11}
                color="#64748B"
                fontFamily="Okra-Medium"
                style={{ marginLeft: 8 }}
              >
                {formatFileSize(item.size)}
              </CustomeText>
            </View>
          </View>
        </View>

        {
          !item?.available ? (
            // Still transferring — show loader for both sent and received
            <View style={[styles.loadingContainer]}>
              <ActivityIndicator color="#3B82F6" size="small" />
              <CustomeText
                fontSize={10}
                color="#475569"
                style={{ marginLeft: 4 }}
              >
                {activeFileId === item.id ? (isSent ? 'Transferring...' : 'Receiving...') : 'Waiting...'}
              </CustomeText>
            </View>
          ) : !isSent ? (
            // Received and done — show Open button
            <TouchableOpacity
              style={styles.openButton}
              onPress={() => {
                const uri = item?.uri || '';

                if (Platform.OS === 'ios') {
                  // Ensure exactly one file:// prefix
                  const iosPath = uri.startsWith('file://')
                    ? uri
                    : `file://${uri}`;
                  ReactNativeBlobUtil.ios
                    .openDocument(iosPath)
                    .catch(err => console.error('Error opening file:', err));
                } else {
                  // Android: content:// URIs work directly with actionViewIntent.
                  // file:// URIs must be passed as-is (no double prefix).
                  // Strip any accidental double prefix like file://file:/ or /file:/
                  let androidUri = uri;
                  if (androidUri.startsWith('file://file://')) {
                    androidUri = androidUri.replace(
                      'file://file://',
                      'file://',
                    );
                  } else if (androidUri.startsWith('/file:/')) {
                    androidUri = 'file://' + androidUri.replace('/file:/', '');
                  }
                  ReactNativeBlobUtil.android
                    .actionViewIntent(androidUri, getMimeType(item.mimeType))
                    .catch(err => console.error('Error opening file:', err));
                }
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.openButtonGradient,
                  {
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                    backgroundColor: '#3B82F6',
                  },
                ]}
              >
                <CustomeText fontFamily="Okra-Bold" fontSize={12} color="#fff">
                  Open
                </CustomeText>
              </View>
            </TouchableOpacity>
          ) : null /* Sent and done — show nothing */
        }
      </View>
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
    activeFileId,
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
  const prevReceivedLength = useRef(0);
  useEffect(() => {
    if (receivedFiles?.length > prevReceivedLength.current) {
      setActiveTab(TABS.RECEIVED);
    }
    prevReceivedLength.current = receivedFiles?.length || 0;
  }, [receivedFiles]);

  const prevSentLength = useRef(0);
  useEffect(() => {
    console.log('SENT FILES UPDATED:', sentFiles?.length);
    if (sentFiles?.length > prevSentLength.current) {
      setActiveTab(TABS.SENT);
    }
    prevSentLength.current = sentFiles?.length || 0;
  }, [sentFiles]);
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
    goBack();
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
  const renderItem = ({ item, index }) =>
    console.log('Rendering file item:', item) || (
      <FileItem item={item} index={index} isSent={activeTab === TABS.SENT} activeFileId={activeFileId} />
    );

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
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
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleGoBack}
                    style={styles.backButton}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255,255,255,0.2)',
                        'rgba(255,255,255,0.1)',
                      ]}
                      style={styles.backButtonGradient}
                    >
                      <Icon
                        name="arrow-back"
                        iconFamily="Ionicons"
                        size={22}
                        color="#fff"
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                  <View>
                    <CustomeText
                      fontSize={12}
                      color="rgba(255,255,255,0.6)"
                      fontFamily="Okra-Medium"
                    >
                      Active Connection
                    </CustomeText>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <View style={styles.activeDot} />
                      <CustomeText
                        fontSize={16}
                        fontFamily="Okra-Bold"
                        color="#fff"
                      >
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
                    <Icon
                      name="close-circle"
                      size={20}
                      color="#fff"
                      iconFamily="Ionicons"
                    />
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
              <View style={styles.tabBar}>
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabChange(TABS.SENT)}
                    style={styles.tab}
                  >
                    {activeTab === TABS.SENT && (
                      <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    <View style={styles.tabContent}>
                      <Icon
                        name="arrow-up-circle"
                        size={18}
                        color={
                          activeTab === TABS.SENT
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)'
                        }
                        iconFamily="Ionicons"
                      />
                      <CustomeText
                        fontSize={13}
                        fontFamily="Okra-Bold"
                        color={
                          activeTab === TABS.SENT
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)'
                        }
                        style={{ marginLeft: 6 }}
                      >
                        Sent
                      </CustomeText>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleTabChange(TABS.RECEIVED)}
                    style={styles.tab}
                  >
                    {activeTab === TABS.RECEIVED && (
                      <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    <View style={styles.tabContent}>
                      <Icon
                        name="arrow-down-circle"
                        size={18}
                        color={
                          activeTab === TABS.RECEIVED
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)'
                        }
                        iconFamily="Ionicons"
                      />
                      <CustomeText
                        fontSize={13}
                        fontFamily="Okra-Bold"
                        color={
                          activeTab === TABS.RECEIVED
                            ? '#fff'
                            : 'rgba(255,255,255,0.5)'
                        }
                        style={{ marginLeft: 6 }}
                      >
                        Received
                      </CustomeText>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Transfer Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <CustomeText
                      fontSize={20}
                      fontFamily="Okra-Bold"
                      color="#fff"
                    >
                      {activeTab === TABS.SENT
                        ? sentFiles?.length
                        : receivedFiles?.length}
                    </CustomeText>
                    <CustomeText fontSize={11} color="rgba(255,255,255,0.5)">
                      Files
                    </CustomeText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <CustomeText
                      fontSize={20}
                      fontFamily="Okra-Bold"
                      color="#fff"
                    >
                      {formatFileSize(
                        activeTab === TABS.SENT
                          ? totalSentBytes
                          : totalReceivedBytes || 0,
                      )}
                    </CustomeText>
                    <CustomeText fontSize={11} color="rgba(255,255,255,0.5)">
                      {activeTab === TABS.SENT ? 'Sent' : 'Received'}
                    </CustomeText>
                  </View>
                </View>
              </View>
              {/* Tab Bar with Gradient */}
              {/* <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.tabBar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              > */}

              {/* </LinearGradient> */}

              {/* Files List */}
              {(activeTab === TABS.SENT
                ? sentFiles?.length
                : receivedFiles?.length) > 0 ? (
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
                      name={
                        activeTab === TABS.SENT
                          ? 'arrow-up-circle'
                          : 'arrow-down-circle'
                      }
                      size={50}
                      color="rgba(255,255,255,0.3)"
                      iconFamily="Ionicons"
                    />
                  </LinearGradient>
                  <CustomeText
                    fontSize={18}
                    fontFamily="Okra-Bold"
                    color="rgba(255,255,255,0.7)"
                    style={{ marginTop: 16 }}
                  >
                    No {activeTab === TABS.SENT ? 'sent' : 'received'} files yet
                  </CustomeText>
                  <CustomeText
                    fontSize={14}
                    color="rgba(255,255,255,0.4)"
                    style={{ marginTop: 8 }}
                  >
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
    height: 44,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  tabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 20,
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
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  openButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
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
