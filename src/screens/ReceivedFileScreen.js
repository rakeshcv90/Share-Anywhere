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
} from 'react-native';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '../components/global/Icon';
import CustomeText from '../components/global/CustomeText';
import { formatFileSize } from '../utils/libraryHelpers';
import { goBack } from '../utils/NavigationUtil';

const { height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const AnimatedCard = Animated.createAnimatedComponent(TouchableOpacity);

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid', iconFamily: 'Ionicons' },
  { id: 'images', label: 'Images', icon: 'image', iconFamily: 'Ionicons' },
  { id: 'videos', label: 'Videos', icon: 'videocam', iconFamily: 'Ionicons' },
  {
    id: 'audio',
    label: 'Audio',
    icon: 'musical-notes',
    iconFamily: 'Ionicons',
  },
  { id: 'docs', label: 'Docs', icon: 'document-text', iconFamily: 'Ionicons' },
];

const ReceivedFileScreen = () => {
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef([]);

  // Memoized Stats
  const totalSize = useMemo(
    () => receivedFiles.reduce((acc, file) => acc + file.size, 0),
    [receivedFiles],
  );

  const fileCount = receivedFiles.length;

  const filteredFiles = useMemo(() => {
    if (selectedCategory === 'all') return receivedFiles;
    return receivedFiles.filter(file => {
      const ext = file.mimeType?.toLowerCase();
      switch (selectedCategory) {
        case 'images':
          return ['jpg', 'jpeg', 'png', 'gif', 'heic'].includes(ext);
        case 'videos':
          return ['mp4', 'mov', 'avi'].includes(ext);
        case 'audio':
          return ['mp3', 'wav', 'm4a'].includes(ext);
        case 'docs':
          return ['pdf', 'doc', 'docx', 'txt', 'zip', 'rar', '7z'].includes(
            ext,
          );
        default:
          return true;
      }
    });
  }, [receivedFiles, selectedCategory]);

  // Screen Entrance Animation
  useEffect(() => {
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
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load Files
  const getFilesFromDirectory = async () => {
    try {
      setIsLoading(true);

      const directoryPath =
        Platform.OS === 'android'
          ? RNFS.ExternalDirectoryPath
          : RNFS.DocumentDirectoryPath;

      const exists = await RNFS.exists(directoryPath);
      if (!exists) {
        setReceivedFiles([]);
        return;
      }

      const files = await RNFS.readDir(directoryPath);

      const formattedFiles = files
        .filter(
          file => file.isFile() && !file.name.startsWith('.') && file.size > 0,
        )
        .map(file => ({
          id: file.path,
          name: file.name,
          size: file.size,
          uri: file.path,
          mimeType: file.name.split('.').pop() || 'unknown',
          modifiedTime: new Date(file.mtime || 0).getTime(),
        }))
        .sort((a, b) => b.modifiedTime - a.modifiedTime);

      // Create animations safely
      cardAnimations.current = formattedFiles.map(() => new Animated.Value(0));

      setReceivedFiles(formattedFiles);
    } catch (error) {
      console.log('File Load Error:', error);
      setReceivedFiles([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getFilesFromDirectory();
  }, []);

  // Stagger Card Animation
  useEffect(() => {
    if (receivedFiles.length > 0 && !isLoading) {
      Animated.stagger(
        60,
        cardAnimations.current.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ),
      ).start();
    }
  }, [receivedFiles, isLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getFilesFromDirectory();
  }, []);

  const getFileIcon = mimeType => {
    const ext = mimeType?.toLowerCase();
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

  const openFile = file => {
    const path = isIOS ? `file://${file.uri}` : file.uri;
    const extension = file.mimeType?.toLowerCase();

    let mime = '*/*';
    if (['jpg', 'jpeg', 'png'].includes(extension))
      mime = 'image/' + (extension === 'jpg' ? 'jpeg' : extension);
    if (['mp4', 'mov'].includes(extension)) mime = 'video/mp4';
    if (['mp3', 'wav'].includes(extension)) mime = 'audio/mpeg';

    if (isIOS) {
      ReactNativeBlobUtil.ios.openDocument(path).catch(console.log);
    } else {
      ReactNativeBlobUtil.android
        .actionViewIntent(path, mime)
        .catch(console.log);
    }
  };

  const deleteFile = async file => {
    const filesToDelete = Array.isArray(file) ? file : [file];
    const isMultiple = filesToDelete.length > 1;

    Alert.alert(
      isMultiple ? 'Delete Files' : 'Delete File',
      isMultiple
        ? `Are you sure you want to delete ${filesToDelete.length} files?`
        : `Are you sure you want to delete "${filesToDelete[0].name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const f of filesToDelete) {
                await RNFS.unlink(f.uri);
              }
              if (isMultiple) {
                setIsSelectionMode(false);
                setSelectedFiles([]);
              }
              getFilesFromDirectory(); // Refresh list
            } catch (error) {
              console.log('Delete Error:', error);
              Alert.alert('Error', 'Could not delete file(s)');
            }
          },
        },
      ],
    );
  };

  const shareFile = async file => {
    try {
      const filesToShare = Array.isArray(file) ? file : [file];
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

      const shareOptions = {
        title: 'Share Files',
        urls: results, // Use 'urls' for multiple files
        failOnCancel: false,
      };

      await Share.open(shareOptions);
      if (filesToShare.length > 1) {
        setIsSelectionMode(false);
        setSelectedFiles([]);
      }
    } catch (error) {
      console.log('Share Error:', error);
      if (error?.message && !error.message.includes('User did not share')) {
        Alert.alert('Share Error', error.message);
      }
    }
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
    if (!isSelectionMode) {
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

  const renderIcon = mimeType => {
    const { iconName, gradientColors } = getFileIcon(mimeType);

    return (
      <LinearGradient
        colors={gradientColors}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ rotate: '5deg' }],
        }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name={iconName} size={22} color="#fff" iconFamily="Ionicons" />
        </View>
      </LinearGradient>
    );
  };

  const renderItem = ({ item, index }) => {
    const animValue = cardAnimations.current[index] || new Animated.Value(1);

    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [40, 0],
    });

    const opacity = animValue;

    const isSelected = selectedFiles.includes(item.id);

    return (
      <AnimatedCard
        style={{
          marginHorizontal: 16,
          marginVertical: 8,
          padding: 16,
          borderRadius: 22,
          backgroundColor: isSelected ? '#EFF6FF' : '#fff',
          borderWidth: isSelected ? 2 : 0,
          borderColor: '#3B82F6',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isIOS ? 4 : 8 },
          shadowOpacity: isIOS ? 0.08 : 0.12,
          shadowRadius: isIOS ? 8 : 16,
          elevation: 6,
          transform: [{ translateY }],
          opacity,
          overflow: isIOS ? 'visible' : 'hidden',
        }}
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            marginRight: 10,
          }}
        >
          {renderIcon(item.mimeType)}
          <View style={{ marginLeft: 16, flex: 1 }}>
            <CustomeText
              fontFamily="Okra-Bold"
              fontSize={14}
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
                  borderRadius: 6,
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

        {!isSelectionMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => shareFile(item)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F1F5F9',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <Icon
                name="share-outline"
                iconFamily="Ionicons"
                size={18}
                color="#475569"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteFile(item)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#FEF2F2',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <Icon
                name="trash-outline"
                iconFamily="Ionicons"
                size={18}
                color="#EF4444"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openFile(item)}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                }}
              >
                <Icon
                  name="eye-outline"
                  iconFamily="Ionicons"
                  size={18}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isSelectionMode && (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
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
                size={16}
                color="#fff"
                iconFamily="Ionicons"
              />
            )}
          </View>
        )}
      </AnimatedCard>
    );
  };

  const renderHeader = () => (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        zIndex: 10,
      }}
    >
      {/* Stats Cards */}
      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10 }}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={{
            flex: 1,
            borderRadius: 20,
            overflow: 'hidden', // 👈 important for iOS
          }}
        >
          <View
            style={{
              flex: 1,
              padding: 16, // 👈 move padding here
              justifyContent: 'space-between',
            }}
          >
            <Icon
              name="document-text"
              iconFamily="Ionicons"
              size={26}
              color="#fff"
            />

            <View>
              <CustomeText fontSize={22} fontFamily="Okra-Bold" color="#fff">
                {fileCount}
              </CustomeText>

              <CustomeText
                fontSize={12}
                color="rgba(255,255,255,0.8)"
                fontFamily="Okra-Medium"
              >
                Total Files
              </CustomeText>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          style={{
            flex: 1,
            borderRadius: 20,
            overflow: 'hidden', // 🔥 important for iOS
            shadowColor: '#6D28D9',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
            minHeight: 120, // 🔥 keeps layout stable
          }}
        >
          <View
            style={{
              flex: 1,
              padding: 16, // 👈 move padding here
              justifyContent: 'space-between',
            }}
          >
            <Icon
              name="cloud-download"
              iconFamily="Ionicons"
              size={26}
              color="#fff"
            />

            <View>
              <CustomeText
                fontSize={20}
                fontFamily="Okra-Bold"
                color="#fff"
                numberOfLines={1}
                ellipsizeMode="tail"
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
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Categories Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 20,
          gap: 12,
        }}
      >
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: isActive ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderColor: isActive ? '#3B82F6' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Icon
                name={cat.icon}
                iconFamily={cat.iconFamily}
                size={16}
                color={isActive ? '#fff' : 'rgba(255,255,255,0.6)'}
                style={{ marginRight: 8 }}
              />
              <CustomeText
                fontFamily={isActive ? 'Okra-Bold' : 'Okra-Medium'}
                fontSize={13}
                color={isActive ? '#fff' : 'rgba(255,255,255,0.6)'}
              >
                {cat.label}
              </CustomeText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Title */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 4,
              height: 24,
              backgroundColor: '#3B82F6',
              borderRadius: 2,
              marginRight: 10,
            }}
          />
          <CustomeText fontSize={18} fontFamily="Okra-Bold" color="#fff">
            {CATEGORIES.find(c => c.id === selectedCategory)?.label} Files
          </CustomeText>
        </View>
        <TouchableOpacity onPress={onRefresh} style={{ padding: 4 }}>
          <Icon name="refresh" iconFamily="Ionicons" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: height * 0.15,
        opacity: fadeAnim,
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Icon
          name="cloud-offline"
          iconFamily="Ionicons"
          size={60}
          color="rgba(255,255,255,0.3)"
        />
      </LinearGradient>
      <CustomeText fontFamily="Okra-Bold" fontSize={20} color="#fff">
        No Files Yet
      </CustomeText>
      <CustomeText
        fontFamily="Okra-Medium"
        fontSize={14}
        color="rgba(255,255,255,0.6)"
        style={{ marginTop: 8, textAlign: 'center', marginHorizontal: 40 }}
      >
        Files you receive via SHareIt will appear safely in this inbox.
      </CustomeText>
    </Animated.View>
  );

  return (
    <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          style={{ flex: 1 }}
          edges={['top', 'left', 'right', 'bottom']}
        >
          {/* Header */}
          <Animated.View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              transform: [{ translateY: headerSlideAnim }],
              opacity: fadeAnim,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedFiles([]);
                } else {
                  goBack();
                }
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.1)',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}
            >
              <Icon
                name={isSelectionMode ? 'close' : 'arrow-back'}
                iconFamily="Ionicons"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
            <CustomeText fontFamily="Okra-Bold" fontSize={26} color="#fff">
              {isSelectionMode ? `${selectedFiles.length} Selected` : 'Inbox'}
            </CustomeText>
          </Animated.View>

          {isSelectionMode && (
            <Animated.View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                paddingVertical: 10,
                backgroundColor: 'rgba(255,255,255,0.05)',
                marginHorizontal: 20,
                borderRadius: 20,
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  const selectedItems = receivedFiles.filter(f =>
                    selectedFiles.includes(f.id),
                  );
                  shareFile(selectedItems);
                }}
                style={{ alignItems: 'center' }}
              >
                <Icon
                  name="share-outline"
                  iconFamily="Ionicons"
                  size={24}
                  color="#fff"
                />
                <CustomeText fontSize={10} color="#fff">
                  Share
                </CustomeText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const selectedItems = receivedFiles.filter(f =>
                    selectedFiles.includes(f.id),
                  );
                  deleteFile(selectedItems);
                }}
                style={{ alignItems: 'center' }}
              >
                <Icon
                  name="trash-outline"
                  iconFamily="Ionicons"
                  size={24}
                  color="#EF4444"
                />
                <CustomeText fontSize={10} color="#EF4444">
                  Delete
                </CustomeText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (selectedFiles.length === filteredFiles.length) {
                    setSelectedFiles([]);
                    setIsSelectionMode(false);
                  } else {
                    setSelectedFiles(filteredFiles.map(f => f.id));
                  }
                }}
                style={{ alignItems: 'center' }}
              >
                <Icon
                  name="checkbox-outline"
                  iconFamily="Ionicons"
                  size={24}
                  color="#fff"
                />
                <CustomeText fontSize={10} color="#fff">
                  {selectedFiles.length === filteredFiles.length
                    ? 'Deselect All'
                    : 'Select All'}
                </CustomeText>
              </TouchableOpacity>
            </Animated.View>
          )}

          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color="#3B82F6" />
              <CustomeText
                color="rgba(255,255,255,0.7)"
                style={{ marginTop: 15 }}
              >
                Scanning your inbox...
              </CustomeText>
            </View>
          ) : receivedFiles.length > 0 ? (
            <FlatList
              data={filteredFiles}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={() => (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 40,
                  }}
                >
                  <Icon
                    name="folder-open"
                    iconFamily="Ionicons"
                    size={50}
                    color="rgba(255,255,255,0.2)"
                  />
                  <CustomeText
                    color="rgba(255,255,255,0.5)"
                    style={{ marginTop: 12 }}
                  >
                    No {CATEGORIES.find(c => c.id === selectedCategory)?.label}{' '}
                    found
                  </CustomeText>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#fff"
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
