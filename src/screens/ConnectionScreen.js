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
  Alert,
  Modal,
  BackHandler,
} from 'react-native';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTCP } from '../service/TCPProvider';
import Icon from '../components/global/Icon';
import { goBack, resetAndNavigate } from '../utils/NavigationUtil';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import CustomeText from '../components/global/CustomeText';
import Options from '../components/home/Options';
import { formatFileSize } from '../utils/libraryHelpers';
import { Colors } from '../utils/Constants';
import ReactNativeBlobUtil from 'react-native-blob-util';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');

const FileItem = ({
  item,
  index,
  isSent,
  activeFileId,
  isSelected,
  isSelectionMode,
  onLongPress,
  onPress,
  onShare,
  onDelete,
  onOpen,
}) => {
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
          width: 28,
          height: 28,
          borderRadius: 6,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '3deg' }],
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <Icon name={iconName} size={14} color="#fff" iconFamily="Ionicons" />
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
        marginVertical: 4,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 10,
          borderRadius: 12,
          backgroundColor: isSelected ? '#F0F7FF' : '#fff',
          borderWidth: isSelected ? 1.5 : 0,
          borderColor: '#3B82F6',
        }}
      >
        <View style={styles.fileInfoContainer}>
          {renderThumbnail(item?.mimeType)}
          <View style={styles.fileDetails}>
            <CustomeText
              numberOfLines={1}
              fontFamily="Okra-Bold"
              fontSize={13}
              color="#1E293B"
            >
              {item?.name}
            </CustomeText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 2,
                flexWrap: 'wrap',
              }}
            >
              <CustomeText
                fontSize={11}
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

        {isSelectionMode && (
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: isSelected ? '#3B82F6' : '#CBD5E1',
              backgroundColor: isSelected ? '#3B82F6' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isSelected && (
              <Icon
                name="checkmark"
                size={14}
                color="#fff"
                iconFamily="Ionicons"
              />
            )}
          </View>
        )}

        {!isSelectionMode &&
          (!item?.available ? (
            // Still transferring or waiting
            <View style={[styles.loadingContainer]}>
              <ActivityIndicator color="#3B82F6" size="small" />
              <CustomeText
                fontSize={10}
                color="#475569"
                style={{ marginLeft: 4 }}
              >
                {activeFileId === item.id
                  ? isSent
                    ? 'Transferring...'
                    : 'Receiving...'
                  : 'Waiting...'}
              </CustomeText>
            </View>
          ) : !isSent ? (
            // Received and done — show same menu as Received Screen
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => onShare(item)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#F1F5F9',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 4,
                }}
              >
                <Icon
                  name="share-outline"
                  iconFamily="Ionicons"
                  size={14}
                  color="#475569"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onDelete(item)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#FEF2F2',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 4,
                }}
              >
                <Icon
                  name="trash-outline"
                  iconFamily="Ionicons"
                  size={14}
                  color="#EF4444"
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => onOpen(item)}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    name="eye-outline"
                    iconFamily="Ionicons"
                    size={14}
                    color="#fff"
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            // Sent and done
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon
                name="checkmark-done-circle"
                size={18}
                color="#10B981"
                iconFamily="Ionicons"
              />
              <CustomeText
                fontSize={10}
                color="#10B981"
                style={{ marginLeft: 4 }}
              >
                Sent
              </CustomeText>
            </View>
          ))}
      </TouchableOpacity>
    </Animated.View>
  );
};
const ConnectionScreen = () => {
  const navigation = useNavigation();
  const {
    connectedDevice,
    disconnect,
    sendFileAck,
    sentFiles,
    receivedFiles,
    totalSentBytes,
    totalReceivedBytes,
    isConnected,
    activeFileId,
    activeFileTotalSize,
    activeFileTransferredBytes,
    batchTotalFiles,
    batchTotalSize,
    startServer,
    sendBatchAck,
    setReceivedFiles,
  } = useTCP();

  const insets = useSafeAreaInsets();
  const TABS = {
    SENT: 'SENT',
    RECEIVED: 'RECEIVED',
  };

  const [activeTab, setActiveTab] = useState(TABS.SENT);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const selectionAnim = useRef(new Animated.Value(0)).current;

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning', // 'warning' or 'success'
  });
  const [showSummary, setShowSummary] = useState(false);
  const activeFileIdRef = useRef(activeFileId);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const allFiles = [...(sentFiles || []), ...(receivedFiles || [])];
  const activeFile = allFiles.find(f => f.id === activeFileId);
  const isSendingActive = activeFileId
    ? sentFiles?.some(f => f.id === activeFileId)
    : activeTab === TABS.SENT;

  const activeFilesList = activeTab === TABS.SENT ? sentFiles : receivedFiles;
  const totalFilesCount = activeFilesList?.length || 0;
  const completedFilesCount =
    activeFilesList?.filter(f => f.available).length || 0;
  const remainingFilesCount = totalFilesCount - completedFilesCount;

  // Global counts for navigation guard
  const globalTotalFiles = sentFiles?.length + receivedFiles?.length || 0;
  const globalRemainingFiles = [
    ...(sentFiles || []),
    ...(receivedFiles || []),
  ].filter(f => !f.available).length;

  const totalBatchSize =
    activeFilesList?.reduce((acc, f) => acc + (f.size || 0), 0) || 0;
  const totalBatchTransferred =
    activeTab === TABS.SENT ? totalSentBytes : totalReceivedBytes;
  const totalBatchRemaining = Math.max(
    0,
    totalBatchSize - totalBatchTransferred,
  );

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

  // Navigation guard & BackHandler
  useEffect(() => {
    const handleBackAction = () => {
      if (isConnected) {
        setConfirmModal({
          visible: true,
          title: 'Disconnect?',
          message:
            globalRemainingFiles > 0
              ? 'A file transfer is in progress. Are you sure you want to disconnect and leave?'
              : 'Are you sure you want to disconnect and leave?',
          type: 'warning',
          confirmText: 'Disconnect',
          cancelText: 'Stay',
          onConfirm: () => {
            disconnect();
            navigation.goBack();
          },
        });
        return true; // Prevent default
      }
      return false; // Allow default
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackAction,
    );

    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!isConnected) return; // Action already allowed/intentional

      // Prevent default behavior
      e.preventDefault();

      setConfirmModal({
        visible: true,
        title: 'Disconnect?',
        message:
          globalRemainingFiles > 0
            ? 'A file transfer is in progress. Are you sure you want to disconnect and leave?'
            : 'Are you sure you want to disconnect and leave?',
        type: 'warning',
        confirmText: 'Disconnect',
        cancelText: 'Stay',
        onConfirm: () => {
          disconnect();
          navigation.dispatch(e.data.action);
        },
      });
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation, isConnected, globalRemainingFiles, disconnect]);

  // Completion notification
  const prevRemaining = useRef(remainingFilesCount);
  useEffect(() => {
    if (
      prevRemaining.current > 0 &&
      remainingFilesCount === 0 &&
      totalFilesCount > 0
    ) {
      setConfirmModal({
        visible: true,
        title: 'Transfer Complete',
        message: `Successfully ${
          activeTab === TABS.SENT ? 'sent' : 'received'
        } ${totalFilesCount} files!`,
        type: 'success',
        confirmText: 'Awesome',
        onConfirm: () => {},
      });
      setShowSummary(true);
    }
    prevRemaining.current = remainingFilesCount;
  }, [remainingFilesCount, totalFilesCount, activeTab]);

  const handleTabChange = tab => {
    setActiveTab(tab);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleDisconnectRequest = () => {
    setConfirmModal({
      visible: true,
      title: 'Disconnect Now?',
      message:
        'Are you sure you want to disconnect? This will cancel any ongoing transfers.',
      type: 'warning',
      confirmText: 'Disconnect',
      cancelText: 'Stay',
      onConfirm: () => {
        disconnect();
      },
    });
  };

  const onMediaPickedUp = media => {
    console.log('Picked media array:', media);
    setShowSummary(false);
    sendBatchAck(media, 'image');
  };

  const onFilePickedUp = files => {
    console.log('Picked files array:', files);
    setShowSummary(false);
    sendBatchAck(files, 'file');
  };

  const toggleSelection = fileId => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        const next = prev.filter(id => id !== fileId);
        if (next.length === 0) setIsSelectionMode(false);
        return next;
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleLongPress = file => {
    if (activeTab === TABS.RECEIVED && !isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedFiles([file.id]);
    }
  };

  const handlePress = file => {
    if (isSelectionMode) {
      toggleSelection(file.id);
    } else {
      openFile(file);
    }
  };

  const openFile = file => {
    if (!file || !file.uri) return;

    let path = file.uri;
    // Standardize to absolute path (strip various file:// prefixes)
    if (path.startsWith('file://')) {
      path = path.replace('file://', '');
    } else if (path.startsWith('/file:/')) {
      path = path.replace('/file:/', '');
    } else if (path.startsWith('file:/')) {
      path = path.replace('file:/', '');
    }

    // Ensure it's an absolute path and then prepend exactly file:///
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const finalUri = `file://${path}`;

    // Robust extension-to-mime detection (handle optional dot)
    const ext = (file.mimeType?.toLowerCase() || '').replace('.', '');
    let mime = '*/*';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      mime = 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
    } else if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) {
      mime =
        'video/' +
        (ext === 'mov' ? 'quicktime' : ext === 'mkv' ? 'x-matroska' : 'mp4');
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
      mime = 'audio/mpeg';
    } else if (ext === 'pdf') {
      mime = 'application/pdf';
    }

    if (Platform.OS === 'ios') {
      ReactNativeBlobUtil.ios.openDocument(finalUri).catch(console.log);
    } else {
      ReactNativeBlobUtil.android
        .actionViewIntent(finalUri, mime)
        .catch(err => {
          console.log('ActionViewIntent Error:', err);
          // Fallback to simple absolute path if URI scheme failed
          ReactNativeBlobUtil.android
            .actionViewIntent(path, mime)
            .catch(console.log);
        });
    }
  };

  const deleteSelectedFiles = () => {
    if (selectedFiles.length === 0) return;

    const filesToDelete = receivedFiles.filter(f =>
      selectedFiles.includes(f.id),
    );
    const isMultiple = filesToDelete.length > 1;

    setConfirmModal({
      visible: true,
      title: isMultiple ? 'Delete Files?' : 'Delete File?',
      message: isMultiple
        ? `Are you sure you want to delete these ${filesToDelete.length} files?`
        : `Are you sure you want to delete "${filesToDelete[0].name}"?`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          for (const f of filesToDelete) {
            if (f.uri) {
              await RNFS.unlink(f.uri).catch(() => {});
            }
          }

          setReceivedFiles(prev =>
            prev.filter(f => !selectedFiles.includes(f.id)),
          );
          setIsSelectionMode(false);
          setSelectedFiles([]);
          setConfirmModal(prev => ({ ...prev, visible: false }));
        } catch (error) {
          console.log('Delete Error:', error);
          setConfirmModal(prev => ({ ...prev, visible: false }));
          Alert.alert('Error', 'Could not delete file(s)');
        }
      },
    });
  };

  const shareSelectedFiles = async () => {
    try {
      const filesToShare = receivedFiles.filter(f =>
        selectedFiles.includes(f.id),
      );
      if (filesToShare.length === 0) return;

      const results = [];
      for (const f of filesToShare) {
        if (!f || !f.uri) continue;
        const exists = await RNFS.exists(f.uri);
        if (exists) {
          const path = f.uri.startsWith('file://') ? f.uri : `file://${f.uri}`;
          results.push(path);
        }
      }

      if (results.length === 0) {
        Alert.alert('Error', 'No valid files to share');
        return;
      }

      await Share.open({
        urls: results,
        title: 'Share Files',
        failOnCancel: false,
      });

      setIsSelectionMode(false);
      setSelectedFiles([]);
    } catch (error) {
      console.log('Share Error:', error);
      if (error?.message && !error.message.includes('User did not share')) {
        Alert.alert('Share Error', error.message);
      }
    }
  };

  const deleteFile = file => {
    setConfirmModal({
      visible: true,
      title: 'Delete File?',
      message: `Are you sure you want to delete "${file.name}"?`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          if (file.uri) {
            await RNFS.unlink(file.uri).catch(() => {});
          }
          setReceivedFiles(prev => prev.filter(f => f.id !== file.id));
          setConfirmModal(prev => ({ ...prev, visible: false }));
        } catch (error) {
          console.log('Delete Error:', error);
          setConfirmModal(prev => ({ ...prev, visible: false }));
          Alert.alert('Error', 'Could not delete file');
        }
      },
    });
  };

  const shareFile = async file => {
    try {
      if (!file || !file.uri) return;
      const exists = await RNFS.exists(file.uri);
      if (!exists) {
        Alert.alert('Error', 'File no longer exists');
        return;
      }

      await Share.open({
        url: file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`,
        title: 'Share File',
        failOnCancel: false,
      });
    } catch (error) {
      console.log('Share Error:', error);
    }
  };

  const selectAllReceived = () => {
    const allIds = receivedFiles.map(f => f.id);
    setSelectedFiles(allIds);
  };

  const unselectAll = () => {
    setSelectedFiles([]);
    setIsSelectionMode(false);
  };

  // Selection bar animation
  useEffect(() => {
    Animated.spring(selectionAnim, {
      toValue: isSelectionMode ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [isSelectionMode]);

  // Simplified renderItem now passes selection props
  const renderItem = ({ item, index }) => (
    <FileItem
      item={item}
      index={index}
      isSent={activeTab === TABS.SENT}
      activeFileId={activeFileId}
      isSelected={selectedFiles.includes(item.id)}
      isSelectionMode={isSelectionMode}
      onLongPress={handleLongPress}
      onPress={handlePress}
      onShare={shareFile}
      onDelete={deleteFile}
      onOpen={openFile}
    />
  );

  const TransferProgress = ({
    activeFile,
    transferredBytes,
    totalBytes,
    isSent,
    totalFiles,
    completedFiles,
    remainingFiles,
    batchTransferred,
    batchTotal,
    showSummary,
    onDismiss,
  }) => {
    // Keep visible if there's a batch in progress, just finished, or summary is active
    const isBatchActive = totalFiles > 0 && remainingFiles > 0;
    const isFinished = totalFiles > 0 && remainingFiles === 0;

    if (!isBatchActive && !activeFileId && !showSummary) return null;

    const progress =
      batchTotal > 0 ? batchTransferred / batchTotal : isFinished ? 1 : 0;

    return (
      <Animated.View
        style={[
          styles.transferProgressContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['hsla(0, 0%, 100%, 0.15)', 'rgba(255,255,255,0.05)']}
          style={styles.progressGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ padding: 16 }}>
            <View style={styles.progressHeader}>
              <View style={styles.progressInfo}>
                <Icon
                  name={
                    isFinished
                      ? 'checkmark-circle'
                      : isSent
                      ? 'cloud-upload'
                      : 'cloud-download'
                  }
                  size={20}
                  color={isFinished ? '#10B981' : '#00E5FF'}
                  iconFamily="Ionicons"
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <CustomeText
                    fontSize={14}
                    fontFamily="Okra-Bold"
                    color="#fff"
                    numberOfLines={1}
                  >
                    {isFinished
                      ? 'Transfer Complete'
                      : activeFile
                      ? `${isSent ? 'Sending' : 'Receiving'} ${
                          completedFiles + 1
                        } of ${totalFiles} files`
                      : `Preparing next file... (${completedFiles} of ${totalFiles} done)`}
                  </CustomeText>
                  <CustomeText fontSize={11} color="rgba(255,255,255,0.6)">
                    {isFinished
                      ? `${totalFiles} files • ${formatFileSize(batchTotal)}`
                      : `${Math.round(progress * 100)}% • ${formatFileSize(
                          Math.max(0, batchTotal - batchTransferred),
                        )} remaining`}
                  </CustomeText>
                </View>

                {(isFinished || !isSent) && (
                  <TouchableOpacity
                    onPress={onDismiss}
                    style={{
                      padding: 4,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                    }}
                  >
                    <Icon
                      name="close"
                      size={16}
                      color="#fff"
                      iconFamily="Ionicons"
                    />
                  </TouchableOpacity>
                )}
                {!isFinished && isSent && (
                  <ActivityIndicator size="small" color="#00E5FF" />
                )}
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>

            {/* New detailed stats row as requested */}
            <View style={[styles.progressStats, { marginBottom: 10 }]}>
              <View style={styles.miniStat}>
                <CustomeText fontSize={10} color="rgba(255,255,255,0.5)">
                  Total Files
                </CustomeText>
                <CustomeText fontSize={12} fontFamily="Okra-Bold" color="#fff">
                  {totalFiles}
                </CustomeText>
              </View>
              <View style={styles.miniStat}>
                <CustomeText fontSize={10} color="rgba(255,255,255,0.5)">
                  {isSent ? 'Sent' : 'Received'}
                </CustomeText>
                <CustomeText fontSize={12} fontFamily="Okra-Bold" color="#fff">
                  {completedFiles}
                </CustomeText>
              </View>
              <View style={styles.miniStat}>
                <CustomeText fontSize={10} color="rgba(255,255,255,0.5)">
                  Remaining
                </CustomeText>
                <CustomeText fontSize={12} fontFamily="Okra-Bold" color="#fff">
                  {remainingFiles}
                </CustomeText>
              </View>
            </View>

            <View style={styles.progressStats}>
              <View>
                <CustomeText fontSize={10} color="rgba(255,255,255,0.5)">
                  Total {isSent ? 'Sent' : 'Received'}
                </CustomeText>
                <CustomeText fontSize={12} fontFamily="Okra-Bold" color="#fff">
                  {formatFileSize(batchTransferred)}
                </CustomeText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <CustomeText fontSize={10} color="rgba(255,255,255,0.5)">
                  Total Batch Size
                </CustomeText>
                <CustomeText fontSize={12} fontFamily="Okra-Bold" color="#fff">
                  {formatFileSize(batchTotal)}
                </CustomeText>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const ConfirmationModal = () => (
    <Modal
      transparent
      visible={confirmModal.visible}
      animationType="fade"
      onRequestClose={() =>
        setConfirmModal({ ...confirmModal, visible: false })
      }
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: headerScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            <View
              style={{
                padding: 28, // Increased general padding
                paddingBottom: 20,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={styles.modalIconContainer}>
                <View
                  style={[
                    styles.iconBackground,
                    {
                      backgroundColor:
                        confirmModal.type === 'warning'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'rgba(16, 185, 129, 0.1)',
                    },
                  ]}
                >
                  <Icon
                    name={
                      confirmModal.type === 'warning'
                        ? 'alert-circle'
                        : 'checkmark-circle'
                    }
                    size={40}
                    color={
                      confirmModal.type === 'warning' ? '#EF4444' : '#10B981'
                    }
                    iconFamily="Ionicons"
                  />
                </View>
              </View>

              <CustomeText
                fontSize={18}
                fontFamily="Okra-Bold"
                color="#fff"
                style={{ textAlign: 'center', marginBottom: 10 }}
              >
                {confirmModal.title}
              </CustomeText>

              <CustomeText
                fontSize={14}
                color="rgba(255,255,255,0.7)"
                style={{ textAlign: 'center', marginBottom: 20 }}
              >
                {confirmModal.message}
              </CustomeText>

              <View style={styles.modalButtons}>
                {confirmModal.type === 'warning' && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() =>
                      setConfirmModal({ ...confirmModal, visible: false })
                    }
                  >
                    <CustomeText
                      fontSize={14}
                      fontFamily="Okra-Bold"
                      color="#fff"
                    >
                      {confirmModal.cancelText || 'Stay'}
                    </CustomeText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.confirmButton,
                    confirmModal.type === 'success' && { flex: 1 },
                  ]}
                  onPress={() => {
                    setConfirmModal({ ...confirmModal, visible: false });
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                  }}
                >
                  <LinearGradient
                    colors={
                      confirmModal.type === 'warning'
                        ? ['#EF4444', '#DC2626']
                        : ['#10B981', '#059669']
                    }
                    style={styles.confirmButtonGradient}
                  >
                    <CustomeText
                      fontSize={14}
                      fontFamily="Okra-Bold"
                      color="#fff"
                    >
                      {confirmModal.type === 'warning'
                        ? confirmModal.confirmText || 'Disconnect'
                        : confirmModal.confirmText || 'Awesome'}
                    </CustomeText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <ConfirmationModal />
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
                  onPress={handleDisconnectRequest}
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

            <TransferProgress
              activeFile={activeFile}
              transferredBytes={activeFileTransferredBytes}
              totalBytes={activeFileTotalSize}
              isSent={isSendingActive}
              totalFiles={batchTotalFiles || totalFilesCount}
              completedFiles={completedFilesCount}
              remainingFiles={
                batchTotalFiles
                  ? batchTotalFiles - completedFilesCount
                  : remainingFilesCount
              }
              batchTransferred={totalBatchTransferred}
              batchTotal={batchTotalSize || totalBatchSize}
              showSummary={showSummary}
              onDismiss={() => setShowSummary(false)}
            />

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

                {/* Transfer Stats - Only show if no active transfer to save space */}
                {/* {!activeFileId && (
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
                )} */}
              </View>

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

        {/* Floating Selection Bar */}
        {isSelectionMode && (
          <Animated.View
            style={[
              styles.selectionBarContainer,
              {
                bottom: insets.bottom + 16,
                transform: [
                  {
                    translateY: selectionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#1a1a2e', '#16213e']}
              style={styles.selectionBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.selectionInfo}>
                <View style={styles.selectionCount}>
                  <CustomeText
                    fontSize={16}
                    fontFamily="Okra-Bold"
                    color="#fff"
                  >
                    {selectedFiles.length}
                  </CustomeText>
                </View>
                <TouchableOpacity
                  onPress={unselectAll}
                  style={{ marginLeft: 8 }}
                >
                  <CustomeText fontSize={12} color="rgba(255,255,255,0.6)">
                    Deselect
                  </CustomeText>
                </TouchableOpacity>
              </View>

              <View style={styles.selectionActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                  ]}
                  onPress={selectAllReceived}
                >
                  <Icon
                    name="checkbox"
                    size={18}
                    color="#3B82F6"
                    iconFamily="Ionicons"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                  ]}
                  onPress={shareSelectedFiles}
                >
                  <Icon
                    name="share-social"
                    size={18}
                    color="#10B981"
                    iconFamily="Ionicons"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                  ]}
                  onPress={deleteSelectedFiles}
                >
                  <Icon
                    name="trash"
                    size={18}
                    color="#EF4444"
                    iconFamily="Ionicons"
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
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
    padding: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  disconnectButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsWrapper: {
    marginBottom: 4,
  },
  filesSection: {
    flex: 1,
  },
  tabBar: {
    borderRadius: 24,
    padding: 8,
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 36,
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
  transferProgressContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressGradient: {
    borderRadius: 20, // Ensure the gradient itself has the radius for clipping
    overflow: 'hidden', // Required for iOS borderRadius
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressBarContainer: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniStat: {
    alignItems: 'center',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12, // Increased padding
    marginTop: 6, // Adjusted margin
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fileList: {
    paddingBottom: 100, // Extra padding for the floating bar
  },
  fileItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 16,
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
    marginLeft: 10,
  },
  openButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalGradient: {
    borderRadius: 25, // Match modalContent radius
    overflow: 'hidden',
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  confirmButton: {},
  confirmButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConnectionScreen;
