import { View, Text, StyleSheet } from 'react-native'
import React from 'react'
import CustomeText from '../global/CustomeText'

const BreakerText  = ({text}) => {
  return (
   <View style={styles.breakerContainer}>
  <View style={styles.horizontalLine} />

  <CustomeText
    fontSize={12}
    fontFamily="Okra-Medium"
    style={styles.breakerText}
  >
    {text}
  </CustomeText>

  <View style={styles.horizontalLine} />
</View>
  )
}

export default BreakerText
const styles = StyleSheet.create({
  breakerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '80%',
  },

  horizontalLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },

  breakerText: {
    marginHorizontal: 10,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
});