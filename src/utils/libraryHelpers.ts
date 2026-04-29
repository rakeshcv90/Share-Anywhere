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
import Contacts from 'react-native-contacts';
import RNFS from 'react-native-fs';

type MediaPickedCallback = (media: Asset) => void;
type FilePickedCallback = (file: any) => void;

export const pickImage = (onMediaPickedUp: (media: Asset[]) => void) => {
  if (Platform.OS === 'macos') {
    // 🖥️ macOS: Use document picker for images since gallery library picker is mobile-only
    pick({
      type: ['public.image'],
      allowMultiSelection: true,
    }).then(files => {
      if (files && files.length > 0) {
        const assets = files.map((f: any) => ({
          uri: f.uri,
          fileName: f.name,
          fileSize: f.size ? Number(f.size) : 0,
          type: f.type || 'image/jpeg',
          name: f.name,
          size: f.size ? Number(f.size) : 0,
        }));
        onMediaPickedUp(assets as any);
      }
    }).catch(err => console.log('MacOS Image pick error:', err));
    return;
  }

  launchImageLibrary(
    {
      mediaType: 'photo',
      quality: 1,
      includeBase64: false,
      selectionLimit: 0, // Allow multiple selection
      copyTo: 'cachesDirectory' as any, // Guarantee local file:// URI
    } as any,
    (response: any) => {
      if (response.didCancel) {
        console.log('User canceled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        const {assets} = response;
        if (assets && assets.length > 0) {
          const normalized = assets.map((a: any) => ({
            ...a,
            uri: a.copyToPath || a.uri,
            copyToPath: a.copyToPath,
            name: a.fileName || a.name,
            size: a.fileSize || a.size || 0,
          }));
          onMediaPickedUp(normalized);
        }
      }
    },
  );
};
export const pickVideo = async (onMediaPickedUp: (media: Asset[]) => void) => {
  try {
    if (Platform.OS === 'macos') {
      // 🖥️ macOS: Use document picker for videos
      const files = await pick({
        type: ['public.movie', 'public.video'],
        allowMultiSelection: true,
      });

      if (files && files.length > 0) {
        const assets = files.map((f: any) => ({
          uri: f.uri,
          fileName: f.name,
          fileSize: f.size ? Number(f.size) : 0,
          type: f.type || 'video/mp4',
          name: f.name,
          size: f.size ? Number(f.size) : 0,
        }));
        onMediaPickedUp(assets as any);
      }
      return;
    }

    if (Platform.OS === 'ios') {
      // 🍎 iOS: Use image library picker — the document picker (Files app) does NOT show
      // Photos library videos. launchImageLibrary accesses the camera roll where videos live.
      launchImageLibrary(
        {
          mediaType: 'video',
          quality: 1,
          includeBase64: false,
          selectionLimit: 0, // Allow multiple selection
          copyTo: 'cachesDirectory' as any, // Ensures a local file:// URI for stable access
        } as any,
        (response: any) => {
          if (response.didCancel) {
            console.log('User canceled video picker');
          } else if (response.errorCode) {
            console.log('VideoPicker Error: ', response.errorMessage);
          } else {
            const {assets} = response;
            if (assets && assets.length > 0) {
              // Normalize: ensure copyToPath is used as the primary URI
              const normalized = assets.map((a: any) => ({
                ...a,
                uri: a.copyToPath || a.uri,
                copyToPath: a.copyToPath,
                name: a.fileName || a.name,
                size: a.fileSize || a.size || 0,
              }));
              console.log(`--- pickVideo (iOS): ${normalized.length} videos selected via image library`);
              onMediaPickedUp(normalized);
            }
          }
        },
      );
    } else {
      // 🤖 Android: Use document picker for INSTANT results — avoids react-native-image-picker's
      // slow video metadata probing (width/height/duration) which causes 20-30s delays
      // when selecting 10-15+ videos. The document picker returns content:// URIs
      // immediately without scanning each video file.
      const files = await pick({
        type: ['video/*'],
        allowMultiSelection: true,
      });

      if (files && files.length > 0) {
        // Transform to match Asset-like format expected by onMediaPickedUp/sendBatchAck
        const assets = files.map((f: any) => ({
          uri: f.uri,
          fileName: f.name,
          fileSize: f.size ? Number(f.size) : 0,
          type: f.type || 'video/mp4',
          name: f.name,
          size: f.size ? Number(f.size) : 0,
        }));
        console.log(`--- pickVideo (Android): ${assets.length} videos selected via document picker`);
        onMediaPickedUp(assets as any);
      }
    }
  } catch (err: any) {
    if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
      console.log('Video pick error:', err);
    }
  }
};

