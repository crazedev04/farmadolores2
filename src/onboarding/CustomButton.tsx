import React from 'react';
import { FlatList, StyleSheet, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import Animated, {
  AnimatedRef,
  SharedValue,
  interpolateColor,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { OnboardingData } from './data';

type Props = {
  dataLength: number;
  flatListIndex: SharedValue<number>;
  flatListRef: AnimatedRef<FlatList<OnboardingData>>;
  x: SharedValue<number>;
  setIsFirstLaunch: React.Dispatch<React.SetStateAction<boolean | null>>;
  data: OnboardingData[];
  canFinish: boolean;
  onFinish: () => void;
};

const CustomButton = ({ flatListRef, flatListIndex, dataLength, x, setIsFirstLaunch, data, canFinish, onFinish }: Props) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const handleContinue = async () => {
    if (flatListIndex.value < dataLength - 1) {
      flatListRef.current?.scrollToIndex({ index: flatListIndex.value + 1 });
    } else {
      if (canFinish) {
        onFinish();
      }
    }
  };

  const buttonAnimationStyle = useAnimatedStyle(() => {
    return {
      width: flatListIndex.value === dataLength - 1 ? withSpring(140) : withSpring(60),
      height: 60,
    };
  });

  const arrowAnimationStyle = useAnimatedStyle(() => {
    return {
      width: 30,
      height: 30,
      opacity: flatListIndex.value === dataLength - 1 ? withTiming(0) : withTiming(1),
      transform: [{ translateX: flatListIndex.value === dataLength - 1 ? withTiming(100) : withTiming(0) }],
    };
  });

  const textAnimationStyle = useAnimatedStyle(() => {
    return {
      opacity: flatListIndex.value === dataLength - 1 ? withTiming(1) : withTiming(0),
      transform: [{ translateX: flatListIndex.value === dataLength - 1 ? withTiming(0) : withTiming(-100) }],
    };
  });

  const animatedColor = useAnimatedStyle(
    () => {
      const inputRange = data.map((_, idx) => idx * SCREEN_WIDTH);
      const outputRange = data.map((item) => item.accentColor);
      const backgroundColor = interpolateColor(x.value, inputRange, outputRange);
      const isLast = flatListIndex.value === dataLength - 1;
      return {
        backgroundColor: isLast && !canFinish ? '#64748B' : backgroundColor,
      };
    },
    [canFinish, dataLength]
  );

  return (
    <TouchableWithoutFeedback onPress={handleContinue}>
      <Animated.View
        style={[
          styles.container,
          buttonAnimationStyle,
          animatedColor,
          flatListIndex.value === dataLength - 1 && !canFinish ? styles.disabled : null,
        ]}
      >
        <Animated.Text style={[styles.textButton, textAnimationStyle]}>
          Comencemos
        </Animated.Text>
        <Animated.Image source={require('../assets/images/ArrowIcon.png')} style={[styles.arrow, arrowAnimationStyle]} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e2169',
    padding: 10,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  arrow: {
    position: 'absolute',
  },
  textButton: { color: 'white', fontSize: 16, position: 'absolute' },
  disabled: {
    opacity: 0.55,
  },
});
