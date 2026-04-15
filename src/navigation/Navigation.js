import { View, Text } from 'react-native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from '../utils/NavigationUtil';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import SendScreen from '../screens/SendScreen';
import ConnectionScreen from '../screens/ConnectionScreen';
import ReceiveScreen from '../screens/ReceiveScreen';
import ReceivedFileScreen from '../screens/ReceivedFileScreen';
import ConnectionHubScreen from '../screens/ConnectionHubScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { TCPProvider } from '../service/TCPProvider';
import { ThemeProvider } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
};

const Navigation = () => {
  return (
    <ThemeProvider>
      <TCPProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName="SplashScreen"
            screenOptions={screenOptions}
          >
            <Stack.Screen name="SplashScreen" component={SplashScreen} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="ConnectionScreen" component={ConnectionScreen} />
            <Stack.Screen name="SendScreen" component={SendScreen} />
            <Stack.Screen name="ReceiveScreen" component={ReceiveScreen} />
            <Stack.Screen name="ReceivedFileScreen" component={ReceivedFileScreen} />
            <Stack.Screen name="ConnectionHubScreen" component={ConnectionHubScreen} />
            <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TCPProvider>
    </ThemeProvider>
  );
};

export default Navigation;
