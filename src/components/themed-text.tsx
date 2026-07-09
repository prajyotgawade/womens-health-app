import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Typography, TypographyStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: TypographyStyle | 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

const getFontFamily = (weight?: string | number) => {
  switch (String(weight)) {
    case '700':
    case 'bold':
      return 'PlusJakartaSans_700Bold';
    case '600':
      return 'PlusJakartaSans_600SemiBold';
    case '500':
      return 'PlusJakartaSans_500Medium';
    case '400':
    case 'normal':
    default:
      return 'PlusJakartaSans_400Regular';
  }
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  // Determine baseline style based on type
  const isM3Type = type in Typography;
  const m3Style = isM3Type ? Typography[type as TypographyStyle] : null;
  const resolvedWeight = m3Style?.fontWeight || (StyleSheet.flatten(style) as any)?.fontWeight;

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] as string, fontFamily: getFontFamily(resolvedWeight) },
        m3Style,
        !isM3Type && type === 'default' && styles.default,
        !isM3Type && type === 'title' && styles.title,
        !isM3Type && type === 'small' && styles.small,
        !isM3Type && type === 'smallBold' && styles.smallBold,
        !isM3Type && type === 'subtitle' && styles.subtitle,
        !isM3Type && type === 'link' && styles.link,
        !isM3Type && type === 'linkPrimary' && [styles.linkPrimary, { color: theme.primary }],
        !isM3Type && type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    ...Typography.bodyMedium,
  },
  smallBold: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  default: {
    ...Typography.bodyLarge,
  },
  title: {
    ...Typography.displayLarge,
  },
  subtitle: {
    ...Typography.headlineMedium,
  },
  link: {
    ...Typography.bodyMedium,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    ...Typography.bodyMedium,
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
