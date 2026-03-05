// /**
//  * @format
//  */

// import { AppRegistry } from 'react-native';
// import App from './App';
// import { name as appName } from './app.json';

// AppRegistry.registerComponent(appName, () => App);
/**
 * @format
 */

import {AppRegistry, Text, TextInput} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

if (Text.defaultProps) {
  Text.defaultProps.allowFontScaling = false;
} else {
  Text.defaultProps = {};
  Text.defaultProps.allowFontScaling = false;
}

if (TextInput.defaultProps) {
  TextInput.defaultProps.allowFontScaling = false;
} else {
  TextInput.defaultProps = {};
  TextInput.defaultProps.allowFontScaling = false;
}

AppRegistry.registerComponent(appName, () => App);