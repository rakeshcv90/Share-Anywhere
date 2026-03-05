import {launchImageLibrary, Asset} from 'react-native-image-picker';
import {pick} from '@react-native-documents/picker';
import {PermissionsAndroid} from 'react-native';
import { Platform, Alert } from 'react-native';

import { 
  PERMISSIONS, 
  RESULTS, 
  check, 
  request, 
  openSettings 
} from 'react-native-permissions';

type MediaPickedCallback = (media: Asset) => void;
type FilePickedCallback = (file: any) => void;

export const pickImage = (onMediaPickedUp: MediaPickedCallback) => {
  launchImageLibrary(
    {
      mediaType: 'photo',
      quality: 1,
      includeBase64: false,
    },
    (response: any) => {
      if (response.didCancel) {
        console.log('User canceled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        const {assets} = response;
        if (assets && assets.length > 0) {
          const selectedImage = assets[0];
          onMediaPickedUp(selectedImage);
        }
      }
    },
  );
};

export const pickDocument = async (onFilePickedUp: FilePickedCallback) => {
  try {
    const [pickResult] = await pick();
    onFilePickedUp(pickResult);
  } catch (err: unknown) {
    console.log(err);
  }
};

export const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes >= 1024 ** 3) {
    return (sizeInBytes / 1024 ** 3).toFixed(2) + ' GB';
  } else if (sizeInBytes >= 1024 ** 2) {
    return (sizeInBytes / 1024 ** 2).toFixed(2) + ' MB';
  } else if (sizeInBytes >= 1024) {
    return (sizeInBytes / 1024).toFixed(2) + ' KB';
  } else {
    return sizeInBytes + ' B';
  }
};

// export const checkFilePermissions = async (platform: string) => {
//   if (platform === 'android') {
//     try {
//       const granted = await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//       if (
//         granted['android.permission.READ_EXTERNAL_STORAGE'] &&
//         granted['android.permission.WRITE_EXTERNAL_STORAGE']
//       ) {
//         console.log('STORAGE PERMISSION GRANTED ✅');
//         return true;
//       } else {
//         return false;
//       }
//     } catch (err) {
//       return false;
//     }
//   } else {
//     return true;
//   }
// };

export const checkFilePermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      // Android 13+ uses READ_MEDIA_IMAGES for photos
      const readPermission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const writePermission = Platform.Version < 33
        ? PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        : null;

      const permissionsToRequest = writePermission
        ? [readPermission, writePermission]
        : [readPermission];

      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const readGranted = granted[readPermission] === PermissionsAndroid.RESULTS.GRANTED;
      const writeGranted = writePermission
        ? granted[writePermission] === PermissionsAndroid.RESULTS.GRANTED
        : true;

      if (readGranted && writeGranted) {
        console.log('ANDROID STORAGE PERMISSION GRANTED ✅');
        return true;
      } else {
        console.log('ANDROID STORAGE PERMISSION DENIED ❌');
        return false;
      }
    } else if (Platform.OS === 'ios') {
      const permission = PERMISSIONS.IOS.PHOTO_LIBRARY;

      // Check current status first
      const status = await check(permission);

      if (status === RESULTS.GRANTED) {
        console.log('iOS PHOTO PERMISSION GRANTED ✅');
        return true;
      } else if (status === RESULTS.BLOCKED) {
        Alert.alert(
          'Permission Blocked',
          'Photo access is blocked. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => openSettings() },
          ]
        );
        return false;
      } else {
        // Request permission
        const result = await request(permission);
        if (result === RESULTS.GRANTED) {
          console.log('iOS PHOTO PERMISSION GRANTED ✅');
          return true;
        } else {
          console.log('iOS PHOTO PERMISSION DENIED ❌');
          return false;
        }
      }
    } else {
      // Other platforms, just allow
      return true;
    }
  } catch (error) {
    console.error('Error checking file permissions:', error);
    return false;
  }
};