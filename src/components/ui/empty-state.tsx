import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Button } from './button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  title: string;
  description: string;
  iconName?: keyof typeof Feather.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  description,
  iconName = 'inbox',
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Icon Wrapper */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.surfaceVariant },
        ]}
      >
        <Feather name={iconName} size={36} color={theme.primary} />
      </View>

      {/* Header text */}
      <ThemedText type="headlineSmall" style={styles.title}>
        {title}
      </ThemedText>

      {/* Subtext description */}
      <ThemedText
        type="bodyMedium"
        style={[styles.description, { color: theme.textSecondary }]}
      >
        {description}
      </ThemedText>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          variant="filled"
          label={actionLabel}
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  description: {
    textAlign: 'center',
    marginBottom: Spacing.five,
  },
  button: {
    minWidth: 150,
  },
});
