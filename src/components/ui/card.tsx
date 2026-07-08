import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Spacing, Elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardVariant = 'filled' | 'elevated' | 'outlined';

export interface CardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  variant = 'filled',
  onPress,
  style,
  contentStyle,
  disabled = false,
}: CardProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const isPressable = typeof onPress === 'function' && !disabled;

  const onPressIn = () => {
    if (isPressable) {
      scale.value = withSpring(0.98, { damping: 15 });
    }
  };

  const onPressOut = () => {
    if (isPressable) {
      scale.value = withSpring(1, { damping: 15 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.surface,
          ...Elevation.level1,
        };
      case 'outlined':
        return {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.outlineVariant,
        };
      case 'filled':
      default:
        return {
          backgroundColor: theme.surfaceVariant,
        };
    }
  };

  const containerStyle = [
    styles.card,
    getVariantStyles(),
    style,
  ];

  if (isPressable) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[containerStyle, animatedStyle]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </AnimatedPressable>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, // Material 3 standard card rounding (12-16dp)
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.three,
  },
});
