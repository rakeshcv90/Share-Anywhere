import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from '../global/Icon';
import CustomeText from '../global/CustomeText';
import { useTCP } from '../../service/TCPProvider';
import { navigate } from '../../utils/NavigationUtil';
import { pickDocument, pickImage } from '../../utils/libraryHelpers';

type OptionsProps = {
  isHome?: boolean;
  onMediaPickedUp?: (media: any) => void;
  onFilePickedUp?: (file: any) => void;
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
  const animations = useRef(optionData.map(() => new Animated.Value(0))).current;

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

  const handleUniversalPicker = async (type: string) => {
    if (isHome) {
      if (isConnected) {
        navigate('ConnectionScreen');
      } else {
        navigate('SendScreen');
      }
      return;
    }

    switch (type) {
      case 'image':
        if (onMediaPickedUp) {
          pickImage((media: any) => {
            onMediaPickedUp({ ...media, type: 'image' });
          }, 'photo');
        }
        break;
      case 'video':
        if (onMediaPickedUp) {
          pickImage((media: any) => {
            onMediaPickedUp({ ...media, type: 'video' });
          }, 'video');
        }
        break;
      case 'audio':
        if (onFilePickedUp) {
          pickDocument(
            (file: any) => {
              onFilePickedUp({ ...file, type: 'audio' });
            },
            ['audio/*'],
          );
        }
        break;
      case 'file':
        if (onFilePickedUp) {
          pickDocument((file: any) => {
            onFilePickedUp({ ...file, type: 'file' });
          });
        }
        break;
      default:
        break;
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
              <CustomeText style={styles.label} fontFamily="Okra-Medium">
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
    borderColor: 'rgba(0,0,0,0.1)',
  },

  sectionTitle: {
    color: '#9CA3AF',
    letterSpacing: 2,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  label: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    color: '#4A5568',
  },
});

export default Options;
