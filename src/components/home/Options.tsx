import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from '../global/Icon';
import CustomeText from '../global/CustomeText';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';
import {
  pickDocument,
  pickImage,
  pickVideo,
  pickAudio,
} from '../../utils/libraryHelpers';
import { Colors } from '../../utils/Constants';

type OptionsProps = {
  isHome?: boolean;
  onMediaPickedUp?: (media: any[]) => void;
  onFilePickedUp?: (files: any[]) => void;
};

const optionData = [
  {
    type: 'image',
    icon: 'images',
    family: 'Ionicons',
    label: 'Photos',
    bg: '#FFE0E0',
    color: '#E53935',
  },
  {
    type: 'audio',
    icon: 'musical-notes-sharp',
    family: 'Ionicons',
    label: 'Audio',
    bg: '#E8DEF8',
    color: '#7C4DFF',
  },
  {
    type: 'video',
    icon: 'ondemand-video',
    family: 'MaterialIcons',
    label: 'Video',
    bg: '#D0F5E0',
    color: '#2E7D32',
  },
  {
    type: 'file',
    icon: 'folder-open',
    family: 'Ionicons',
    label: 'Files',
    bg: '#FFF3D0',
    color: '#F9A825',
  },
];

const Options: React.FC<OptionsProps> = ({
  isHome,
  onFilePickedUp,
  onMediaPickedUp,
}) => {
  const { isConnected } = useTCP();
  const animations = useRef(
    optionData.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.stagger(
      100,
      animations.map(anim =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  const isPicking = useRef(false);

  const handleUniversalPicker = async (type: string) => {
    if (isPicking.current) return;
    isPicking.current = true;

    console.log('Option selected:', type);
    if (isHome) {
      if (isConnected) {
        navigate('ConnectionScreen');
      } else {
        navigate('SendScreen');
      }
      isPicking.current = false;
      return;
    }

    try {
      switch (type) {
        case 'image':
          if (onMediaPickedUp) {
            pickImage((media: any[]) => {
              onMediaPickedUp(media.map(m => ({ ...m, type: 'image' })));
            });
          }
          break;
        case 'video':
          if (onMediaPickedUp) {
            pickVideo((media: any[]) => {
              onMediaPickedUp(media.map(m => ({ ...m, type: 'video' })));
            });
          }
          break;

        case 'audio':
          if (onFilePickedUp) {
            await pickAudio((files: any[]) => {
              onFilePickedUp(files.map(f => ({ ...f, type: 'audio' })));
            });
          }
          break;
        case 'file':
          if (onFilePickedUp) {
            await pickDocument((files: any[]) => {
              onFilePickedUp(files.map(f => ({ ...f, type: 'file' })));
            });
          }
          break;
        default:
          break;
      }
    } catch (e) {
      console.log('Picker Error:', e);
    } finally {
      // Small timeout to prevent double-click issues
      setTimeout(() => {
        isPicking.current = false;
      }, 500);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.dashLine} />
        <CustomeText
          style={styles.sectionTitle}
          fontFamily="Okra-Bold"
          fontSize={11}
          variant="title"
          color="rgba(255,255,255,0.55)"
          onLayout={() => {}}
          numberOfLines={1}
        >
          QUICK ACCESS
        </CustomeText>
        <View style={styles.dashLine} />
      </View>

      {/* Options Row */}
      <View style={styles.row}>
        {optionData.map((item, index) => (
          <Animated.View
            key={index}
            style={{
              opacity: animations[index],
              transform: [
                {
                  scale: animations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => handleUniversalPicker(item.type)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                <Icon
                  name={item.icon}
                  iconFamily={item.family}
                  color={item.color}
                  size={24}
                />
              </View>
              <CustomeText
                style={[styles.label, { color: isHome ? '#000' : '#fff' }]}
                fontFamily="Okra-Medium"
                fontSize={12}
                variant="h6"
                color={isHome ? '#000' : '#fff'}
                onLayout={() => {}}
                numberOfLines={1}
              >
                {item.label}
              </CustomeText>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 18,
    paddingHorizontal: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },

  dashLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  sectionTitle: {
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },

  card: {
    alignItems: 'center',
    width: 68,
  },

  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  label: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    color: '#000',
  },
});

export default Options;
