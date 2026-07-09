import React, { useEffect } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolateColor } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import * as Haptics from 'expo-haptics';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const TOGGLE_WIDTH = 50;
const TOGGLE_HEIGHT = 28;
const THUMB_SIZE = 24;

export function Toggle({ value, onValueChange, disabled = false, style }: ToggleProps) {
  const theme = useTheme();
  
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 15,
      stiffness: 250,
      mass: 0.5,
    });
  }, [value]);

  const toggleStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [theme.surfaceVariant, theme.primary]
    );
    return { backgroundColor };
  });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: progress.value * (TOGGLE_WIDTH - THUMB_SIZE - 4) }
      ]
    };
  });

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={[styles.container, style]}>
      <Animated.View style={[styles.track, toggleStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_HEIGHT / 2,
    padding: 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
