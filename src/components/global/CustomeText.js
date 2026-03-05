import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { RFValue } from 'react-native-responsive-fontsize';
import { Colors } from '../../utils/Constants';

const fontSizeMap = {
  h1: { android: 24, ios: 22 },
  h2: { android: 22, ios: 20 },
  h3: { android: 20, ios: 18 },
  h4: { android: 18, ios: 16 },
  h5: { android: 16, ios: 14 },
  h6: { android: 12, ios: 10 },
  h7: { android: 10, ios: 9 },
};
const CustomeText = ({
  varient,
  fontFamily = 'Okra-Regular',
  fontSize,
  style,
  color,
  children,
  onLayout,
  numberOfLines,
  ...props
}) => {
  let computedFontSize =
    Platform.OS === 'android'
      ? RFValue(fontSize || 12)
      : RFValue(fontSize || 10);

  if (varient && fontSizeMap[varient]) {
    const defaultSize = fontSizeMap[varient][Platform.OS];
    computedFontSize = RFValue(fontSize || defaultSize);
  }
  const fontFamilyStyle = {
    fontFamily,
  };
  return (
    <Text
      onLayout={onLayout}
      style={[
        styles.text,
        {
          color: color || Colors.text,
          fontSize: computedFontSize,
        },
        fontFamilyStyle,
        style,
      ]}
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </Text>
  );
};

export default CustomeText;
const styles = StyleSheet.create({
  text: {
    textAlign: 'left',
  },
});
