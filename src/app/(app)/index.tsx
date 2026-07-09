import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Dimensions, StatusBar, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, addDays, subDays, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { GlassView } from '@/components/ui/glass-view';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { generatePredictions } from '@/utils/prediction';

const { width } = Dimensions.get('window');

// Generate 7 days for the calendar preview (3 days before, today, 3 days after)
const TODAY = new Date();
const CALENDAR_DAYS = Array.from({ length: 7 }).map((_, i) => addDays(subDays(TODAY, 3), i));

const QUOTES = [
  "Honor your body's natural wisdom and pace.",
  "Your energy changes in waves. Ride each phase with grace.",
  "Self-care is listening to what your body needs today.",
  "You are strong, resilient, and uniquely balanced.",
  "Rest is productive. Nourish your mind and body."
];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [userName, setUserName] = useState('Sarah');
  const [avatarEmoji, setAvatarEmoji] = useState('🌸');
  
  // Predictions state
  const [cycleDay, setCycleDay] = useState(1);
  const [daysUntilPeriod, setDaysUntilPeriod] = useState(12);
  const [currentPhase, setCurrentPhase] = useState('Follicular');
  const [fertilityStatus, setFertilityStatus] = useState('Medium');
  const [ovulationText, setOvulationText] = useState('in 6 days');

  // Logs state
  const [waterLogged, setWaterLogged] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [takenMedsCount, setTakenMedsCount] = useState(0);
  const [totalMedsCount, setTotalMedsCount] = useState(0);
  const [quote, setQuote] = useState(QUOTES[0]);

  // Ring Animation
  const ringScale = useSharedValue(0.9);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  useEffect(() => {
    ringScale.value = withTiming(1, { duration: 1000 });
    // Pick a random quote
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch Profile Name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      const nickname = user.user_metadata?.nickname || profile?.full_name?.split(' ')[0] || 'User';
      setUserName(nickname);
      setAvatarEmoji(user.user_metadata?.avatar_emoji || '🌸');
      setWaterGoal(user.user_metadata?.water_goal || 8);

      // 2. Fetch Cycle data & calculate predictions
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (cycles && cycles.length > 0) {
        const cycleInputs = cycles.map(c => ({
          startDate: c.start_date,
          endDate: c.end_date,
        }));
        
        const preds = generatePredictions(cycleInputs);
        if (preds) {
          const latestCycleStart = parseISO(cycles[0].start_date);
          const currentDay = differenceInDays(new Date(), latestCycleStart) + 1;
          setCycleDay(currentDay >= 1 ? currentDay : 1);

          const daysLeft = differenceInDays(preds.nextPeriodStart, new Date());
          setDaysUntilPeriod(daysLeft >= 0 ? daysLeft : 0);

          // Determine current phase dynamically
          const today = new Date();
          if (today >= preds.fertilityWindowStart && today <= preds.fertilityWindowEnd) {
            setFertilityStatus('High');
          } else {
            setFertilityStatus('Medium');
          }

          const diffOvu = differenceInDays(preds.ovulationDate, today);
          if (diffOvu === 0) {
            setOvulationText('Today');
          } else if (diffOvu === 1) {
            setOvulationText('Tomorrow');
          } else if (diffOvu > 1) {
            setOvulationText(`in ${diffOvu} days`);
          } else {
            setOvulationText('Passed');
          }

          // Simple phase logic
          if (currentDay <= (user.user_metadata?.period_length || 5)) {
            setCurrentPhase('Menstruation');
          } else if (today < preds.ovulationDate) {
            setCurrentPhase('Follicular');
          } else if (today >= preds.ovulationDate && today <= addDays(preds.ovulationDate, 1)) {
            setCurrentPhase('Ovulatory');
          } else {
            setCurrentPhase('Luteal');
          }
        }
      }

      // 3. Fetch today's water logs
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data: waterLogs } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', user.id)
        .eq('date', todayStr);

      if (waterLogs) {
        const totalMl = waterLogs.reduce((acc, log) => acc + log.amount_ml, 0);
        setWaterLogged(Math.round(totalMl / 250)); // Convert ML back to glasses
      }

      // 4. Fetch medications
      const { data: meds } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (meds) {
        setTotalMedsCount(meds.length);
        // Load taken status from local state or simulate
        const mockTaken = meds.filter((_, idx) => idx % 2 === 0).length; // Mock taken logic
        setTakenMedsCount(mockTaken);
      }

    } catch (error) {
      console.warn('Dashboard fetch warning:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWaterIncrement = async () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newGlasses = waterLogged + 1;
    setWaterLogged(newGlasses);

    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      await supabase.from('water_logs').insert({
        user_id: user.id,
        date: todayStr,
        amount_ml: 250, // 1 glass = 250ml
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isMenstruation = currentPhase === 'Menstruation';

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <ScrollView 
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View>
              <ThemedText type="labelMedium" style={{ color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {format(TODAY, 'EEEE, MMM d')}
              </ThemedText>
              <View style={styles.welcomeRow}>
                <ThemedText type="titleLarge" style={{ fontSize: 30, color: theme.text, fontWeight: '800' }}>
                  Hello, {userName} {avatarEmoji}
                </ThemedText>
              </View>
            </View>
            
            <Pressable 
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Open AI Health Assistant"
              style={[styles.aiShortcut, { backgroundColor: theme.primaryContainer }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/ai');
              }}
            >
              <Ionicons name="sparkles" size={20} color={theme.primary} />
            </Pressable>
          </Animated.View>

          {/* Calendar Strip */}
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.calendarStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
              {CALENDAR_DAYS.map((date, index) => {
                const isSelected = index === 3;
                return (
                  <View 
                    key={date.toISOString()} 
                    style={[
                      styles.calendarDay, 
                      { backgroundColor: theme.backgroundElement },
                      isSelected && { backgroundColor: theme.primary }
                    ]}
                  >
                    <ThemedText type="labelSmall" style={{ color: isSelected ? theme.onPrimary : theme.textSecondary, marginBottom: 4 }}>
                      {format(date, 'EE').charAt(0)}
                    </ThemedText>
                    <ThemedText type="titleMedium" style={{ color: isSelected ? theme.onPrimary : theme.text, fontWeight: '700' }}>
                      {format(date, 'd')}
                    </ThemedText>
                    {isSelected && <View style={styles.calendarDot} />}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Hero Circular Cycle Visualizer */}
          <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.heroContainer}>
            <LinearGradient 
              colors={isMenstruation ? ['#FF88A5', '#B64B74'] : [theme.primary, theme.secondary]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.heroRingCard}
            >
              <Animated.View style={[styles.ringInner, pulseStyle]}>
                <View style={styles.ringContent}>
                  {isMenstruation ? (
                    <>
                      <ThemedText type="labelMedium" style={styles.ringLabel}>MENSTRUATION PHASE</ThemedText>
                      <ThemedText type="displayLarge" style={styles.ringDayNumber}>Day {cycleDay}</ThemedText>
                      <ThemedText type="bodyMedium" style={styles.ringPeriodText}>Flow is active</ThemedText>
                    </>
                  ) : (
                    <>
                      <ThemedText type="labelMedium" style={styles.ringLabel}>{currentPhase.toUpperCase()} PHASE</ThemedText>
                      <ThemedText type="displayLarge" style={styles.ringNumber}>{daysUntilPeriod}</ThemedText>
                      <ThemedText type="bodyMedium" style={styles.ringPeriodText}>Days until period</ThemedText>
                    </>
                  )}
                </View>
                <View style={styles.ringSubBadge}>
                  <ThemedText type="labelSmall" style={{ color: '#fff', fontWeight: '700' }}>
                    Cycle Day {cycleDay}
                  </ThemedText>
                </View>
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Insights Row */}
          <Animated.View entering={FadeInDown.duration(600).delay(300).springify()} style={styles.vitalsRow}>
            <Card variant="elevated" style={[styles.vitalCard, { flex: 1, borderColor: theme.outlineVariant }]}>
              <View style={[styles.vitalIconWrap, { backgroundColor: theme.errorContainer }]}>
                <Ionicons name="flower-outline" size={20} color={theme.error} />
              </View>
              <ThemedText type="titleMedium" style={{ color: theme.text, marginTop: Spacing.two, fontWeight: '700' }}>
                {fertilityStatus}
              </ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>
                Fertility Window
              </ThemedText>
            </Card>

            <Card variant="elevated" style={[styles.vitalCard, { flex: 1, borderColor: theme.outlineVariant }]}>
              <View style={[styles.vitalIconWrap, { backgroundColor: theme.tertiaryContainer }]}>
                <Ionicons name="radio-button-on-outline" size={20} color={theme.tertiary} />
              </View>
              <ThemedText type="titleMedium" style={{ color: theme.text, marginTop: Spacing.two, fontWeight: '700' }}>
                {ovulationText}
              </ThemedText>
              <ThemedText type="labelSmall" style={{ color: theme.textSecondary }}>
                Predicted Ovulation
              </ThemedText>
            </Card>
          </Animated.View>

          {/* Hydration Tracker */}
          <Animated.View entering={FadeInDown.duration(600).delay(350).springify()} style={styles.sectionContainer}>
            <Card variant="elevated" style={styles.trackerCard}>
              <View style={styles.trackerRow}>
                <View style={styles.trackerIconBox}>
                  <Ionicons name="water" size={32} color="#4FC3F7" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="titleMedium" style={{ fontWeight: '700', color: theme.text }}>Hydration Track</ThemedText>
                  <ThemedText type="labelMedium" style={{ color: theme.textSecondary }}>
                    Logged {waterLogged}/{waterGoal} glasses today
                  </ThemedText>
                </View>
                <Pressable style={[styles.addButton, { backgroundColor: theme.primaryContainer }]} onPress={handleWaterIncrement}>
                  <Ionicons name="add" size={24} color={theme.primary} />
                </Pressable>
              </View>
            </Card>
          </Animated.View>

          {/* Medication Module */}
          {totalMedsCount > 0 && (
            <Animated.View entering={FadeInDown.duration(600).delay(400).springify()} style={styles.sectionContainer}>
              <Pressable onPress={() => router.push('/medicine')}>
                <Card variant="filled" style={[styles.medicationCard, { backgroundColor: theme.primaryContainer }]}>
                  <Ionicons name="medical" size={24} color={theme.primary} style={{ marginRight: Spacing.three }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="titleMedium" style={{ color: theme.primary, fontWeight: '700' }}>Active Medications</ThemedText>
                    <ThemedText type="labelMedium" style={{ color: theme.primary, opacity: 0.8 }}>
                      {takenMedsCount}/{totalMedsCount} taken today
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                </Card>
              </Pressable>
            </Animated.View>
          )}

          {/* Daily Quote / Tip */}
          <Animated.View entering={FadeInDown.duration(600).delay(450).springify()} style={styles.tipContainer}>
            <GlassView intensity="low" borderRadius={24} style={[styles.tipCard, { borderColor: theme.outlineVariant }]}>
              <Ionicons name="sparkles" size={22} color={theme.primary} style={{ marginRight: Spacing.three }} />
              <View style={{ flex: 1 }}>
                <ThemedText type="titleSmall" style={{ color: theme.text, fontWeight: '700' }}>Daily Insight</ThemedText>
                <ThemedText type="bodyMedium" style={{ color: theme.textSecondary, marginTop: 4, fontStyle: 'italic', lineHeight: 18 }}>
                  "{quote}"
                </ThemedText>
              </View>
            </GlassView>
          </Animated.View>

        </SafeAreaView>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View 
        entering={FadeIn.duration(600).delay(500)} 
        style={[styles.fabContainer]}
      >
        <Pressable 
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/log')}
        >
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 130, // Extra space to prevent tab bar overlapping
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  aiShortcut: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  calendarStrip: {
    marginBottom: Spacing.five,
  },
  calendarScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  calendarDay: {
    width: 48,
    height: 64,
    borderRadius: 24,
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
    marginBottom: Spacing.five,
    alignItems: 'center',
  },
  heroRingCard: {
    width: width - (Spacing.four * 2),
    aspectRatio: 1.25,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B64B74',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
  },
  ringInner: {
    width: '80%',
    height: '80%',
    borderRadius: 200,
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringContent: {
    alignItems: 'center',
  },
  ringLabel: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '800',
    opacity: 0.9,
  },
  ringNumber: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 76,
  },
  ringDayNumber: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  ringPeriodText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    fontWeight: '600',
  },
  ringSubBadge: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  vitalsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    marginBottom: Spacing.five,
  },
  vitalCard: {
    padding: Spacing.four,
    borderRadius: 24,
  },
  vitalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  trackerCard: {
    borderRadius: 24,
    padding: Spacing.four,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 24,
  },
  tipContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderWidth: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Platform.OS === 'ios' ? 108 : 96, // Floats perfectly above tab bar
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B64B74',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
});
