import {StyleSheet, Text, View, useWindowDimensions, TouchableOpacity, ActivityIndicator} from 'react-native';
import React from 'react';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {OnboardingData} from './data';
import LottieView from 'lottie-react-native';

type Props = {
  index: number;
  x: SharedValue<number>;
  item: OnboardingData;
  isLast: boolean;
  onRequestPermissions: () => void;
  loading: boolean;
};

const RenderItem = ({index, x, item, isLast, onRequestPermissions, loading}: Props) => {
  const {width: SCREEN_WIDTH} = useWindowDimensions();
  const lottieSize = SCREEN_WIDTH * (item.lottieScale ?? 0.88);

  const lottieAnimationStyle = useAnimatedStyle(() => {
    const translateYAnimation = interpolate(
      x.value,
      [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ],
      [200, 0, -200],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{translateY: translateYAnimation}],
    };
  });

  const circleAnimation = useAnimatedStyle(() => {
    const scale = interpolate(
      x.value,
      [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
      ],
      [1, 4, 4],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{scale: scale}],
    };
  });

  return (
    <View style={[styles.itemContainer, {width: SCREEN_WIDTH}]}>
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            {
              width: SCREEN_WIDTH,
              height: SCREEN_WIDTH,
              borderRadius: SCREEN_WIDTH / 2,
              backgroundColor: item.backgroundColor,
            },
            circleAnimation,
          ]}
        />
      </View>
      <Animated.View style={lottieAnimationStyle}>
        <LottieView
          source={item.animation}
          style={{
            width: lottieSize,
            height: lottieSize,
          }}
          autoPlay
          loop
        />
      </Animated.View>
      <View style={styles.textBlock}>
        <Text style={[styles.title, {color: item.textColor}]}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, {color: item.textColor}]}>
          {item.subtitle}
        </Text>
        {isLast && (
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: item.accentColor }]}
            onPress={onRequestPermissions}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.permissionText}>Permitir y continuar</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default RenderItem;

const styles = StyleSheet.create({
  itemContainer: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  textBlock: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  permissionButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  permissionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  circleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
