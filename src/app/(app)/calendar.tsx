import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { GlassView } from '@/components/ui/glass-view';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

export default function CalendarScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="displaySmall" style={{ color: theme.primary, marginBottom: Spacing.four }}>
          Calendar
        </ThemedText>
        
        <GlassView intensity="low" borderRadius={24} style={styles.card}>
          <Ionicons name="calendar-outline" size={48} color={theme.primary} style={{ marginBottom: Spacing.two }} />
          <ThemedText type="titleLarge" style={{ textAlign: 'center', marginBottom: Spacing.one }}>
            Cycle Tracking
          </ThemedText>
          <ThemedText type="bodyMedium" style={{ textAlign: 'center', color: theme.textSecondary }}>
            Your monthly cycle predictions and historical logs will appear here.
          </ThemedText>
        </GlassView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  card: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
