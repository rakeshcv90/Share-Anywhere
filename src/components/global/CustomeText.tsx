import { Text, StyleSheet, Platform, TextStyle, StyleProp } from 'react-native';
import React from 'react';
import { RFValue } from 'react-native-responsive-fontsize';
import { Colors } from '../../utils/Constants';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7';

const fontSizeMap: Record<Variant, { android: number; ios: number }> = {
  h1: { android: 24, ios: 22 },
  h2: { android: 22, ios: 20 },
  h3: { android: 20, ios: 18 },
  h4: { android: 18, ios: 16 },
  h5: { android: 16, ios: 14 },
  h6: { android: 12, ios: 10 },
  h7: { android: 10, ios: 9 },
};

interface CustomeTextProps {
  variant?: Variant;
  fontFamily?: string;
  fontSize?: number;
  style?: StyleProp<TextStyle>;
  color?: string;
  children?: React.ReactNode;
  numberOfLines?: number;
  onLayout?: (event: any) => void;
  [key: string]: any;
}

const CustomeText: React.FC<CustomeTextProps> = ({
  variant,
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

  if (variant && fontSizeMap[variant]) {
    const defaultSize = fontSizeMap[variant][Platform.OS as 'android' | 'ios'];
    computedFontSize = RFValue(fontSize || defaultSize);
  }

  return (
    <Text
      onLayout={onLayout}
      style={[
        styles.text,
        {
          color: color || Colors.text,
          fontSize: computedFontSize,
          fontFamily,
        },
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
