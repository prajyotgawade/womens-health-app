import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, TextStyle } from 'react-native';

import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface BadgeProps {
  children?: React.ReactNode;
  count?: number;
  maxCount?: number;
  visible?: boolean;
  variant?: 'dot' | 'number';
  color?: 'error' | 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
  badgeStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  children,
  count = 0,
  maxCount = 99,
  visible = true,
  variant = 'number',
  color = 'error',
  style,
  badgeStyle,
  textStyle,
}: BadgeProps) {
  const theme = useTheme();

  if (!visible) {
    return <>{children}</>;
  }

  // Get background and text colors
  const getColors = () => {
    switch (color) {
      case 'primary':
        return { background: theme.primary, text: theme.onPrimary };
      case 'secondary':
        return { background: theme.secondary, text: theme.onSecondary };
      case 'error':
      default:
        return { background: theme.error, text: theme.onError };
    }
  };

  const colors = getColors();

  // Format count text
  const displayCount = count > maxCount ? `${maxCount}+` : `${count}`;

  const renderBadge = () => {
    if (variant === 'dot') {
      return (
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.background },
            children ? styles.overlayDot : null,
            badgeStyle,
          ]}
        />
      );
    }

    if (count <= 0 && variant === 'number') {
      return null;
    }

    return (
      <View
        style={[
          styles.badge,
          { backgroundColor: colors.background },
          children ? styles.overlayBadge : null,
          badgeStyle,
        ]}
      >
        <ThemedText
          type="labelSmall"
          style={[
            styles.text,
            { color: colors.text, fontSize: 10, lineHeight: 12 },
            textStyle,
          ]}
        >
          {displayCount}
        </ThemedText>
      </View>
    );
  };

  if (!children) {
    return renderBadge();
  }

  return (
    <View style={[styles.container, style]}>
      {children}
      {renderBadge()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  overlayDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    zIndex: 10,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
