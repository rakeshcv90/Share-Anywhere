import React, { useRef, useEffect, useState } from 'react';
import { Asset } from 'react-native-image-picker';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  Modal,
  FlatList,
  ScrollView as RNScrollView,
  TextInput,
  Linking,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from '../global/Icon';
import CustomeText from '../global/CustomeText';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';
import { useTheme } from '../../context/ThemeContext';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  pickDocument,
  pickImage,
  pickVideo,
  pickAudio,
  pickContact,
  createVCFAndSend,
} from '../../utils/libraryHelpers';

type OptionsProps = {
  isHome?: boolean;
  onMediaPickedUp?: (media: Asset[]) => void;
  onFilePickedUp?: (files: any[]) => void;
  onAppearancePress?: () => void;
};

const homeOptions = [
  {
    type: 'clean',
    icon: 'trash-bin',
    family: 'Ionicons',
    label: 'Clean Storage',
    desc: 'Free up storage space.',
    colors: ['#FF5252', '#D32F2F'],
  },
  {
    type: 'nearby',
    icon: 'phone-portrait-outline',
    family: 'Ionicons',
    label: 'Nearby Devices',
    desc: 'Find nearby phones.',
    colors: ['#10B981', '#059669'],
  },
  {
    type: 'cache',
    icon: 'trash-outline',
    family: 'Ionicons',
    label: 'Clear Cache',
    desc: 'Remove temp files.',
    colors: ['#FF7043', '#D84315'],
  },
  {
    type: 'file_manager',
    icon: 'time-outline',
    family: 'Ionicons',
    label: 'History',
    desc: 'View past transfers.',
    colors: ['#8B5CF6', '#7C3AED'],
  },
  {
    type: 'contact',
    icon: 'person',
    family: 'Ionicons',
    label: 'Send Contact',
    desc: 'Share your contacts.',
    colors: ['#C084FC', '#9333EA'],
  },
  {
    type: 'appearance',
    icon: 'contrast-outline',
    family: 'Ionicons',
    label: 'Appearance',
    desc: 'Customize theme.',
    colors: ['#3B82F6', '#2563EB'],
  },
];

const transferOptions = [
  {
    type: 'image',
    icon: 'image',
    family: 'Ionicons',
    label: 'Images',
    desc: 'Share photos.',
    colors: ['#6EE7B7', '#10B981'],
  },
  {
    type: 'video',
    icon: 'videocam',
    family: 'Ionicons',
    label: 'Videos',
    desc: 'Share mp4, mov.',
    colors: ['#FCD34D', '#F59E0B'],
  },
  {
    type: 'audio',
    icon: 'musical-notes',
    family: 'Ionicons',
    label: 'Audio',
    desc: 'Share mp3, music.',
    colors: ['#F472B6', '#DB2777'],
  },
  {
    type: 'file',
    icon: 'document',
    family: 'Ionicons',
    label: 'Files',
    desc: 'Share pdf, docs.',
    colors: ['#93C5FD', '#3B82F6'],
  },
  {
    type: 'contact',
    icon: 'person',
    family: 'Ionicons',
    label: 'Contact',
    desc: 'Share contact info.',
    colors: ['#C084FC', '#9333EA'],
  },
];

const { height: screenHeight } = Dimensions.get('window');

