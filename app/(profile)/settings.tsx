import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';

const explore = () => {
  const ButtonHandler = async() => {
    await AsyncStorage.removeItem('habitSelected');
  }
  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={ButtonHandler}><Text>Remove</Text></TouchableOpacity>
    </View>
  )
}

export default explore

const styles = StyleSheet.create({
    button: {
        marginTop: 10,
        padding: 10,
        backgroundColor: 'red',
    }
})