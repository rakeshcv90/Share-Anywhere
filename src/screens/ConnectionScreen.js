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
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import KeepAwake from 'react-native-keep-awake';
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
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

import { formatFileSize, saveVCFToContacts } from '../utils/libraryHelpers';
import ReactNativeBlobUtil from 'react-native-blob-util';
import LinearGradient from 'react-native-linear-gradient';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradePromptModal from '../components/modals/UpgradePromptModal';

const { width, height: screenHeight } = Dimensions.get('window');

const FileItem = React.memo(
  ({
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
    onSaveContact,
    isPaused,
    activeFileTotalSize,
    activeFileTransferredBytes,
  }) => {
    const hasAnimated = useRef(false);
    const itemAnim = useRef(
      new Animated.Value(hasAnimated.current ? 1 : 0),
    ).current;
    const { colors, isDark } = useTheme();

    useEffect(() => {
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        const itemDelay = Math.min(index * 80, 600); // Cap delay at 600ms
        Animated.timing(itemAnim, {
          toValue: 1,
          duration: 400,
          delay: itemDelay,
          useNativeDriver: true,
        }).start();
      }
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
        case 'vcf':
          iconName = item.name.toLowerCase().endsWith('.vcf')
            ? 'person'
            : 'document-text';
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
            <Icon
              name={iconName}
              size={14}
              color="#fff"
              iconFamily="Ionicons"
            />
          </View>
        </LinearGradient>
      );
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
            backgroundColor: isSelected ? colors.accent + '18' : colors.surface,
            borderWidth: isSelected ? 1.5 : 1,
            borderColor: isSelected ? colors.accent : colors.border,
          }}
        >
          <View style={styles.fileInfoContainer}>
            {renderThumbnail(
              item?.mimeType || (item?.name?.endsWith('.vcf') ? 'vcf' : ''),
            )}
            <View style={styles.fileDetails}>
              <CustomeText
                numberOfLines={1}
                fontFamily="Okra-Bold"
                fontSize={13}
                color={colors.text}
              >
                {item?.name}
              </CustomeText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 2,
                }}
              >
                <CustomeText
                  fontSize={11}
                  color={colors.subtext}
                  fontFamily="Okra-Medium"
                >
                  {formatFileSize(item.size)}
                </CustomeText>
              </View>
            </View>
          </View>

          {isSelectionMode ? (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? colors.accent : colors.border,
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
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {!item?.available ? (
                <View
                  style={[
                    styles.loadingContainer,
                    activeFileId === item.id
                      ? {
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          width: 80,
                        }
                      : { flexDirection: 'row', alignItems: 'center' },
                  ]}
                >
                  {activeFileId === item.id ? (
                    <>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          marginBottom: 4,
                        }}
                      >
                        <CustomeText
                          fontSize={10}
                          color="#3B82F6"
                          fontFamily="Okra-Bold"
                        >
                          {isPaused
                            ? 'Paused'
                            : isSent
                            ? 'Sending'
                            : 'Receiving'}
                        </CustomeText>
                        <CustomeText fontSize={10} color={colors.subtext}>
                          {activeFileTotalSize > 0
                            ? Math.round(
                                (activeFileTransferredBytes /
                                  activeFileTotalSize) *
                                  100,
                              )
                            : 0}
                          %
                        </CustomeText>
                      </View>
                      <View
                        style={{
                          height: 3,
                          width: '100%',
                          backgroundColor: colors.border,
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                activeFileTotalSize > 0
                                  ? (activeFileTransferredBytes /
                                      activeFileTotalSize) *
                                      100
                                  : 0,
                              ),
                            )}%`,
                            backgroundColor: isPaused ? '#10B981' : '#3B82F6',
                          }}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <ActivityIndicator color="#3B82F6" size="small" />
                      <CustomeText
                        fontSize={10}
                        color="#475569"
                        style={{ marginLeft: 4 }}
                      >
                        Waiting...
                      </CustomeText>
                    </>
                  )}
                </View>
              ) : !isSent ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item?.name?.toLowerCase().endsWith('.vcf') && (
                    <TouchableOpacity
                      onPress={() => onSaveContact(item)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 6,
                      }}
                    >
                      <Icon
                        name="person-add"
                        iconFamily="Ionicons"
                        size={14}
                        color="#10B981"
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => onShare(item)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#F1F5F9',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 6,
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
                      marginRight: 6,
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
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  },
); // End of FileItem (React.memo)

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
  fadeAnim,
  slideAnim,
  activeFileId,
  colors,
  isPaused,
  onTogglePause,
  connectedDevices,
}) => {
  const isBatchActive = totalFiles > 0 && remainingFiles > 0;
  const isFinished = totalFiles > 0 && remainingFiles === 0;

  const progress =
    batchTotal > 0
      ? Math.min(1, batchTransferred / batchTotal)
      : isFinished
      ? 1
      : 0;

  // Smooth animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false, // width cannot use native driver
      friction: 8,
      tension: 60,
    }).start();
  }, [progress]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  if (!isBatchActive && !activeFileId && !showSummary) return null;

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
        colors={
          colors
            ? [colors.surface, colors.surfaceAlt]
            : ['hsla(0, 0%, 100%, 0.15)', 'rgba(255,255,255,0.05)']
        }
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
                  color={colors?.text || '#fff'}
                  numberOfLines={1}
                >
                  {isFinished
                    ? 'Transfer Complete'
                    : activeFile
                    ? `${isSent ? 'Broadcasting to ' + connectedDevices.length + ' receivers' : 'Receiving'} ${
                        completedFiles + 1
                      } of ${totalFiles} files${isPaused ? ' (Paused)' : ''}`
                    : `Preparing next file... (${completedFiles} of ${totalFiles} done)`}
                </CustomeText>
                {!isFinished && activeFile?.name && (
                  <CustomeText
                    fontSize={12}
                    fontFamily="Okra-Bold"
                    color="#00E5FF"
                    numberOfLines={1}
                    style={{ marginVertical: 2 }}
                  >
                    {activeFile.name}
                  </CustomeText>
                )}
                <CustomeText
                  fontSize={11}
                  color={colors?.subtext || 'rgba(255,255,255,0.6)'}
                >
                  {isFinished
                    ? `${totalFiles} files • ${formatFileSize(batchTotal)}`
                    : `${Math.round(progress * 100)}% • ${formatFileSize(
                        Math.max(0, batchTotal - batchTransferred),
                      )} remaining`}
                </CustomeText>
              </View>
            </View>

            {!isFinished && (
              <TouchableOpacity
                onPress={onTogglePause}
                activeOpacity={0.7}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: isPaused ? '#10B981' : '#3B82F6',
                  borderRadius: 14,
                  marginLeft: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Icon
                  name={isPaused ? 'play' : 'pause'}
                  size={14}
                  color="#fff"
                  iconFamily="Ionicons"
                />
                <CustomeText
                  color="#fff"
                  fontSize={12}
                  fontFamily="Okra-Bold"
                  style={{ marginLeft: 4 }}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </CustomeText>
              </TouchableOpacity>
            )}

            {(isFinished || !isSent) && !isPaused && (
              <TouchableOpacity
                onPress={onDismiss}
                style={{
                  padding: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  marginLeft: 8,
                }}
              >
                <Icon
                  name="close"
                  size={18}
                  color="#fff"
                  iconFamily="Ionicons"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* 
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[styles.progressBarFill, { width: animatedWidth }]}
              />
            </View>
          </View>
          */}

          {/* New detailed stats row as requested */}
          <View style={[styles.progressStats, { marginBottom: 10 }]}>
            <View style={styles.miniStat}>
              <CustomeText
                fontSize={10}
                color={colors?.subtext || 'rgba(255,255,255,0.5)'}
              >
                Total Files
              </CustomeText>
              <CustomeText
                fontSize={12}
                fontFamily="Okra-Bold"
                color={colors?.text || '#fff'}
              >
                {totalFiles}
              </CustomeText>
            </View>
            <View style={styles.miniStat}>
              <CustomeText
                fontSize={10}
                color={colors?.subtext || 'rgba(255,255,255,0.5)'}
              >
                {isSent ? 'Sent' : 'Received'}
              </CustomeText>
              <CustomeText
                fontSize={12}
                fontFamily="Okra-Bold"
                color={colors?.text || '#fff'}
              >
                {completedFiles}
              </CustomeText>
            </View>
            <View style={styles.miniStat}>
              <CustomeText
                fontSize={10}
                color={colors?.subtext || 'rgba(255,255,255,0.5)'}
              >
                Remaining
              </CustomeText>
              <CustomeText
                fontSize={12}
                fontFamily="Okra-Bold"
                color={colors?.text || '#fff'}
              >
                {remainingFiles}
              </CustomeText>
            </View>
          </View>

          <View style={styles.progressStats}>
            <View>
              <CustomeText
                fontSize={10}
                color={colors?.subtext || 'rgba(255,255,255,0.5)'}
              >
                Total {isSent ? 'Sent' : 'Received'}
              </CustomeText>
              <CustomeText
                fontSize={12}
                fontFamily="Okra-Bold"
                color={colors?.text || '#fff'}
              >
                {formatFileSize(batchTransferred)}
              </CustomeText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <CustomeText
                fontSize={10}
                color={colors?.subtext || 'rgba(255,255,255,0.5)'}
              >
                Total Batch Size
              </CustomeText>
              <CustomeText
                fontSize={12}
                fontFamily="Okra-Bold"
                color={colors?.text || '#fff'}
              >
                {formatFileSize(batchTotal)}
              </CustomeText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const ConnectionScreen = () => {
  const navigation = useNavigation();
  const {
    connectedDevices,
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
    sendBatchAck,
    setReceivedFiles,
    togglePause,
    isPaused,
  } = useTCP();

  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const TABS = {
    SENT: 'SENT',
    RECEIVED: 'RECEIVED',
  };

  const [activeTab, setActiveTab] = useState(TABS.SENT);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const selectionAnim = useRef(new Animated.Value(0)).current;
  const isIntentionalNavigation = useRef(false);

  // Subscription enforcement
  const {
    canTransferFile,
    canSendFileSize,
    markTransferUsed,
    currentPlan,
    dailyTransferCount,
    maxTransfersPerDay,
    maxFileSize,
  } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeType, setUpgradeType] = useState('transfer_limit');
  const [upgradeMessage, setUpgradeMessage] = useState('');

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning', // 'warning' or 'success'
  });

  const confirmAnim = useRef(new Animated.Value(screenHeight)).current;
  const confirmFadeAnim = useRef(new Animated.Value(0)).current;
  const confirmContentOpacity = useRef(new Animated.Value(0)).current;

  const triggerConfirmModal = config => {
    setConfirmModal({ ...config, visible: true });
    Animated.parallel([
      Animated.spring(confirmAnim, {
        toValue: 0,
        friction: 9,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(confirmFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(confirmContentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeConfirmModal = (callback = null) => {
    Animated.parallel([
      Animated.timing(confirmAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(confirmFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(confirmContentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setConfirmModal(prev => ({ ...prev, visible: false }));
      if (callback && typeof callback === 'function') callback();
    });
  };

  const [showSummary, setShowSummary] = useState(false);

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

  // Allow user to stay on this screen even if not connected!  // Navigation guard & BackHandler
  useEffect(() => {
    const handleBackAction = () => {
      if (isSelectionMode) {
        unselectAll(); // Call unselectAll which clears selection state
        return true;
      }

      if (isConnected) {
        triggerConfirmModal({
          title: 'Disconnect?',
          message:
            globalRemainingFiles > 0
              ? 'A file transfer is in progress. Are you sure you want to disconnect and leave?'
              : 'Are you sure you want to disconnect and leave?',
          type: 'warning',
          confirmText: 'Disconnect',
          cancelText: 'Stay',
          onConfirm: () => {
            isIntentionalNavigation.current = true;
            disconnect();
            resetAndNavigate('HomeScreen');
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
      // If we are already intending to navigate home (e.g. from a button click), let it happen
      if (isIntentionalNavigation.current) {
        return;
      }

      if (isSelectionMode) {
        e.preventDefault();
        unselectAll();
        return;
      }

      if (!isConnected) return; // Action already allowed/intentional

      // Prevent default behavior
      e.preventDefault();

      triggerConfirmModal({
        title: 'Disconnect?',
        message:
          globalRemainingFiles > 0
            ? 'A file transfer is in progress. Are you sure you want to disconnect and leave?'
            : 'Are you sure you want to disconnect and leave?',
        type: 'warning',
        confirmText: 'Disconnect',
        cancelText: 'Stay',
        onConfirm: () => {
          isIntentionalNavigation.current = true;
          disconnect();
          resetAndNavigate('HomeScreen');
        },
      });
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [
    navigation,
    isConnected,
    globalRemainingFiles,
    disconnect,
    isSelectionMode,
  ]);

  // Handle passive disconnect (other side leaves)
  const prevIsConnected = useRef(isConnected);
  useEffect(() => {
    if (
      prevIsConnected.current &&
      !isConnected &&
      !isIntentionalNavigation.current
    ) {
      resetAndNavigate('HomeScreen');
    }
    prevIsConnected.current = isConnected;
  }, [isConnected]);

  // Completion notification
  const prevRemaining = useRef(remainingFilesCount);
  useEffect(() => {
    if (
      prevRemaining.current > 0 &&
      remainingFilesCount === 0 &&
      totalFilesCount > 0
    ) {
      triggerConfirmModal({
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
    if (isConnected) {
      handleDisconnectRequest();
    } else {
      navigation.goBack();
    }
  };

  const handleDisconnectRequest = () => {
    if (activeFileId) {
      triggerConfirmModal({
        title: 'Transfer in Progress',
        message: 'Are you sure you want to stop the current transfer and disconnect from all devices?',
        onConfirm: () => {
          isIntentionalNavigation.current = true;
          disconnect();
          resetAndNavigate('HomeScreen');
        },
      });
      return;
    }

    triggerConfirmModal({
      title: 'Disconnect Now?',
      message: connectedDevices.length > 1 
        ? `Are you sure you want to disconnect from all ${connectedDevices.length} devices?`
        : `Are you sure you want to disconnect from ${connectedDevices[0]?.name || 'the device'}?`,
      type: 'warning',
      confirmText: 'Disconnect',
      cancelText: 'Stay',
      onConfirm: () => {
        isIntentionalNavigation.current = true;
        disconnect();
        resetAndNavigate('HomeScreen');
      },
    });
  };

  const onMediaPickedUp = media => {
    if (!media || !Array.isArray(media) || media.length === 0) return;
    setShowSummary(false);

    // ── Subscription: Check daily transfer limit ──
    if (!canTransferFile()) {
      setUpgradeType('transfer_limit');
      setUpgradeMessage(
        `You've used all ${maxTransfersPerDay} free transfers today. Upgrade to get unlimited transfers.`,
      );
      setShowUpgradeModal(true);
      return;
    }

    // ── Subscription: Check file size for each file ──
    const oversizedFile = media.find(
      m => (m.fileSize || m.size || 0) > maxFileSize && maxFileSize !== -1,
    );
    if (oversizedFile) {
      const fileSize = oversizedFile.fileSize || oversizedFile.size || 0;
      setUpgradeType('file_size');
      setUpgradeMessage(
        `"${oversizedFile.fileName || 'File'}" is ${formatFileSize(fileSize)} which exceeds your ${formatFileSize(maxFileSize)} limit. Upgrade your plan to send larger files.`,
      );
      setShowUpgradeModal(true);
      return;
    }

    // Mark transfer as used
    markTransferUsed();

    // Null-safe video categorization
    const isVideo = m => {
      const mimeType = m.type?.toLowerCase() || '';
      const fileName = m.fileName?.toLowerCase() || '';
      const uri = m.uri?.toLowerCase() || '';
      const videoExtensions = [
        '.mp4',
        '.mov',
        '.avi',
        '.mkv',
        '.webm',
        '.3gp',
        '.3gpp',
      ];

      return (
        mimeType.includes('video') ||
        videoExtensions.some(ext => fileName.endsWith(ext)) ||
        videoExtensions.some(ext => uri.endsWith(ext))
      );
    };

    const videos = media.filter(isVideo);
    const images = media.filter(m => !isVideo(m));

    console.log(
      `--- TCP Pickup: ${videos.length} videos, ${images.length} images`,
    );

    if (videos.length > 0) sendBatchAck(videos, 'video');
    if (images.length > 0) sendBatchAck(images, 'image');
  };

  const onFilePickedUp = files => {
    if (!files || files.length === 0) return;
    setShowSummary(false);

    // ── Subscription: Check daily transfer limit ──
    if (!canTransferFile()) {
      setUpgradeType('transfer_limit');
      setUpgradeMessage(
        `You've used all ${maxTransfersPerDay} free transfers today. Upgrade to get unlimited transfers.`,
      );
      setShowUpgradeModal(true);
      return;
    }

    // ── Subscription: Check file size for each file ──
    const oversizedFile = files.find(
      f => (f.size || 0) > maxFileSize && maxFileSize !== -1,
    );
    if (oversizedFile) {
      setUpgradeType('file_size');
      setUpgradeMessage(
        `"${oversizedFile.name || 'File'}" is ${formatFileSize(oversizedFile.size || 0)} which exceeds your ${formatFileSize(maxFileSize)} limit. Upgrade your plan to send larger files.`,
      );
      setShowUpgradeModal(true);
      return;
    }

    // Mark transfer as used
    markTransferUsed();

    sendBatchAck(files, 'file');
  };

  const toggleSelection = fileId => {
    setSelectedFiles(prev => {
      const isSelected = prev.includes(fileId);
      if (isSelected) {
        const next = prev.filter(id => id !== fileId);
        if (next.length === 0) {
          setIsSelectionMode(false);
        }
        return next;
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleSaveContact = item => {
    saveVCFToContacts(item.uri || item.path);
  };

  const handleLongPress = useCallback(
    file => {
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedFiles([file.id]);
      }
    },
    [isSelectionMode],
  );

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

    triggerConfirmModal({
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
        } catch (error) {
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
      if (error?.message && !error.message.includes('User did not share')) {
        Alert.alert('Share Error', error.message);
      }
    }
  };

  const deleteFile = file => {
    triggerConfirmModal({
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
        } catch (error) {
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

  // Memoize sorted list data to prevent re-creating arrays on every render
  const sortedFilesList = useMemo(() => {
    const files = (activeTab === TABS.SENT ? sentFiles : receivedFiles) || [];
    if (!activeFileId) return files;
    // Move active file to top without creating unnecessary new arrays
    const active = files.filter(f => f.id === activeFileId);
    const rest = files.filter(f => f.id !== activeFileId);
    return [...active, ...rest];
  }, [activeTab, sentFiles, receivedFiles, activeFileId]);

  // Memoized renderItem to prevent re-renders
  const renderItem = useCallback(
    ({ item, index }) => (
      <FileItem
        item={item}
        index={index}
        isSent={activeTab === TABS.SENT}
        activeFileId={activeFileId}
        isSelected={selectedFiles.includes(item.id)}
        isSelectionMode={isSelectionMode}
        onLongPress={handleLongPress}
        onPress={handlePress}
        onDelete={deleteFile}
        onShare={shareFile}
        onOpen={openFile}
        onSaveContact={handleSaveContact}
        isPaused={isPaused}
        activeFileTotalSize={activeFileTotalSize}
        activeFileTransferredBytes={activeFileTransferredBytes}
      />
    ),
    [
      activeTab,
      activeFileId,
      selectedFiles,
      isSelectionMode,
      isPaused,
      activeFileTotalSize,
      activeFileTransferredBytes,
      handleLongPress,
    ],
  );

  const ConfirmationModal = () => (
    <Modal
      visible={confirmModal.visible}
      transparent
      animationType="none"
      onRequestClose={() => closeConfirmModal()}
    >
      <TouchableWithoutFeedback onPress={() => closeConfirmModal()}>
        <Animated.View
          style={[
            styles.modalOverlayCen,
            {
              backgroundColor: confirmFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'],
              }),
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContentSmall,
                {
                  backgroundColor: isDark ? colors.surface : colors.background,
                  borderColor: colors.border,
                  opacity: confirmContentOpacity,
                  transform: [{ translateY: confirmAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={
                  confirmModal.type === 'warning'
                    ? ['#3B82F6', '#2563EB']
                    : ['#10B981', '#059669']
                }
                style={styles.modalAvatar}
              >
                <Icon
                  name={
                    confirmModal.type === 'warning'
                      ? confirmModal.title?.includes('Disconnect')
                        ? 'phone-portrait'
                        : 'alert-circle'
                      : 'checkmark-circle'
                  }
                  iconFamily="Ionicons"
                  size={32}
                  color="#fff"
                />
              </LinearGradient>

              <CustomeText
                fontSize={18}
                fontFamily="Okra-Bold"
                color={colors.text}
                style={{ textAlign: 'center', marginTop: 16 }}
              >
                {confirmModal.title}
              </CustomeText>

              <CustomeText
                fontSize={14}
                color={colors.subtext}
                style={{ textAlign: 'center', marginBottom: 20 }}
              >
                {confirmModal.message}
              </CustomeText>

              <View style={styles.modalButtons}>
                {confirmModal.type === 'warning' && (
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.cancelButton,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                    onPress={() => closeConfirmModal()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <CustomeText
                      fontSize={14}
                      fontFamily="Okra-Bold"
                      color={colors.text}
                      variant="h6"
                      style={{}}
                      onLayout={() => {}}
                      numberOfLines={1}
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
                    closeConfirmModal(() => {
                      if (confirmModal.onConfirm) confirmModal.onConfirm();
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <LinearGradient
                    colors={
                      confirmModal.type === 'warning'
                        ? ['#3B82F6', '#2563EB'] // Match the new modal theme
                        : ['#10B981', '#059669']
                    }
                    style={styles.confirmButtonGradient}
                  >
                    <CustomeText
                      fontSize={14}
                      fontFamily="Okra-Bold"
                      color="#fff"
                      variant="h6"
                      style={{}}
                      onLayout={() => {}}
                      numberOfLines={1}
                    >
                      {confirmModal.type === 'warning'
                        ? confirmModal.confirmText || 'Disconnect'
                        : confirmModal.confirmText || 'Awesome'}
                    </CustomeText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      {isConnected && <KeepAwake />}
      <ConfirmationModal />
      <LinearGradient
        colors={colors.gradientBg}
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
            {isConnected && (
              <>
                {/* Header with Gradient */}
                <View
                  style={[
                    styles.headerGradient,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.unifiedHeader}>
                    {/* Back Button */}
                    <TouchableOpacity
                      onPress={handleGoBack}
                      style={styles.backButton}
                    >
                      <LinearGradient
                        colors={[colors.surface, colors.surfaceAlt]}
                        style={styles.backButtonGradient}
                      >
                        <Icon
                          name="arrow-back"
                          iconFamily="Ionicons"
                          size={22}
                          color={colors.icon}
                        />
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Center Device Info */}
                    <View style={styles.headerDeviceInfo}>
                      <View style={styles.compactAvatarContainer}>
                        <LinearGradient
                          colors={['#3B82F6', '#2563EB']}
                          style={styles.compactAvatar}
                        >
                          <Icon
                            name="phone-portrait"
                            iconFamily="Ionicons"
                            size={20}
                            color="#fff"
                          />
                        </LinearGradient>
                        <View style={styles.compactActiveIndicator}>
                          <View style={styles.activeDot} />
                        </View>
                      </View>

                      <View style={styles.headerTextGroup}>
                        <CustomeText
                          fontSize={14}
                          fontFamily="Okra-Bold"
                          color={colors.text}
                        >
                          {connectedDevices.length > 1 
                            ? `${connectedDevices.length} Devices Connected` 
                            : connectedDevices[0]?.name || 'Unknown Device'}
                        </CustomeText>
                        <CustomeText
                          fontSize={10}
                          color={colors.subtext}
                          fontFamily="Okra-Medium"
                        >
                          {connectedDevices.length > 1 
                            ? connectedDevices.map(d => d.name).join(', ') 
                            : 'Connected and Ready'}
                        </CustomeText>
                      </View>
                    </View>

                    {/* Disconnect Button */}
                    <TouchableOpacity
                      onPress={handleDisconnectRequest}
                      style={styles.disconnectButton}
                    >
                      <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        style={styles.disconnectButtonGradient}
                      >
                        <Icon
                          name="close"
                          size={18}
                          color="#fff"
                          iconFamily="Ionicons"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Options Component with enhanced styling */}
                <View style={styles.optionsWrapper}>
                  <Options
                    isHome={false}
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
                  fadeAnim={fadeAnim}
                  slideAnim={slideAnim}
                  activeFileId={activeFileId}
                  colors={colors}
                  isPaused={isPaused}
                  onTogglePause={togglePause}
                  connectedDevices={connectedDevices}
                />

                {/* Files Section */}
                <View style={styles.filesSection}>
                  <View
                    style={[
                      styles.tabBar,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                      },
                    ]}
                  >
                    <View style={styles.tabContainer}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleTabChange(TABS.SENT)}
                        style={styles.tab}
                      >
                        {activeTab === TABS.SENT && (
                          <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            style={[
                              StyleSheet.absoluteFill,
                              { borderRadius: 18 },
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          />
                        )}
                        <View style={styles.tabContent}>
                          <Icon
                            name="arrow-up-circle"
                            size={18}
                            color={
                              activeTab === TABS.SENT ? '#fff' : colors.subtext
                            }
                            iconFamily="Ionicons"
                          />
                          <CustomeText
                            fontSize={13}
                            fontFamily="Okra-Bold"
                            color={
                              activeTab === TABS.SENT ? '#fff' : colors.subtext
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
                            style={[
                              StyleSheet.absoluteFill,
                              { borderRadius: 18 },
                            ]}
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
                                : colors.subtext
                            }
                            iconFamily="Ionicons"
                          />
                          <CustomeText
                            fontSize={13}
                            fontFamily="Okra-Bold"
                            color={
                              activeTab === TABS.RECEIVED
                                ? '#fff'
                                : colors.subtext
                            }
                            style={{ marginLeft: 6 }}
                          >
                            Received
                          </CustomeText>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                    {(activeTab === TABS.SENT
                      ? sentFiles?.length
                      : receivedFiles?.length) > 0 ? (
                      <FlatList
                        data={sortedFilesList}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderItem}
                        extraData={`${selectedFiles.join(
                          ',',
                        )}-${isSelectionMode}-${activeFileId}-${isPaused}`}
                        contentContainerStyle={{
                          paddingVertical: 12,
                          paddingBottom: 40,
                        }}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={7}
                        initialNumToRender={8}
                        getItemLayout={(data, index) => ({
                          length: 68,
                          offset: 68 * index,
                          index,
                        })}
                      />
                    ) : (
                      <View
                        style={
                          styles.emptyContainer || {
                            alignItems: 'center',
                            marginTop: 40,
                          }
                        }
                      >
                        <LinearGradient
                          colors={[colors.surface, colors.surfaceAlt]}
                          style={
                            styles.emptyIcon || {
                              padding: 20,
                              borderRadius: 40,
                            }
                          }
                        >
                          <Icon
                            name={
                              activeTab === TABS.SENT
                                ? 'arrow-up-circle'
                                : 'arrow-down-circle'
                            }
                            size={50}
                            color={colors.subtext}
                            iconFamily="Ionicons"
                          />
                        </LinearGradient>
                        <CustomeText
                          fontSize={18}
                          fontFamily="Okra-Bold"
                          color={colors.subtext}
                          style={{ marginTop: 16 }}
                        >
                          No {activeTab === TABS.SENT ? 'sent' : 'received'}{' '}
                          files yet
                        </CustomeText>
                        <CustomeText
                          fontSize={14}
                          color={colors.subtext}
                          style={{ marginTop: 8 }}
                        >
                          Files will appear here during transfer
                        </CustomeText>
                      </View>
                    )}
                  </Animated.View>
                </View>
              </>
            )}
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
              colors={
                isDark
                  ? ['#1a1a2e', '#16213e']
                  : [colors.surface, colors.surfaceAlt]
              }
              style={styles.selectionBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
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
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </LinearGradient>

      <UpgradePromptModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        type={upgradeType}
        message={upgradeMessage}
      />
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
    marginBottom: 8,
  },
  unifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  headerDeviceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  compactAvatarContainer: {
    position: 'relative',
  },
  compactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactActiveIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  headerTextGroup: {
    marginLeft: 10,
    flex: 1,
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
    borderRadius: 20,
    padding: 6,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 18,
    padding: 2,
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
  modalContentSmall: {
    width: '90%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlayCen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