const Options: React.FC<OptionsProps> = ({
  isHome,
  onFilePickedUp,
  onMediaPickedUp,
  onAppearancePress,
}) => {
  const {
    isConnected,
    setReceivedFiles,
    setSentFiles,
    setTotalReceivedBytes,
    setTotalSentBytes,
  } = useTCP();
  const { colors, isDark } = useTheme();
  let currentOptions = isHome ? homeOptions : transferOptions;
  if (Platform.OS === 'ios') {
    currentOptions = currentOptions.filter(item => item.type !== 'nearby');
  }

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    icon: string;
    color: string;
    isSuccess?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const animations = useRef(
    [...Array(12)].map(() => new Animated.Value(0)),
  ).current;

  const modalAnim = useRef(new Animated.Value(screenHeight)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const bgFadeAnim = useRef(new Animated.Value(0)).current;
  const permAnim = useRef(new Animated.Value(0)).current;
  const permOpacity = useRef(new Animated.Value(0)).current;
  const confirmAnim = useRef(new Animated.Value(0)).current;
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(
      80,
      animations.slice(0, currentOptions.length).map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [isHome]);

  const handleOpenContactModal = (contactsList: any[]) => {
    setContacts(contactsList);
    setContactModalVisible(true);
    Animated.parallel([
      Animated.spring(modalAnim, {
        toValue: 0,
        friction: 9,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseContactModal = () => {
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setContactModalVisible(false);
    });
  };

  const handleOpenPermissionModal = () => {
    setPermissionModalVisible(true);
    Animated.parallel([
      Animated.spring(permAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(permOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClosePermissionModal = () => {
    Animated.parallel([
      Animated.timing(permAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(permOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bgFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPermissionModalVisible(false);
    });
  };

  const handleOpenConfirmModal = (config: any) => {
    setConfirmConfig(config);
    setConfirmModalVisible(true);
    Animated.parallel([
      Animated.spring(confirmAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(confirmOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (config.isSuccess) {
        Animated.sequence([
          Animated.spring(iconPulse, {
            toValue: 1.25,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(iconPulse, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  const handleCloseConfirmModal = () => {
    Animated.parallel([
      Animated.timing(confirmAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(confirmOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bgFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setConfirmModalVisible(false);
    });
  };

  const handleClearCache = async () => {
    try {
      const cacheDir = RNFS.CachesDirectoryPath;
      await ReactNativeBlobUtil.fs.unlink(cacheDir).catch(() => {});
      await ReactNativeBlobUtil.fs.mkdir(cacheDir).catch(() => {});
      
      handleOpenConfirmModal({
        title: 'Success!',
        message: 'Cache has been cleared successfully.',
        icon: 'checkmark-circle',
        color: '#10B981',
        isSuccess: true,
        onConfirm: () => handleCloseConfirmModal(),
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to clear cache.');
    }
  };

  const handleClearStorage = async () => {
    try {
      // 1. Reset UI State & History
      setReceivedFiles([]);
      setSentFiles([]);
      setTotalReceivedBytes(0);
      setTotalSentBytes(0);

      // 2. Physical Deletion
      if (Platform.OS === 'ios') {
        const docDir = RNFS.DocumentDirectoryPath;
        const files = await RNFS.readDir(docDir);
        for (const f of files) {
          if (f.name !== '.readme.txt') {
            await ReactNativeBlobUtil.fs.unlink(f.path).catch(() => {});
          }
        }
      } else {
        const externalDir = RNFS.ExternalDirectoryPath;
        await ReactNativeBlobUtil.fs.unlink(externalDir).catch(() => {});
        await ReactNativeBlobUtil.fs.mkdir(externalDir).catch(() => {});

        const galleryDir = `${RNFS.ExternalStorageDirectoryPath}/Pictures/Share-Anywhere`;
        await ReactNativeBlobUtil.fs.unlink(galleryDir).catch(() => {});

        const downloadDir = `${RNFS.ExternalStorageDirectoryPath}/Download/Share-Anywhere`;
        await ReactNativeBlobUtil.fs.unlink(downloadDir).catch(() => {});
      }

      handleOpenConfirmModal({
        title: 'Storage Cleaned',
        message: 'All received files and transfer history have been removed.',
        icon: 'sparkles',
        color: '#10B981',
        isSuccess: true,
        onConfirm: () => handleCloseConfirmModal(),
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to clean storage.');
    }
  };

  const handleUniversalPicker = async (type: string) => {
    switch (type) {
      case 'image':
        onMediaPickedUp && (await pickImage(onMediaPickedUp));
        break;
      case 'video':
        onMediaPickedUp && (await pickVideo(onMediaPickedUp));
        break;
      case 'audio':
        onFilePickedUp && (await pickAudio(onFilePickedUp));
        break;
      case 'file':
        onFilePickedUp && (await pickDocument(onFilePickedUp));
        break;
      case 'contact':
        const res = await pickContact();
        if (res.status === 'granted' && res.contacts) {
          handleOpenContactModal(res.contacts);
        } else if (res.status === 'denied') {
          handleOpenPermissionModal();
        }
        break;
      case 'appearance':
        onAppearancePress?.();
        break;
      case 'file_manager':
        navigate('ReceivedFileScreen');
        break;
      case 'nearby':
        navigate('ConnectionHubScreen');
        break;
      case 'clean':
        handleOpenConfirmModal({
          title: 'Clean Storage',
          message:
            'Are you sure you want to delete all received files and temporary data?',
          icon: 'trash-bin',
          color: '#FF5252',
          onConfirm: () => {
            handleCloseConfirmModal();
            handleClearStorage();
          },
        });
        break;
      case 'cache':
        handleOpenConfirmModal({
          title: 'Clear Cache',
          message:
            'This will clear temporary files and app cache. It will not delete your received files.',
          icon: 'trash-outline',
          color: '#FF7043',
          onConfirm: () => {
            handleCloseConfirmModal();
            handleClearCache();
          },
        });
        break;
      default:
        Alert.alert('Coming Soon', 'This feature is under development.');
        break;
    }
  };

  const handleSelectContact = async (contact: any) => {
    handleCloseContactModal();
    if (onFilePickedUp) {
      await createVCFAndSend(contact, onFilePickedUp);
    } else {
      Alert.alert('Not Connected', 'Open a connection to share contacts.');
    }
  };

  const filteredContacts = contacts.filter(c =>
    `${c.displayName || ''} ${c.givenName || ''} ${c.familyName || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const renderContent = () => {
    if (isHome) {
      return (
        <View style={styles.grid}>
          {currentOptions.map((item, index) => (
            <Animated.View
              key={item.type}
              style={[
                styles.cardWrapper,
                {
                  opacity: animations[index],
                  transform: [
                    {
                      translateY: animations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleUniversalPicker(item.type)}
              >
                <View style={isHome ? styles.cardVertical : styles.cardHeader}>
                  <LinearGradient
                    colors={item.colors}
                    style={[styles.iconBox, isHome && { marginBottom: 8 }]}
                  >
                    <Icon
                      name={item.icon}
                      iconFamily={item.family as any}
                      size={isHome ? 24 : 22}
                      color="#fff"
                    />
                  </LinearGradient>

                  <View style={isHome ? { alignItems: 'center' } : { flex: 1 }}>
                    <CustomeText
                      variant="h6"
                      fontSize={isHome ? 13 : 14}
                      fontFamily="Okra-Bold"
                      color={colors.text}
                      style={[styles.label, isHome && { textAlign: 'center' }]}
                      onLayout={() => {}}
                      numberOfLines={1}
                    >
                      {item.label}
                    </CustomeText>
                    <CustomeText
                      variant="h6"
                      fontSize={isHome ? 9 : 10}
                      fontFamily="Okra-Medium"
                      color={colors.subtext}
                      style={[isHome && { textAlign: 'center', opacity: 0.7 }]}
                      onLayout={() => {}}
                      numberOfLines={1}
                    >
                      {item.desc}
                    </CustomeText>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      );
    }

    return (
      <RNScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.miniGrid}
      >
        {currentOptions.map((item, index) => (
          <Animated.View
            key={item.type}
            style={[
              styles.miniCardWrapper,
              {
                opacity: animations[index] || 1,
                transform: [{ translateY: 0 }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.miniCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleUniversalPicker(item.type)}
            >
              <LinearGradient colors={item.colors} style={styles.miniIconBox}>
                <Icon
                  name={item.icon}
                  iconFamily={item.family as any}
                  size={18}
                  color="#fff"
                />
              </LinearGradient>
              <CustomeText
                variant="h7"
                fontSize={12}
                fontFamily="Okra-Bold"
                color={colors.text}
                style={{ marginTop: 4 }}
                onLayout={() => {}}
                numberOfLines={1}
              >
                {item.label}
              </CustomeText>
              <CustomeText
                variant="h6"
                fontSize={8}
                fontFamily="Okra-Medium"
                color={colors.subtext}
                style={{ opacity: 0.6 }}
                onLayout={() => {}}
                numberOfLines={1}
              >
                {item.desc}
              </CustomeText>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </RNScrollView>
    );
  };

  return (
    <View style={styles.wrapper}>
      {isHome && (
        <CustomeText
          variant="h6"
          fontSize={16}
          fontFamily="Okra-Bold"
          color={colors.text}
          style={styles.sectionTitle}
          onLayout={() => {}}
          numberOfLines={1}
        >
          Options
        </CustomeText>
      )}

      {renderContent()}

      {/* Permissions & Modals */}
      <Modal visible={permissionModalVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={handleClosePermissionModal}>
          <Animated.View
            style={[
              styles.modalOverlayCen,
              {
                backgroundColor: bgFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'],
                }),
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.permCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: permOpacity,
                    transform: [{ scale: permAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#C084FC30', '#9333EA10']}
                  style={styles.permIconBg}
                >
                  <Icon
                    name="person"
                    iconFamily="Ionicons"
                    size={36}
                    color="#9333EA"
                  />
                </LinearGradient>
                <CustomeText
                  variant="h5"
                  fontSize={18}
                  fontFamily="Okra-Bold"
                  color={colors.text}
                  style={{ textAlign: 'center', marginTop: 16 }}
                  onLayout={() => {}}
                  numberOfLines={1}
                >
                  Permission Needed
                </CustomeText>
                <CustomeText
                  variant="h5"
                  fontSize={14}
                  color={colors.subtext}
                  style={{ textAlign: 'center', marginTop: 8 }}
                  onLayout={() => {}}
                  numberOfLines={2}
                >
                  Contact access is required for sharing.
                </CustomeText>
                <TouchableOpacity
                  style={[styles.permBtn, { backgroundColor: '#9333EA' }]}
                  onPress={() => {
                    handleClosePermissionModal();
                    Linking.openSettings();
                  }}
                >
                  <CustomeText
                    variant="h6"
                    fontSize={15}
                    color="#fff"
                    style={{}}
                    onLayout={() => {}}
                    numberOfLines={1}
                  >
                    Settings
                  </CustomeText>
                </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.permCancel}
                    onPress={handleClosePermissionModal}
                  >
                    <CustomeText
                      variant="h6"
                      fontSize={14}
                      color={colors.subtext}
                      style={{}}
                      onLayout={() => {}}
                      numberOfLines={1}
                    >
                      Cancel
                    </CustomeText>
                  </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="none">
        <TouchableWithoutFeedback onPress={handleCloseConfirmModal}>
          <Animated.View
            style={[
              styles.modalOverlayCen,
              {
                backgroundColor: bgFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
                }),
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.confirmCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: confirmOpacity,
                    transform: [
                      { scale: confirmAnim },
                      {
                        translateY: confirmAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={{ transform: [{ scale: iconPulse }] }}
                >
                  <LinearGradient
                    colors={
                      confirmConfig
                        ? [`${confirmConfig.color}20`, `${confirmConfig.color}05`]
                        : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                    }
                    style={styles.confirmIconBg}
                  >
                    <Icon
                      name={(confirmConfig?.icon as any) || 'help-circle'}
                      iconFamily="Ionicons"
                      size={38}
                      color={confirmConfig?.color || colors.text}
                    />
                  </LinearGradient>
                </Animated.View>

                <View style={styles.confirmTextContent}>
                  <CustomeText
                    variant="h5"
                    fontSize={20}
                    fontFamily="Okra-Bold"
                    color={colors.text}
                    style={{ textAlign: 'center' }}
                  >
                    {confirmConfig?.title}
                  </CustomeText>
                  <CustomeText
                    variant="h6"
                    fontSize={14}
                    color={colors.subtext}
                    style={{ textAlign: 'center', marginTop: 10, lineHeight: 20 }}
                  >
                    {confirmConfig?.message}
                  </CustomeText>
                </View>

                <View style={styles.confirmActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      {
                        backgroundColor:
                          confirmConfig?.color || colors.accent,
                        shadowColor: confirmConfig?.color || colors.accent,
                      },
                    ]}
                    onPress={confirmConfig?.onConfirm}
                    activeOpacity={0.8}
                  >
                    <CustomeText
                      variant="h6"
                      fontSize={15}
                      color="#fff"
                      fontFamily="Okra-Bold"
                    >
                      {confirmConfig?.isSuccess ? 'Great!' : 'Confirm'}
                    </CustomeText>
                  </TouchableOpacity>

                  {!confirmConfig?.isSuccess && (
                    <TouchableOpacity
                      style={[
                        styles.cancelBtn,
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                      ]}
                      onPress={handleCloseConfirmModal}
                      activeOpacity={0.7}
                    >
                      <CustomeText
                        variant="h6"
                        fontSize={15}
                        color={colors.subtext}
                        fontFamily="Okra-Medium"
                      >
                        Cancel
                      </CustomeText>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={contactModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseContactModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseContactModal}>
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                backgroundColor: bgFadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'],
                }),
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: modalOpacity,
                    transform: [{ translateY: modalAnim }],
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <CustomeText
                    variant="h5"
                    fontSize={18}
                    fontFamily="Okra-Bold"
                    color={colors.text}
                    style={{}}
                    onLayout={() => {}}
                    numberOfLines={1}
                  >
                    Select Contact
                  </CustomeText>
                  <TouchableOpacity
                    onPress={handleCloseContactModal}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  >
                    <Icon
                      name="close"
                      iconFamily="Ionicons"
                      size={24}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Search..."
                  placeholderTextColor={colors.subtext}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <FlatList
                  data={filteredContacts}
                  keyExtractor={item => item.recordID}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.contactItem,
                        { borderBottomColor: colors.border },
                      ]}
                      onPress={() => handleSelectContact(item)}
                    >
                      <View
                        style={[
                          styles.contactIcon,
                          { backgroundColor: colors.border },
                        ]}
                      >
                        <Icon
                          name="person"
                          iconFamily="Ionicons"
                          size={20}
                          color={colors.subtext}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <CustomeText
                          variant="h6"
                          fontSize={15}
                          fontFamily="Okra-Bold"
                          color={colors.text}
                          style={{}}
                          onLayout={() => {}}
                          numberOfLines={1}
                        >{item.displayName || `${item.givenName || ''} ${
                          item.familyName || ''
                        }`.trim() || 'Unknown'}</CustomeText>
                        <CustomeText
                          variant="h6"
                          fontSize={12}
                          color={colors.subtext}
                          style={{}}
                          onLayout={() => {}}
                          numberOfLines={1}
                        >
                          {item.phoneNumbers?.[0]?.number || 'No phone'}
                        </CustomeText>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginTop: 12 },
  sectionTitle: { marginBottom: 12, marginLeft: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 12,
    minHeight: 100,
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardVertical: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { marginBottom: 1 },
  miniGrid: { flexDirection: 'row', paddingVertical: 8, paddingLeft: 16 },
  miniCardWrapper: { marginRight: 12 },
  miniCard: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 95,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBar: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permCard: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  permIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  permCancel: { marginTop: 14 },
  confirmCard: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    elevation: 25,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  confirmIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmTextContent: {
    width: '100%',
    marginBottom: 24,
  },
  confirmActionRow: {
    width: '100%',
    gap: 12,
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cancelBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default Options;
