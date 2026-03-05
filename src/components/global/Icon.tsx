import Ionicons from 'react-native-vector-icons/Ionicons'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import React, { FC } from 'react';
import { RFValue } from 'react-native-responsive-fontsize';

interface IconProps {
  color?: string;
  size: number;
  name: string;
  iconFamily: 'Ionicons' | 'MaterialIcons' | 'MaterialCommunityIcons';
}

const Icon: FC<IconProps> = ({ color, size, iconFamily, name }) => {
  return (
    <>
      {iconFamily === 'Ionicons' && (
        <Ionicons name={name} size={RFValue(size)} color={color} />
      )}
      {iconFamily === 'MaterialIcons' && (
        <MaterialIcons name={name} size={RFValue(size)} color={color} />
      )}
      {iconFamily === 'MaterialCommunityIcons' && (
        <MaterialCommunityIcons
          name={name}
          size={RFValue(size)}
          color={color}
        />
      )}
    </>
  );
};

export default Icon;
