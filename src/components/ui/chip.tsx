import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  onClose?: () => void;
  leadingIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({
  label,
  variant = 'assist',
  selected = false,
  onPress,
  onClose,
  leadingIcon,
  style,
  disabled = false,
}: ChipProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const isPressable = typeof onPress === 'function' && !disabled;

  const onPressIn = () => {
    if (isPressable) {
      scale.value = withSpring(0.95, { damping: 15 });
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

  const getColors = () => {
    if (selected) {
      return {
        container: {
          backgroundColor: theme.secondaryContainer,
          borderWidth: 0,
        },
        text: {
          color: theme.onSecondaryContainer,
        },
        iconColor: theme.onSecondaryContainer,
      };
    }

    return {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.outlineVariant,
      },
      text: {
        color: theme.onSurfaceVariant,
      },
      iconColor: theme.onSurfaceVariant,
    };
  };

  const colors = getColors();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={[
        styles.chip,
        colors.container,
        disabled && { opacity: 0.5 },
        animatedStyle,
        style,
      ]}
      accessibilityRole={variant === 'filter' ? 'checkbox' : 'button'}
      accessibilityState={{ selected, disabled }}
    >
      <View style={styles.content}>
        {/* Leading checkmark for selected filter chips */}
        {variant === 'filter' && selected && (
          <Feather
            name="check"
            size={14}
            color={colors.iconColor}
            style={styles.leadingIcon}
          />
        )}

        {/* Custom leading icon */}
        {leadingIcon && !(variant === 'filter' && selected) && (
          <View style={styles.leadingIcon}>{leadingIcon}</View>
        )}

        {/* Chip text */}
        <ThemedText
          type="labelLarge"
          style={[styles.label, colors.text]}
        >
          {label}
        </ThemedText>

        {/* Close icon for input chips */}
        {variant === 'input' && typeof onClose === 'function' && (
          <Pressable
            onPress={onClose}
            hitSlop={6}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label}`}
          >
            <Feather
              name="x"
              size={14}
              color={colors.iconColor}
            />
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32, // Material 3 standard chip height
    borderRadius: 8, // M3 standard rounded corner (8dp)
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    textAlign: 'center',
  },
  leadingIcon: {
    marginRight: Spacing.one,
  },
  closeButton: {
    marginLeft: Spacing.one,
    padding: Spacing.half,
  },
});
