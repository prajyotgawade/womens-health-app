import React from 'react';
import { StyleSheet, View, type ViewProps, Platform } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GlassIntensity = 'low' | 'medium' | 'high';

export interface GlassViewProps extends ViewProps {
  intensity?: GlassIntensity;
  children?: React.ReactNode;
  borderRadius?: number;
}

export function GlassView({
  intensity = 'medium',
  borderRadius = 16,
  style,
  children,
  ...otherProps
}: GlassViewProps) {
  const theme = useTheme();

  // Resolve background opacity and border styling based on light/dark mode and intensity
  const getGlassStyles = () => {
    const isDark = theme.background === '#181213';
    
    let opacity = 0.7;
    let blurValue = 8;
    if (intensity === 'low') {
      opacity = 0.85;
      blurValue = 4;
    } else if (intensity === 'high') {
      opacity = 0.55;
      blurValue = 16;
    }

    const baseColor = isDark ? '0, 0, 0' : '255, 255, 255';
    const borderOpacity = isDark ? 0.12 : 0.25;

    return {
      backgroundColor: `rgba(${baseColor}, ${opacity})`,
      borderColor: `rgba(${baseColor}, ${borderOpacity})`,
      borderWidth: 1,
      // Backdrop filter for Web platform
      ...Platform.select({
        web: {
          backdropFilter: `blur(${blurValue}px)`,
          WebkitBackdropFilter: `blur(${blurValue}px)`,
        },
      }),
    };
  };

  return (
    <View
      style={[
        styles.glass,
        { borderRadius },
        getGlassStyles(),
        style,
      ]}
      {...otherProps}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    padding: Spacing.three,
    overflow: 'hidden',
  },
});
