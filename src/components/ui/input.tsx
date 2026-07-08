import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Spacing, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  variant?: 'outlined' | 'filled';
  placeholder?: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  allowClear?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
}

export function Input({
  label,
  value,
  onChangeText,
  variant = 'outlined',
  placeholder,
  secureTextEntry,
  disabled = false,
  error,
  helperText,
  leadingIcon,
  trailingIcon,
  allowClear = false,
  style,
  inputStyle,
  keyboardType = 'default',
  autoCapitalize = 'none',
  accessibilityLabel,
  accessibilityHint,
  onFocus,
  onBlur,
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(!secureTextEntry);
  const focusAnim = useSharedValue(value ? 1 : 0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Animate label if value is present or input is focused
    const shouldFloat = focused || !!value;
    focusAnim.value = withTiming(shouldFloat ? 1 : 0, { duration: 180 });
  }, [focused, value, focusAnim]);

  const handleFocus = (e: any) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  // Label animation styles
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const isOutlined = variant === 'outlined';
    
    // Label translations
    const translateY = interpolate(
      focusAnim.value,
      [0, 1],
      [isOutlined ? 14 : 16, isOutlined ? -8 : 4]
    );
    const translateX = interpolate(
      focusAnim.value,
      [0, 1],
      [leadingIcon ? 36 : 12, 12]
    );
    const scale = interpolate(focusAnim.value, [0, 1], [1, 0.75]);

    // Label color
    const defaultColor = theme.textSecondary;
    const focusColor = error ? theme.error : theme.primary;
    const color = interpolateColor(
      focusAnim.value,
      [0, 1],
      [defaultColor, focusColor]
    );

    return {
      transform: [{ translateY }, { translateX }, { scale }],
      color,
    };
  });

  // Border indicator for filled variant
  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const width = interpolate(focusAnim.value, [0, 1], [0, 100]);
    return {
      width: `${width}%`,
      backgroundColor: error ? theme.error : theme.primary,
    };
  });

  const hasTrailingIcon = secureTextEntry || allowClear || trailingIcon;

  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={() => {
          if (!disabled) inputRef.current?.focus();
        }}
        style={[
          styles.inputWrapper,
          variant === 'filled' ? styles.filledWrapper : styles.outlinedWrapper,
          variant === 'filled' && { backgroundColor: theme.surfaceVariant },
          variant === 'outlined' && {
            borderColor: error
              ? theme.error
              : focused
              ? theme.primary
              : theme.outlineVariant,
            borderWidth: focused ? 2 : 1,
          },
          disabled && { opacity: 0.5 },
        ]}
      >
        {/* Leading Icon */}
        {leadingIcon && <View style={styles.leadingIcon}>{leadingIcon}</View>}

        {/* Animated Floating Label */}
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.label,
            { fontFamily: Fonts.sans },
            variant === 'outlined' && {
              backgroundColor: theme.background,
              paddingHorizontal: Spacing.half,
            },
            labelAnimatedStyle,
          ]}
        >
          {label}
        </Animated.Text>

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={focused ? placeholder : ''}
          placeholderTextColor={theme.outline}
          secureTextEntry={secureTextEntry && !secureVisible}
          editable={!disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[
            styles.input,
            {
              color: theme.text,
              fontFamily: Fonts.sans,
              paddingLeft: leadingIcon ? Spacing.five + Spacing.two : Spacing.three,
              paddingRight: hasTrailingIcon ? Spacing.five + Spacing.two : Spacing.three,
              paddingTop: variant === 'filled' ? Spacing.four : Spacing.two,
            },
            inputStyle,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityRole="text"
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
        />

        {/* Trailing Icons */}
        <View style={styles.trailingIconContainer}>
          {allowClear && !!value && !disabled && (
            <Pressable
              onPress={() => onChangeText('')}
              hitSlop={8}
              style={styles.actionIcon}
            >
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          )}

          {secureTextEntry && (
            <Pressable
              onPress={() => setSecureVisible(!secureVisible)}
              hitSlop={8}
              style={styles.actionIcon}
            >
              <Feather
                name={secureVisible ? 'eye-off' : 'eye'}
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
          )}

          {trailingIcon && <View style={styles.trailingIcon}>{trailingIcon}</View>}
        </View>

        {/* Filled bottom indicator */}
        {variant === 'filled' && (
          <View style={[styles.bottomLine, { backgroundColor: theme.outlineVariant }]}>
            <Animated.View style={[styles.activeBottomLine, indicatorAnimatedStyle]} />
          </View>
        )}
      </Pressable>

      {/* Helper or Error Text */}
      {(error || helperText) && (
        <ThemedText
          type="labelSmall"
          style={[
            styles.helperText,
            { color: error ? theme.error : theme.textSecondary },
          ]}
        >
          {error || helperText}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.one,
    alignSelf: 'stretch',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // Material 3 standard text field height
    position: 'relative',
  },
  outlinedWrapper: {
    borderRadius: 8,
  },
  filledWrapper: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingBottom: Spacing.one,
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: 16,
    zIndex: 1,
  },
  leadingIcon: {
    position: 'absolute',
    left: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  trailingIconContainer: {
    position: 'absolute',
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  actionIcon: {
    padding: Spacing.half,
    marginLeft: Spacing.one,
  },
  trailingIcon: {
    marginLeft: Spacing.one,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    alignItems: 'center',
  },
  activeBottomLine: {
    height: 2,
  },
  helperText: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
