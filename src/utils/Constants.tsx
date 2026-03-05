import { Alert, Dimensions, Platform } from 'react-native';
import {
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
  check,
} from 'react-native-permissions';

// export const requestPhotoPermission = async () => {
//   if (Platform.OS !== 'ios') {
//     return
//   }else{
//   try {
//     const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
//     if (result === RESULTS.GRANTED) {
//       console.log('STORAGE PERMISSION GRANTED ✅');
//     } else {
//       console.log('STORAGE PERMISSION DENIED ❌');
//     }
//   } catch (error) {
//     console.error('Error requesting permission:', error);
//   }
//   }

// };

export const requestPhotoPermission = async () => {
  try {
    let permission;

    if (Platform.OS === 'ios') {
      permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
    } else if (Platform.OS === 'android') {
      permission =
        Platform.Version >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
    } else {
      return;
    }

    const currentStatus = await check(permission);

    if (currentStatus === RESULTS.GRANTED) {
      console.log('PHOTO PERMISSION ALREADY GRANTED ✅');
      return true;
    }

    if (currentStatus === RESULTS.BLOCKED) {
      Alert.alert(
        'Permission Blocked',
        'Photo access is blocked. Please enable it in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ],
      );
      return false;
    }

    const result = await request(permission);

    if (result === RESULTS.GRANTED) {
      console.log('PHOTO PERMISSION GRANTED ✅');
      return true;
    } else if (result === RESULTS.DENIED) {
      console.log('PHOTO PERMISSION DENIED ❌');
      Alert.alert(
        'Permission Denied',
        'You need to allow photo access to use this feature.',
      );
      return false;
    } else if (result === RESULTS.BLOCKED) {
      console.log('PHOTO PERMISSION BLOCKED ❌');
      Alert.alert(
        'Permission Blocked',
        'Photo access is blocked. Please enable it in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ],
      );
      return false;
    }
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
};

export const isBase64 = (str: string) => {
  const base64Regex =
    /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
  return base64Regex.test(str);
};

export const screenHeight = Dimensions.get('screen').height;
export const screenWidth = Dimensions.get('screen').width;
export const multiColor = [
  '#0B3D91',
  '#1E4DFF',
  '#104E8B',
  '#4682B4',
  '#6A5ACD',
  '#7B68EE',
];
export const svgPath =
  'M0,100L120,120C240,140,480,180,720,180C960,180,1200,140,1320,120L1440,100L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z';

export enum Colors {
  primary = '#007AFF',
  background = '#fff',
  text = '#222',
  theme = '#CF551F',
  secondary = '#E5EBF5',
  tertiary = '#3C75BE',
  secondary_light = '#F6F7F9',
}
