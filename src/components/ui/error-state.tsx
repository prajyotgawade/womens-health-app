import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { Button } from './button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ErrorStateProps {
  title?: string;
  message: string;
  iconName?: keyof typeof Feather.glyphMap;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  iconName = 'alert-triangle',
  onRetry,
  retryLabel = 'Try Again',
  style,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Error Card Panel */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.errorContainer,
            borderColor: theme.error,
          },
        ]}
      >
        <Feather name={iconName} size={28} color={theme.error} style={styles.icon} />
        
        <ThemedText
          type="titleMedium"
          style={[styles.title, { color: theme.onErrorContainer }]}
        >
          {title}
        </ThemedText>

        <ThemedText
          type="bodyMedium"
          style={[styles.message, { color: theme.onErrorContainer }]}
        >
          {message}
        </ThemedText>
      </View>

      {/* Retry Action */}
      {onRetry && (
        <Button
          variant="tonal"
          label={retryLabel}
          onPress={onRetry}
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
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    alignSelf: 'stretch',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  icon: {
    marginBottom: Spacing.two,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  message: {
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    minWidth: 140,
  },
});
