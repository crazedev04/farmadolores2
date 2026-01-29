import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, PermissionsAndroid, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Carousel from 'react-native-reanimated-carousel';
import { useNavigation } from '@react-navigation/native';

type Slide = {
  title: string;
  text: string;
};

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    { title: 'Welcome', text: 'Welcome to our app!' },
    { title: 'Features', text: 'Discover amazing features.' },
    { title: 'Get Started', text: 'Let\'s get started!' },
    { title: 'Permissions', text: 'We need some permissions to proceed.' }
  ];

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ]);
        return Object.values(granted).every(result => result === PermissionsAndroid.RESULTS.GRANTED);
      }
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const handleContinue = async () => {
    if (currentSlide === slides.length - 1) {
      const permissionsGranted = await requestPermissions();
      if (!permissionsGranted) {
        Alert.alert("Permissions not granted", "You need to grant all permissions to proceed.");
        return;
      }
      await AsyncStorage.setItem('hasOpenedBefore', 'true');
      navigation.navigate('Login');
    } else {
        setCurrentSlide(currentSlide + 1);
    }
  };

  const renderItem = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Carousel
        data={slides}
        renderItem={renderItem}
        width={300}
        height={400}
        onSnapToItem={(index) => setCurrentSlide(index)}
        pagingEnabled
      />
      <Button title="Continue" onPress={handleContinue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    backgroundColor: 'lightblue',
    borderRadius: 5,
    height: 250,
    padding: 50,
    marginLeft: 25,
    marginRight: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});

export default WelcomeScreen;
