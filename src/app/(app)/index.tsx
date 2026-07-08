import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays } from 'date-fns';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { GlassView } from '@/components/ui/glass-view';

const { width } = Dimensions.get('window');

// --- Mock Data ---
const TODAY = new Date();
const CYCLE_DAY = 14;
const NEXT_PERIOD_DAYS = 12;
const FERTILITY_WINDOW = 'High';
const OVULATION_DAY = 'Tomorrow';

// Generate 7 days for the calendar preview (3 days before, today, 3 days after)
const CALENDAR_DAYS = Array.from({ length: 7 }).map((_, i) => addDays(subDays(TODAY, 3), i));

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Spacing.six + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textTransform: 'uppercase' }}>
                {format(TODAY, 'EEEE, MMM d')}
              </ThemedText>
              <ThemedText type="displaySmall" style={{ color: theme.primary, marginTop: 2 }}>
                Good Morning, Sarah
              </ThemedText>
            </View>
            
            <Pressable style={[styles.aiShortcut, { backgroundColor: theme.primaryContainer }]}>
              <Ionicons name="sparkles" size={20} color={theme.primary} />
            </Pressable>
          </Animated.View>

          {/* Calendar Preview */}
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.calendarStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
              {CALENDAR_DAYS.map((date, index) => {
                const isToday = index === 3;
                return (
                  <View key={date.toISOString()} style={[styles.calendarDay, isToday && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                    <ThemedText type="labelSmall" style={{ color: isToday ? theme.onPrimary : theme.textSecondary, marginBottom: 4 }}>
                      {format(date, 'EE').charAt(0)}
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ color: isToday ? theme.onPrimary : theme.text }}>
                      {format(date, 'd')}
                    </ThemedText>
                    {isToday && <View style={styles.calendarDot} />}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Hero Widget: Cycle Status */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.heroContainer}>
            <GlassView intensity="high" borderRadius={32} style={styles.heroCard}>
              <View style={styles.heroInner}>
                <View style={styles.heroLeft}>
                  <ThemedText type="displayLarge" style={{ color: theme.primary, fontWeight: '700', fontSize: 64, lineHeight: 68 }}>
                    {NEXT_PERIOD_DAYS}
                  </ThemedText>
                  <ThemedText type="titleMedium" style={{ color: theme.textSecondary }}>
                    Days until period
                  </ThemedText>
                </View>
                
                <View style={styles.heroRight}>
                  <View style={[styles.cycleBadge, { backgroundColor: theme.primaryContainer }]}>
                    <ThemedText type="labelMedium" style={{ color: theme.primary }}>
                      Day {CYCLE_DAY}
                    </ThemedText>
                  </View>
                  <View style={[styles.cycleBadge, { backgroundColor: theme.secondaryContainer, marginTop: Spacing.two }]}>
                    <ThemedText type="labelMedium" style={{ color: theme.secondary }}>
                      Follicular
                    </ThemedText>
                  </View>
                </View>
              </View>
            </GlassView>
          </Animated.View>

          {/* Vitals Row */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.vitalsRow}>
            <Card variant="filled" style={[styles.vitalCard, { flex: 1 }]}>
              <View style={[styles.vitalIconWrap, { backgroundColor: theme.errorContainer }]}>
                <Ionicons name="flower" size={20} color={theme.error} />
              </View>
              <ThemedText type="titleMedium" style={{ color: theme.text, marginTop: Spacing.two }}>
                {FERTILITY_WINDOW}
              </ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>
                Fertility
              </ThemedText>
            </Card>

            <Card variant="filled" style={[styles.vitalCard, { flex: 1 }]}>
              <View style={[styles.vitalIconWrap, { backgroundColor: theme.tertiaryContainer }]}>
                <Ionicons name="radio-button-on" size={20} color={theme.tertiary} />
              </View>
              <ThemedText type="titleMedium" style={{ color: theme.text, marginTop: Spacing.two }}>
                {OVULATION_DAY}
              </ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>
                Ovulation
              </ThemedText>
            </Card>
          </Animated.View>

          {/* Quick Logs */}
          <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.quickLogSection}>
            <ThemedText type="titleMedium" style={{ color: theme.text, marginBottom: Spacing.three, paddingHorizontal: Spacing.four }}>
              Quick Log
            </ThemedText>
            
            <View style={styles.logGrid}>
              <Pressable style={[styles.logItem, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="water" size={28} color="#4FC3F7" />
                <ThemedText type="labelSmall" style={{ marginTop: 8, color: theme.textSecondary }}>Water</ThemedText>
              </Pressable>
              
              <Pressable style={[styles.logItem, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="happy" size={28} color="#FFD54F" />
                <ThemedText type="labelSmall" style={{ marginTop: 8, color: theme.textSecondary }}>Mood</ThemedText>
              </Pressable>
              
              <Pressable style={[styles.logItem, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="medkit" size={28} color="#E57373" />
                <ThemedText type="labelSmall" style={{ marginTop: 8, color: theme.textSecondary }}>Symptoms</ThemedText>
              </Pressable>

              <Pressable style={[styles.logItem, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="moon" size={28} color="#9575CD" />
                <ThemedText type="labelSmall" style={{ marginTop: 8, color: theme.textSecondary }}>Sleep</ThemedText>
              </Pressable>
            </View>
          </Animated.View>

          {/* Daily Tip */}
          <Animated.View entering={FadeInDown.duration(600).delay(500).springify()} style={styles.tipContainer}>
            <Card variant="elevated" style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={24} color={theme.primary} style={{ marginRight: Spacing.three }} />
              <View style={{ flex: 1 }}>
                <ThemedText type="titleSmall" style={{ color: theme.text }}>Daily Tip</ThemedText>
                <ThemedText type="bodySmall" style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Estrogen is rising! It's a great day for high-intensity workouts and brainstorming.
                </ThemedText>
              </View>
            </Card>
          </Animated.View>

        </SafeAreaView>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View 
        entering={FadeIn.duration(800).delay(800)} 
        style={[styles.fabContainer, { bottom: Spacing.six }]}
      >
        <Pressable style={[styles.fab, { backgroundColor: theme.primary }]}>
          <Ionicons name="add" size={32} color={theme.onPrimary} />
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    marginBottom: Spacing.five,
  },
  aiShortcut: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarStrip: {
    marginBottom: Spacing.six,
  },
  calendarScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  calendarDay: {
    width: 48,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 2,
  },
  heroContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.six,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.six,
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  cycleBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
  vitalsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    marginBottom: Spacing.six,
  },
  vitalCard: {
    padding: Spacing.four,
  },
  vitalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLogSection: {
    marginBottom: Spacing.six,
  },
  logGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  logItem: {
    width: (width - (Spacing.four * 2) - (Spacing.three * 3)) / 4,
    aspectRatio: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.four,
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
