import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
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
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
  Image,
} from 'react-native';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import LinearGradient from 'react-native-linear-gradient';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Icon from '../components/global/Icon';
import CustomeText from '../components/global/CustomeText';
import { formatFileSize } from '../utils/libraryHelpers';
import { goBack } from '../utils/NavigationUtil';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

const CATEGORIES = [
  {
    id: 'images',
    label: 'Images',
    icon: 'image',
    iconFamily: 'Ionicons',
    color: '#10B981',
  },
  {
    id: 'videos',
    label: 'Videos',
    icon: 'videocam',
    iconFamily: 'Ionicons',
    color: '#F59E0B',
  },
  {
    id: 'audio',
    label: 'Music',
    icon: 'musical-notes',
    iconFamily: 'Ionicons',
    color: '#EF4444',
  },
  {
    id: 'docs',
    label: 'Docs',
    icon: 'document-text',
    iconFamily: 'Ionicons',
    color: '#3B82F6',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'person',
    iconFamily: 'Ionicons',
    color: '#9333EA',
  },
  {
    id: 'all',
    label: 'All Files',
    icon: 'grid',
    iconFamily: 'Ionicons',
    color: '#64748B',
  },
];

const ReceivedFileScreen = () => {
  const { colors, isDark } = useTheme();
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const totalSize = useMemo(
    () => receivedFiles.reduce((acc, f) => acc + f.size, 0),
    [receivedFiles],
  );
  const totalFiles = receivedFiles.length;

  const filteredFiles = useMemo(() => {
    if (selectedCategory === 'all') return receivedFiles;
    return receivedFiles.filter(file => {
      const ext = file.name?.split('.').pop()?.toLowerCase();
      const mime = file.mimeType?.toLowerCase();
      switch (selectedCategory) {
        case 'images':
          return (
            ['jpg', 'jpeg', 'png', 'gif', 'heic', 'webp'].includes(ext) ||
            mime?.includes('image')
          );
        case 'videos':
          return (
            ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ||
            mime?.includes('video')
          );
        case 'audio':
          return (
            ['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext) ||
            mime?.includes('audio')
          );
        case 'docs':
          return (
            [
              'pdf',
              'doc',
              'docx',
              'txt',
              'zip',
              'rar',
              '7z',
              'xls',
              'xlsx',
              'ppt',
              'pptx',
            ].includes(ext) ||
            (mime?.includes('application') && !mime?.includes('vcard'))
          );
        case 'contacts':
          return ext === 'vcf' || mime?.includes('vcard');
        default:
          return true;
      }
    });
  }, [receivedFiles, selectedCategory]);

  const numColumns = useMemo(() => {
    if (selectedCategory === 'images' || selectedCategory === 'videos')
      return 3;
    return 1;
  }, [selectedCategory]);

  const getFilesFromDirectory = async () => {
    try {
      setIsLoading(true);
      const scanDirs =
        Platform.OS === 'android'
          ? [
              RNFS.ExternalDirectoryPath,
              `${RNFS.ExternalStorageDirectoryPath}/Pictures/Share-Anywhere`,
              `${RNFS.ExternalStorageDirectoryPath}/Download/Share-Anywhere`,
            ]
          : [RNFS.DocumentDirectoryPath];

      let allFiles = [];
      for (const dir of scanDirs) {
        try {
          const exists = await RNFS.exists(dir);
          if (!exists) continue;
          const files = await RNFS.readDir(dir);
          allFiles = [
            ...allFiles,
            ...files
              .filter(f => f.isFile() && !f.name.startsWith('.') && f.size > 0)
              .map(f => ({
                id: f.path,
                name: f.name,
                size: f.size,
                uri: f.path,
                mimeType: f.name.split('.').pop() || 'unknown',
                modifiedTime: new Date(f.mtime || 0).getTime(),
              })),
          ];
        } catch (err) {}
      }
      const formattedFiles = allFiles.sort(
        (a, b) => b.modifiedTime - a.modifiedTime,
      );
      setReceivedFiles(formattedFiles);
    } catch (error) {
      setReceivedFiles([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getFilesFromDirectory();
  }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getFilesFromDirectory();
  }, []);

  const openFile = async file => {
    if (!file || !file.uri) return;
    let path = file.uri.startsWith('file://')
      ? file.uri.replace('file://', '')
      : file.uri;
    const finalUri = `file://${path}`;
    const ext = file.name?.split('.').pop()?.toLowerCase() || '';
    let mime = '*/*';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) mime = 'image/*';
    else if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) mime = 'video/*';
    else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) mime = 'audio/*';
    else if (ext === 'pdf') mime = 'application/pdf';
    else if (ext === 'txt') mime = 'text/plain';
    else if (ext === 'apk') mime = 'application/vnd.android.package-archive';
    else if (['zip', 'rar', '7z'].includes(ext)) mime = 'application/zip';
    else if (['doc', 'docx'].includes(ext)) mime = 'application/msword';

    try {
      if (isIOS) await ReactNativeBlobUtil.ios.openDocument(path);
      else await ReactNativeBlobUtil.android.actionViewIntent(path, mime);
    } catch (err) {
      console.log('Error opening file:', err);
      Alert.alert('Error', 'Could not open file');
    }
  };

  const deleteFile = file => {
    const filesToDelete = Array.isArray(file) ? file : [file];
    setConfirmModal({
      visible: true,
      title: 'Delete Files?',
      message: `Delete ${filesToDelete.length} file(s)? This cannot be undone.`,
      onConfirm: async () => {
        try {
          for (const f of filesToDelete) await RNFS.unlink(f.uri);
          setIsSelectionMode(false);
          setSelectedFiles([]);
          getFilesFromDirectory();
          setConfirmModal(p => ({ ...p, visible: false }));
        } catch (error) {
          setConfirmModal(p => ({ ...p, visible: false }));
        }
      },
    });
  };

  const shareFile = async file => {
    try {
      const filesToShare = Array.isArray(file) ? file : [file];
      const results = [];
      for (const f of filesToShare) {
        if (await RNFS.exists(f.uri))
          results.push(f.uri.startsWith('file://') ? f.uri : `file://${f.uri}`);
      }
      if (results.length === 0) return;
      await Share.open({
        title: 'Share Files',
        urls: results,
        failOnCancel: false,
      });
      if (filesToShare.length > 1) {
        setIsSelectionMode(false);
        setSelectedFiles([]);
      }
    } catch (error) {}
  };

  const toggleSelection = fileId => {
    setSelectedFiles(prev => {
      const next = prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId];
      if (next.length === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const renderIcon = item => {
    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(ext);

    if (isImage || isVideo) {
      return (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: `file://${item.uri}` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          {isVideo && (
            <View style={styles.listVideoBadge}>
              <Icon name="play" size={10} color="#fff" iconFamily="Ionicons" />
            </View>
          )}
        </View>
      );
    }

    const colorsMap = {
      audio: ['#EF4444', '#DC2626'],
      pdf: ['#3B82F6', '#2563EB'],
      zip: ['#8B5CF6', '#7C3AED'],
    };
    let type = 'document';
    let grad = ['#94A3B8', '#64748B'];

    if (['mp3', 'wav', 'm4a'].includes(ext)) {
      type = 'musical-notes';
      grad = colorsMap.audio;
    } else if (ext === 'pdf') {
      type = 'document-text';
      grad = colorsMap.pdf;
    } else if (['zip', 'rar'].includes(ext)) {
      type = 'archive';
      grad = colorsMap.zip;
    }

    return (
      <View style={[styles.iconContainer, { backgroundColor: grad[0] }]}>
        <Icon name={type} size={14} color="#fff" iconFamily="Ionicons" />
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    const isGrid = numColumns === 3;
    const isSelected = selectedFiles.includes(item.id);

    if (isGrid) {
      return (
        <TouchableOpacity
          style={[styles.gridItem, isSelected && styles.gridItemSelected]}
          onPress={() =>
            isSelectionMode ? toggleSelection(item.id) : openFile(item)
          }
          onLongPress={() => {
            setIsSelectionMode(true);
            setSelectedFiles([item.id]);
          }}
        >
          <Image
            source={{ uri: `file://${item.uri}` }}
            style={styles.gridImage}
            resizeMode="cover"
          />
          {(item.name.toLowerCase().endsWith('.mp4') ||
            item.name.toLowerCase().endsWith('.mov')) && (
            <View style={styles.videoBadge}>
              <Icon name="play" iconFamily="Ionicons" size={12} color="#fff" />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectionCheck}>
              <Icon
                name="checkmark"
                size={12}
                color="#fff"
                iconFamily="Ionicons"
              />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={() =>
          isSelectionMode ? toggleSelection(item.id) : openFile(item)
        }
        onLongPress={() => {
          setIsSelectionMode(true);
          setSelectedFiles([item.id]);
        }}
      >
        <View style={styles.listItemInner}>
          {renderIcon(item)}
          <View style={styles.listItemTextContainer}>
            <CustomeText
              fontFamily="Okra-Bold"
              fontSize={14}
              color={colors.text}
              numberOfLines={1}
            >
              {item.name}
            </CustomeText>
            <CustomeText
              fontSize={11}
              color={colors.subtext}
              fontFamily="Okra-Medium"
            >
              {formatFileSize(item.size)} •{' '}
              {(item.name.split('.').pop() || 'FILE').toUpperCase()}
            </CustomeText>
          </View>
        </View>
        <Icon
          name={
            isSelectionMode
              ? isSelected
                ? 'checkbox'
                : 'square-outline'
              : 'chevron-forward'
          }
          iconFamily="Ionicons"
          size={18}
          color={isSelected ? '#3B82F6' : colors.subtext}
        />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <CustomeText fontSize={24} fontFamily="Okra-Bold" color={colors.text}>
            {totalFiles}
          </CustomeText>
          <CustomeText
            fontSize={11}
            color={colors.subtext}
            fontFamily="Okra-Medium"
          >
            Total Files
          </CustomeText>
        </View>
        <View style={styles.statBox}>
          <CustomeText fontSize={24} fontFamily="Okra-Bold" color={colors.text}>
            {formatFileSize(totalSize)}
          </CustomeText>
          <CustomeText
            fontSize={11}
            color={colors.subtext}
            fontFamily="Okra-Medium"
          >
            Total Size
          </CustomeText>
        </View>
      </View>

      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
              style={[
                styles.categoryCard,
                isActive && styles.categoryCardActive,
              ]}
            >
              <View
                style={[
                  styles.categoryIconWrap,
                  { backgroundColor: cat.color + '25' },
                ]}
              >
                <Icon
                  name={cat.icon}
                  iconFamily={cat.iconFamily}
                  size={20}
                  color={cat.color}
                />
              </View>
              <CustomeText
                fontFamily="Okra-Bold"
                fontSize={13}
                color={isActive ? '#3B82F6' : colors.text}
                style={{ marginTop: 6 }}
              >
                {cat.label}
              </CustomeText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLine} />
        <CustomeText fontSize={18} fontFamily="Okra-Bold" color={colors.text}>
          {CATEGORIES.find(c => c.id === selectedCategory)?.label} Files
        </CustomeText>
      </View>
    </View>
  );

  return (
    <View style={styles.baseContainer}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <LinearGradient
        colors={colors.gradientBg}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
            <Icon
              name="chevron-back"
              iconFamily="Ionicons"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <CustomeText fontFamily="Okra-Bold" fontSize={22} color={colors.text}>
            Inbox
          </CustomeText>
          <View style={{ width: 44 }} />
        </View>

        <FlatList
          key={`inbox-${numColumns}`}
          data={filteredFiles}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name="folder-open"
                iconFamily="Ionicons"
                size={80}
                color="rgba(255,255,255,0.1)"
              />
              <CustomeText color={colors.subtext} style={{ marginTop: 20 }}>
                No files found
              </CustomeText>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            numColumns === 3 && { paddingHorizontal: 12 },
          ]}
          columnWrapperStyle={
            numColumns === 3 ? { justifyContent: 'flex-start' } : null
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        />

        {isSelectionMode && (
          <View style={styles.floatingActions}>
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(30, 41, 59, 1)', 'rgba(15, 23, 42, 1)']
                  : ['rgba(255, 255, 255, 1)', 'rgba(241, 245, 249, 1)']
              }
              style={styles.floatingInner}
            >
              <View
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                }}
              >
                <TouchableOpacity
                  style={styles.floatingBtn}
                  onPress={() =>
                    shareFile(
                      receivedFiles.filter(f => selectedFiles.includes(f.id)),
                    )
                  }
                >
                  <Icon
                    name="share-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color={isDark ? '#fff' : '#1E293B'}
                  />
                  <CustomeText
                    fontSize={12}
                    fontFamily="Okra-Bold"
                    color={isDark ? '#fff' : '#1E293B'}
                  >
                    Share
                  </CustomeText>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.floatingBtn}
                  onPress={() =>
                    deleteFile(
                      receivedFiles.filter(f => selectedFiles.includes(f.id)),
                    )
                  }
                >
                  <Icon
                    name="trash-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color="#EF4444"
                  />
                  <CustomeText
                    fontSize={12}
                    fontFamily="Okra-Bold"
                    color="#EF4444"
                  >
                    Delete
                  </CustomeText>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.floatingBtn}
                  onPress={() => {
                    setIsSelectionMode(false);
                    setSelectedFiles([]);
                  }}
                >
                  <Icon
                    name="close-circle-outline"
                    iconFamily="Ionicons"
                    size={20}
                    color={isDark ? '#94A3B8' : '#64748B'}
                  />
                  <CustomeText
                    fontSize={12}
                    fontFamily="Okra-Bold"
                    color={isDark ? '#94A3B8' : '#64748B'}
                  >
                    Cancel
                  </CustomeText>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}
      </SafeAreaView>

      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalIconBox}>
              <Icon
                name="trash"
                size={32}
                color="#EF4444"
                iconFamily="Ionicons"
              />
            </View>
            <CustomeText
              fontFamily="Okra-Bold"
              fontSize={18}
              color={colors.text}
            >
              {confirmModal.title}
            </CustomeText>
            <CustomeText
              color={colors.subtext}
              style={{ marginTop: 10, textAlign: 'center' }}
            >
              {confirmModal.message}
            </CustomeText>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmModal(p => ({ ...p, visible: false }))}
              >
                <CustomeText color={colors.text}>Cancel</CustomeText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#EF4444',
                }}
                onPress={confirmModal.onConfirm}
              >
                <CustomeText color="#fff" fontFamily="Okra-Bold">
                  Delete
                </CustomeText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: { flex: 1 },
  topNav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 5,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  listContent: { paddingBottom: 110 },
  headerContainer: { paddingBottom: 0, paddingTop: 5 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  statBox: { alignItems: 'center' },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  categoryCard: {
    width: '30%',
    height: 80,
    margin: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    marginTop: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderLine: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    marginRight: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  thumbnail: { width: '100%', height: '100%' },
  listVideoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 5,
    padding: 2,
  },
  gridItem: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    margin: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridItemSelected: { borderColor: '#3B82F6', borderWidth: 2 },
  gridImage: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 4,
  },
  selectionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  listItemInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  listItemTextContainer: { marginLeft: 16, flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  floatingInner: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalContent: {
    padding: 24,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
});

export default ReceivedFileScreen;
