import { Platform } from 'react-native';
import React, { useEffect } from 'react';
import Navigation from './src/navigation/Navigation';
import { checkFilePermissions } from './src/utils/libraryHelpers';
import { requestPhotoPermission } from './src/utils/Constants';
import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';
const App = () => {
  useEffect(() => {
    requestPhotoPermission();
    checkFilePermissions();

    if (Platform.OS === 'android') {
      Settings.setAppID('1929797217701449');
      Settings.initializeSDK();
      Settings.setAdvertiserTrackingEnabled(true);
      AppEventsLogger.logEvent('fb_mobile_activate_app');
    }
  }, []);
  return <Navigation />;
};

export default App;