export const pickAudio = async (onFilePickedUp: (files: any[]) => void) => {
  try {
    // Small delay to ensure Android activity state is stable
    await new Promise<void>(resolve => setTimeout(() => resolve(), 200));
    
    const files = await pick({
      type: Platform.OS === 'ios' || Platform.OS === 'macos' ? ['public.audio'] : ['*/*', 'audio/*'],
      allowMultiSelection: true,
      copyTo: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'cachesDirectory' : undefined,
    });

    onFilePickedUp(files);
  } catch (err) {
    console.log('Audio pick error:', err);
  }
};

export const pickDocument = async (onFilePickedUp: (files: any[]) => void) => {
  try {
    // Small delay to ensure Android activity state is stable
    await new Promise<void>(resolve => setTimeout(() => resolve(), 200));

    const pickResults = await pick({
      allowMultiSelection: true,
      type: Platform.OS === 'ios' || Platform.OS === 'macos' ? ['public.item', 'public.content', 'public.data'] : ['*/*'],
      copyTo: Platform.OS === 'ios' || Platform.OS === 'macos' ? 'cachesDirectory' : undefined,
    });
    onFilePickedUp(pickResults);
  } catch (err: unknown) {
    console.log(err);
  }
};

export const pickContact = async () => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return { status: 'denied' };
      }
    }

    const contacts = await Contacts.getAll();
    return { status: 'granted', contacts };
  } catch (err) {
    console.log('Contact fetch error:', err);
    return { status: 'error' };
  }
};

export const createVCFAndSend = async (contact: any, onFilePickedUp: (files: any[]) => void) => {
  try {
    const defaultName = contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
    const name = defaultName || 'Contact';
    const phone = contact.phoneNumbers?.[0]?.number || '';
    const email = contact.emailAddresses?.[0]?.email || '';
    
    let vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n`;
    if (contact.givenName) vcf += `N:${contact.familyName || ''};${contact.givenName || ''};;;\n`;
    if (phone) vcf += `TEL;TYPE=CELL:${phone}\n`;
    if (email) vcf += `EMAIL;TYPE=INTERNET:${email}\n`;
    vcf += `END:VCARD`;

    const fileName = `${name.replace(/\s+/g, '_') || 'Contact'}.vcf`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

    await RNFS.writeFile(filePath, vcf, 'utf8');
    const fileStat = await RNFS.stat(filePath);

    onFilePickedUp([{
      uri: Platform.OS === 'android' ? `file://${filePath}` : filePath,
      name: fileName,
      size: fileStat.size,
      type: 'text/vcard',
    }]);
  } catch (err) {
    console.log('VCF creation error:', err);
  }
};

export const parseVCF = async (filePath: string) => {
  try {
    const content = await RNFS.readFile(filePath.replace('file://', ''), 'utf8');
    
    const fnMatch = content.match(/FN:(.*)/i);
    const name = fnMatch ? fnMatch[1].trim() : 'Unknown Contact';
    
    const telMatch = content.match(/TEL;?[^:]*:(.*)/i);
    const phone = telMatch ? telMatch[1].trim() : '';

    const emailMatch = content.match(/EMAIL;?[^:]*:(.*)/i);
    const email = emailMatch ? emailMatch[1].trim() : '';

    const orgMatch = content.match(/ORG:(.*)/i);
    const company = orgMatch ? orgMatch[1].trim() : '';

    return {
      givenName: name.split(' ')[0] || 'Contact',
      familyName: name.split(' ').slice(1).join(' ') || '',
      phoneNumbers: phone ? [{ label: 'mobile', number: phone }] : [],
      emailAddresses: email ? [{ label: 'work', email: email }] : [],
      company: company || '',
    };
  } catch (err) {
    console.error('Error parsing VCF:', err);
    return null;
  }
};

export const saveVCFToContacts = async (filePath: string) => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Contacts write permission is required to save.');
        return;
      }
    }

    const contactData = await parseVCF(filePath);
    if (contactData) {
      await Contacts.openContactForm(contactData as any);
    } else {
      Alert.alert('Error', 'Could not parse vCard file.');
    }
  } catch (err) {
    console.error('Error saving contact:', err);
    Alert.alert('Error', 'Failed to save contact.');
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
      // macOS or other platforms: Assume granted or handled by sandbox entitlements
      return true;
    }
  } catch (error) {
    console.error('Error checking file permissions:', error);
    return false;
  }
};