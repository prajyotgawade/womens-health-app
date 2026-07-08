import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Profile */}
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="person" size={40} color={theme.textSecondary} />
            </View>
            <ThemedText type="titleLarge" style={{ color: theme.text, marginTop: Spacing.four }}>Sarah Jenkins</ThemedText>
            <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>Premium Member</ThemedText>
          </Animated.View>

          {/* Lifetime Stats */}
          <Animated.View entering={FadeInDown.duration(400).delay(100).springify()} style={styles.section}>
            <Card variant="elevated" style={styles.statsCard}>
              <View style={styles.statItem}>
                <ThemedText type="displaySmall" style={{ color: theme.primary }}>24</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Cycles Logged</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundElement }]} />
              <View style={styles.statItem}>
                <ThemedText type="displaySmall" style={{ color: theme.primary }}>142</ThemedText>
                <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>Daily Logs</ThemedText>
              </View>
            </Card>
          </Animated.View>

          {/* Analytics Entry Point */}
          <Animated.View entering={FadeInDown.duration(400).delay(200).springify()} style={styles.section}>
            <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Health Reports & Analytics</ThemedText>
            <Card variant="filled" style={[styles.reportCard, { backgroundColor: theme.primaryContainer }]}>
              <Ionicons name="analytics" size={48} color={theme.primary} style={{ marginBottom: Spacing.three }} />
              <ThemedText type="titleMedium" style={{ color: theme.primary }}>Clinical Report</ThemedText>
              <ThemedText type="bodySmall" style={{ color: theme.primary, opacity: 0.8, marginTop: Spacing.one, marginBottom: Spacing.four }}>
                View your cycle trends, health score, and export a PDF for your doctor.
              </ThemedText>
              <Button label="View Analytics" variant="filled" onPress={() => router.push('/reports' as any)} />
            </Card>
          </Animated.View>

          {/* Settings Mock */}
          <Animated.View entering={FadeInDown.duration(400).delay(300).springify()} style={styles.section}>
             <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.four }}>Settings</ThemedText>
             <View style={[styles.settingRow, { borderBottomColor: theme.backgroundElement }]}>
               <ThemedText type="bodyMedium" style={{ color: theme.text }}>Account</ThemedText>
               <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
             </View>
             <View style={[styles.settingRow, { borderBottomColor: theme.backgroundElement }]}>
               <ThemedText type="bodyMedium" style={{ color: theme.text }}>Notifications</ThemedText>
               <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
             </View>
             <View style={[styles.settingRow, { borderBottomColor: theme.backgroundElement, borderBottomWidth: 0 }]}>
               <ThemedText type="bodyMedium" style={{ color: theme.error }}>Log Out</ThemedText>
             </View>
          </Animated.View>

        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
    paddingTop: Spacing.four,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: Spacing.six,
  },
  statsCard: {
    flexDirection: 'row',
    padding: Spacing.four,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  reportCard: {
    padding: Spacing.six,
    alignItems: 'center',
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
  }
});
