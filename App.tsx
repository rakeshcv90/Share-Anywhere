import { View, Text, Platform } from 'react-native';
import React, { useEffect } from 'react';
import Navigation from './src/navigation/Navigation';
import { requestNotifications } from 'react-native-permissions';
import { checkFilePermissions } from './src/utils/libraryHelpers';
import { requestPhotoPermission } from './src/utils/Constants';

const App = () => {
  useEffect(() => {
    requestPhotoPermission();
    checkFilePermissions()
  }, []);
  return <Navigation />;
};

export default App;
