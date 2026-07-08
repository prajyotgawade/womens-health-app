import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '../themed-text';
import { Spacing, Elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';

export interface ButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  label,
  children,
  variant = 'filled',
  disabled = false,
  loading = false,
  icon,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  // Press animations
  const onPressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { damping: 15 });
    }
  };

  const onPressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, { damping: 15 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Resolve colors and styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          container: {
            backgroundColor: disabled ? theme.surfaceVariant : theme.primary,
          },
          text: {
            color: disabled ? theme.outline : theme.onPrimary,
          },
          indicatorColor: theme.onPrimary,
        };
      case 'tonal':
        return {
          container: {
            backgroundColor: disabled ? theme.surfaceVariant : theme.secondaryContainer,
          },
          text: {
            color: disabled ? theme.outline : theme.onSecondaryContainer,
          },
          indicatorColor: theme.onSecondaryContainer,
        };
      case 'elevated':
        return {
          container: {
            backgroundColor: disabled ? theme.surfaceVariant : theme.surface,
            ...Elevation.level1,
          },
          text: {
            color: disabled ? theme.outline : theme.primary,
          },
          indicatorColor: theme.primary,
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: disabled ? theme.outlineVariant : theme.outline,
          },
          text: {
            color: disabled ? theme.outline : theme.primary,
          },
          indicatorColor: theme.primary,
        };
      case 'text':
      default:
        return {
          container: {
            backgroundColor: 'transparent',
            paddingHorizontal: Spacing.two,
          },
          text: {
            color: disabled ? theme.outline : theme.primary,
          },
          indicatorColor: theme.primary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      style={[
        styles.base,
        variantStyles.container,
        animatedStyle,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.indicatorColor}
            style={styles.loader}
          />
        ) : (
          <>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            {label ? (
              <ThemedText
                type="labelLarge"
                style={[
                  styles.label,
                  variantStyles.text,
                  labelStyle,
                ]}
              >
                {label}
              </ThemedText>
            ) : (
              children
            )}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48, // Material 3 standard min height for high accessibility hit targets
    borderRadius: 24, // Pill shape
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  iconContainer: {
    marginRight: Spacing.two,
  },
  loader: {
    margin: Spacing.half,
  },
});
