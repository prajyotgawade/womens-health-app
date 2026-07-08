import React from 'react';
import { Modal, StyleSheet, View, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '../themed-text';
import { Button } from './button';
import { Spacing, Elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  onDismiss: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dismissable?: boolean;
}

export function Dialog({
  visible,
  title,
  description,
  onDismiss,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  children,
  style,
  dismissable = true,
}: DialogProps) {
  const theme = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={dismissable ? onDismiss : undefined}
      animationType="none"
    >
      <View style={styles.overlay}>
        {/* Backdrop overlay */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onDismiss : undefined}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
          />
        </Pressable>

        {/* Dialog box */}
        <Animated.View
          entering={ZoomIn.duration(200).springify().damping(18)}
          style={[
            styles.dialog,
            { backgroundColor: theme.surface },
            style,
          ]}
          accessibilityRole="alert"
          accessibilityLabel={title}
        >
          {/* Header */}
          <ThemedText type="headlineSmall" style={styles.title}>
            {title}
          </ThemedText>

          {/* Description */}
          {description && (
            <ThemedText
              type="bodyMedium"
              style={[styles.description, { color: theme.textSecondary }]}
            >
              {description}
            </ThemedText>
          )}

          {/* Optional custom content */}
          {children && <View style={styles.customContent}>{children}</View>}

          {/* Footer Actions */}
          <View style={styles.actions}>
            {cancelLabel && (
              <Button
                variant="text"
                label={cancelLabel}
                onPress={onDismiss}
                style={styles.actionButton}
              />
            )}
            {onConfirm && (
              <Button
                variant="filled"
                label={confirmLabel}
                onPress={onConfirm}
                style={styles.actionButton}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28, // Material 3 standard dialog rounding (28dp)
    padding: Spacing.four,
    ...Elevation.level3, // M3 standard elevation for dialogs
  },
  title: {
    marginBottom: Spacing.two,
  },
  description: {
    marginBottom: Spacing.three,
  },
  customContent: {
    marginBottom: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    height: 40, // standard action button height in dialogs
    paddingHorizontal: Spacing.three,
  },
});
