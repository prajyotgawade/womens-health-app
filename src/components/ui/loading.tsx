import React, { useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export interface CircularProgressProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export interface LinearProgressProps {
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function CircularProgress({
  size = 'medium',
  color,
  style,
}: CircularProgressProps) {
  const theme = useTheme();
  const rotation = useSharedValue(0);

  const loaderColor = color || theme.primary;

  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 48;
      case 'medium':
      default:
        return 32;
    }
  };

  const currentSize = getSize();
  const strokeWidth = size === 'small' ? 2 : size === 'large' ? 4 : 3;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.circularContainer,
        { width: currentSize, height: currentSize },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: currentSize,
            height: currentSize,
            borderRadius: currentSize / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: loaderColor,
            borderLeftColor: loaderColor,
          },
        ]}
      />
    </View>
  );
}

export function LinearProgress({ color, style }: LinearProgressProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  const loaderColor = color || theme.primary;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      -1,
      false
    );
  }, [progress]);

  const barAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [-100, 200]);
    return {
      transform: [{ translateX: `${translateX}%` }],
    };
  });

  return (
    <View
      style={[
        styles.linearTrack,
        { backgroundColor: theme.surfaceVariant },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Animated.View
        style={[
          styles.linearBar,
          { backgroundColor: loaderColor },
          barAnimatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circularContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  linearTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: Spacing.two,
  },
  linearBar: {
    height: '100%',
    width: '50%',
    borderRadius: 2,
  },
});
