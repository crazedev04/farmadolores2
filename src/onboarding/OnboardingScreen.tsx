import {StyleSheet, View, FlatList, ViewToken, TouchableOpacity, Text, Alert} from 'react-native';
import React, { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
} from 'react-native-reanimated';
import data, {OnboardingData} from './data';
import Pagination from './Pagination';
import CustomButton from './CustomButton';
import RenderItem from './RenderItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermissions } from '../components/Permissions';
import { initPushNotifications } from '../services/pushService';
type OnboardingScreenProps = {
    setIsFirstLaunch: React.Dispatch<React.SetStateAction<boolean | null>>;
  };
  const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ setIsFirstLaunch }) =>{
  const flatListRef = useAnimatedRef<FlatList<OnboardingData>>();
  const x = useSharedValue(0);
  const flatListIndex = useSharedValue(0);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const onViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
  }) => {
    if (viewableItems[0].index !== null) {
      flatListIndex.value = viewableItems[0].index;
    }
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: event => {
      x.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    AsyncStorage.getItem('permissionsGranted')
      .then((value) => {
        if (value === 'true') {
          setPermissionsGranted(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSkip = async () => {
    await AsyncStorage.setItem('permissionsDeferred', 'true');
    setIsFirstLaunch(false);
    await AsyncStorage.setItem('hasOpenedBefore', 'true');
  };

  const handlePermissions = async () => {
    if (permissionsLoading) return;
    setPermissionsLoading(true);
    const granted = await requestPermissions();
    if (granted) {
      setPermissionsGranted(true);
      setIsFirstLaunch(false);
      await AsyncStorage.setItem('permissionsDeferred', 'false');
      await AsyncStorage.setItem('hasOpenedBefore', 'true');
      initPushNotifications(null, true);
    } else {
      Alert.alert('Permisos requeridos', 'Necesitamos permisos para mostrarte turnos y avisos.');
    }
    setPermissionsLoading(false);
  };

  const handleFinish = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permisos requeridos', 'Necesitamos permisos para continuar.');
      return;
    }
    setIsFirstLaunch(false);
    await AsyncStorage.setItem('permissionsDeferred', 'false');
    await AsyncStorage.setItem('hasOpenedBefore', 'true');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      </View>
      <Animated.FlatList
        ref={flatListRef}
        onScroll={onScroll}
        data={data}
        renderItem={({item, index}) => {
          return (
            <RenderItem
              item={item}
              index={index}
              x={x}
              isLast={index === data.length - 1}
              onRequestPermissions={handlePermissions}
              loading={permissionsLoading}
            />
          );
        }}
        keyExtractor={item => item.id.toString()}
        scrollEventThrottle={16}
        horizontal={true}
        bounces={false}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          minimumViewTime: 300,
          viewAreaCoveragePercentThreshold: 10,
        }}
      />
      <View style={styles.bottomContainer}>
        <Pagination data={data} x={x} />
        <CustomButton
          flatListRef={flatListRef}
          flatListIndex={flatListIndex}
          dataLength={data.length}
          setIsFirstLaunch={setIsFirstLaunch}
          x={x}
          data={data}
          canFinish={permissionsGranted}
          onFinish={handleFinish}
        />
      </View>
    </View>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 30,
    paddingVertical: 30,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
});
